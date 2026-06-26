using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Agent;

/// <summary>
/// Drives the multi-turn Claude API tool execution loop.
/// On each turn: builds the messages array, sends a streaming request to the Anthropic
/// Messages API, yields text deltas in real time, executes any tool calls returned by Claude,
/// emits typed SSE chunks for structured results, and loops until Claude returns a final
/// text-only response or <c>Anthropic:MaxToolIterations</c> is reached.
/// </summary>
public sealed class AgentOrchestrator : IAgentOrchestrator
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IChatSessionService _sessionService;
    private readonly IProductSearchService _productSearch;
    private readonly IFamilyBrowseService _familyBrowse;
    private readonly IFurnitureSearchService _furnitureSearch;
    private readonly IProjectRecommendationService _projectRecommendation;
    private readonly IBillOfMaterialsService _bom;
    private readonly IEmbeddingService _embedding;
    private readonly IVectorSearchService _vectorSearch;
    private readonly SystemPromptBuilder _promptBuilder;
    private readonly AreaMarkingService _areaMarking;
    private readonly ILogger<AgentOrchestrator> _logger;

    private readonly string _apiKey;
    private readonly string _model;
    private readonly int _maxTokens;
    private readonly int _maxToolIterations;
    private readonly bool _areaMarkingEnabled;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    // Built once at startup — schemas never change at runtime, cloning per-request is enough
    private static readonly JsonObject[] _toolDefinitions = AgentTools.GetDefinitions();

    private static readonly System.Text.RegularExpressions.Regex _suggestedActionsRegex = new(
        @"<suggested_actions>\s*(\[[\s\S]*?\])\s*</suggested_actions>",
        System.Text.RegularExpressions.RegexOptions.Compiled);

    private static readonly System.Text.RegularExpressions.Regex _placementMapRegex = new(
        @"<placement_map>\s*(\[[\s\S]*?\])\s*</placement_map>",
        System.Text.RegularExpressions.RegexOptions.Compiled);

    // BEGA catalog numbers are 5-6 digit tokens — used to verify the model's prose actually
    // cites real returned products rather than plausible-sounding invented ones (see the
    // grounding safety net in RunAsync). Narrow enough to not match prices/lumens/voltages,
    // which are either shorter or split by commas/decimals in the response text.
    private static readonly System.Text.RegularExpressions.Regex _catalogNumberRegex = new(
        @"\b\d{5,6}\b",
        System.Text.RegularExpressions.RegexOptions.Compiled);

    public AgentOrchestrator(
        IHttpClientFactory httpFactory,
        IChatSessionService sessionService,
        IProductSearchService productSearch,
        IFamilyBrowseService familyBrowse,
        IFurnitureSearchService furnitureSearch,
        IProjectRecommendationService projectRecommendation,
        IBillOfMaterialsService bom,
        IEmbeddingService embedding,
        IVectorSearchService vectorSearch,
        SystemPromptBuilder promptBuilder,
        AreaMarkingService areaMarking,
        IConfiguration config,
        ILogger<AgentOrchestrator> logger)
    {
        _httpFactory = httpFactory;
        _sessionService = sessionService;
        _productSearch = productSearch;
        _familyBrowse = familyBrowse;
        _furnitureSearch = furnitureSearch;
        _projectRecommendation = projectRecommendation;
        _bom = bom;
        _embedding = embedding;
        _vectorSearch = vectorSearch;
        _promptBuilder = promptBuilder;
        _areaMarking = areaMarking;
        _logger = logger;

        _apiKey = config["Anthropic:ApiKey"]
            ?? throw new InvalidOperationException("Anthropic:ApiKey is required.");
        _model = ResolveModel(config["Anthropic:Model"] ?? "sonnet");
        _maxTokens = config.GetValue<int>("Anthropic:MaxTokens", 2048);
        _maxToolIterations = config.GetValue<int>("Anthropic:MaxToolIterations", 5);
        _areaMarkingEnabled = config.GetValue<bool>("AreaMarking:Enabled", true);
    }

    /// <inheritdoc/>
    public async IAsyncEnumerable<AgentStreamChunk> StreamResponseAsync(
        string sessionId,
        string userMessage,
        string? imageBase64 = null,
        string? imageMimeType = null,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        Exception? caught = null;

        await using var enumerator = RunAsync(sessionId, userMessage, imageBase64, imageMimeType, ct).GetAsyncEnumerator(ct);

        while (true)
        {
            AgentStreamChunk? current = null;
            try
            {
                if (!await enumerator.MoveNextAsync()) break;
                current = enumerator.Current;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                caught = ex;
                break;
            }

            if (current is not null) yield return current;
        }

        if (caught is not null)
        {
            _logger.LogError(caught, "AgentOrchestrator error for session {SessionId}", sessionId);
            yield return new AgentStreamChunk { Type = AgentStreamEventType.Error, ErrorMessage = caught.Message };
        }

        yield return new AgentStreamChunk { Type = AgentStreamEventType.Done };
    }

    // ── Main loop ─────────────────────────────────────────────────────────────

    private async IAsyncEnumerable<AgentStreamChunk> RunAsync(
        string sessionId,
        string userMessage,
        string? imageBase64,
        string? imageMimeType,
        [EnumeratorCancellation] CancellationToken ct)
    {
        // Keep only the 4 most recent history turns to limit context size
        var history = await _sessionService.GetHistoryAsync(sessionId, lastN: 4, ct);

        var apiMessages = new List<JsonObject>();
        foreach (var msg in history)
            apiMessages.Add(TextMessage(msg.Role, msg.Content));

        // When an image is present, derive a Florence-2-friendly area label from the user's
        // message (no extra model call — deterministic keyword lookup) and ask the local
        // Florence-2 + SAM2 sidecar to outline the matching region. The outline's bounding box
        // is computed locally from pixel data (see AreaMarkingService) and passed to Claude as
        // exact numeric coordinates — far more reliable than asking a vision model to eyeball
        // where a polygon outline falls.
        string? markedAreaBase64 = null;
        AreaBoundingBox? areaBoundingBox = null;
        if (imageBase64 is not null && _areaMarkingEnabled)
        {
            var areaQuery = AreaQueryExtractor.Extract(userMessage);
            if (areaQuery is not null)
            {
                var markResult = await _areaMarking.GetMarkedAreaAsync(imageBase64, areaQuery, ct);
                markedAreaBase64 = markResult?.ImageBase64;
                areaBoundingBox = markResult?.BoundingBox;
                if (markedAreaBase64 is not null)
                    _logger.LogDebug("Area marking acquired for query '{Query}' ({Chars} base64 chars, bbox={HasBox}) — sending two-image vision request", areaQuery, markedAreaBase64.Length, areaBoundingBox is not null);
                else
                    _logger.LogDebug("Area marking unavailable for query '{Query}' — sending single-image vision request", areaQuery);
            }
            else
            {
                _logger.LogDebug("No area label derived from user message — sending single-image vision request");
            }
        }
        else if (imageBase64 is not null)
        {
            _logger.LogDebug("Area marking disabled — sending single-image vision request");
        }

        // When an image is present, build a content-block array message (vision turn).
        // When a marked-area image is also available, include it as a second labeled image block,
        // plus an explicit numeric bounding box block when the outline could be detected.
        // Otherwise fall back to a plain text string (standard turn, no extra tokens).
        apiMessages.Add(BuildUserMessage(userMessage, imageBase64, imageMimeType, markedAreaBase64, areaBoundingBox));

        var systemPrompt = _promptBuilder.Build(_areaMarkingEnabled);
        var tools = _toolDefinitions;

        string finalAssistantText = string.Empty;

        // Track dispatched tool calls to skip exact duplicates (same name + input hash)
        var dispatchedToolKeys = new HashSet<string>();

        // Only the LAST iteration's structured results (Products/Furniture/etc.) are ever shown
        // to the user. Earlier iterations are typically self-corrections — Claude realizing its
        // first search used the wrong filters/group and redoing it — so surfacing their stale
        // results alongside the corrected ones would be actively misleading (the bad first
        // attempt's cards would fill the frontend's display cap before the real results ever
        // arrived). Replaced wholesale at the start of every iteration, never accumulated.
        var latestStructuredChunks = new List<AgentStreamChunk>();
        var reachedCleanFinalTurn = false;
        var hadFatalError = false;

        for (int iteration = 0; iteration < _maxToolIterations; iteration++)
        {
            var accText = new StringBuilder();
            var toolCalls = new List<CollectedToolCall>();
            string? stopReason = null;
            var hadError = false;

            // Text deltas are buffered, never streamed live, here. An iteration's text can only
            // be judged safe to show once we know whether it was followed by tool_use blocks in
            // the SAME message — if so, that text is internal planning narration ("Let me refine
            // the search...") that must never reach the user; only the text from the iteration
            // that ends with zero tool calls is the genuine final answer.
            await foreach (var (eventChunk, toolCall, reason) in
                StreamTurnAsync(apiMessages, systemPrompt, tools, ct))
            {
                if (eventChunk?.Type == AgentStreamEventType.Error)
                {
                    yield return eventChunk;
                    hadError = true;
                }
                else if (eventChunk?.Type == AgentStreamEventType.TextDelta && eventChunk.Content is not null)
                {
                    accText.Append(eventChunk.Content);
                }

                if (toolCall is not null) toolCalls.Add(toolCall);
                if (reason is not null) stopReason = reason;
            }

            var assistantText = accText.ToString();
            finalAssistantText = assistantText;

            if (hadError) { hadFatalError = true; break; }

            if (toolCalls.Count == 0 || stopReason is "max_tokens" or "stop_sequence")
            {
                reachedCleanFinalTurn = true;
                break;
            }

            latestStructuredChunks = new List<AgentStreamChunk>();

            // Build assistant message containing text + tool use blocks
            var assistantContent = new JsonArray();
            if (!string.IsNullOrEmpty(assistantText))
                assistantContent.Add(new JsonObject { ["type"] = "text", ["text"] = assistantText });

            foreach (var tc in toolCalls)
                assistantContent.Add(new JsonObject
                {
                    ["type"] = "tool_use",
                    ["id"] = tc.Id,
                    ["name"] = tc.Name,
                    ["input"] = tc.Input.DeepClone()
                });

            apiMessages.Add(new JsonObject { ["role"] = "assistant", ["content"] = assistantContent });

            // Dispatch tool calls in parallel — deduplication check happens before Task.WhenAll
            var toolResultsArray = new JsonArray();
            var dispatchTasks = toolCalls
                .Select(tc =>
                {
                    var key = $"{tc.Name}::{tc.Input.ToJsonString()}";
                    return dispatchedToolKeys.Add(key)
                        ? DispatchToolAsync(tc, ct)
                        : Task.FromResult(("{\"note\":\"duplicate call skipped\"}", (AgentStreamChunk?)null));
                })
                .ToArray();

            var dispatchResults = await Task.WhenAll(dispatchTasks);

            // Build the tool-result array; structured SSE chunks are collected (not yielded yet)
            // so only the winning iteration's results ever reach the frontend — see comment above.
            var seenThisRound = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < toolCalls.Count; i++)
            {
                var (resultJson, sseChunk) = dispatchResults[i];
                if (sseChunk is not null)
                {
                    // Cross-call distinctness within this round — if a second fixture group's
                    // call returns a catalog number already returned by another call in the same
                    // round, drop it rather than showing the same product twice.
                    var deduped = DedupeAgainstSeen(sseChunk, seenThisRound);
                    if (deduped is not null) latestStructuredChunks.Add(deduped);
                }
                toolResultsArray.Add(new JsonObject
                {
                    ["type"] = "tool_result",
                    ["tool_use_id"] = toolCalls[i].Id,
                    ["content"] = resultJson
                });
            }

            apiMessages.Add(new JsonObject { ["role"] = "user", ["content"] = toolResultsArray });
        }

        // MaxToolIterations was exhausted while Claude was still mid tool-call chain (e.g.
        // repeated self-correction across searches/group lookups) — it never reached a turn
        // with zero tool calls, so finalAssistantText is just that last iteration's internal
        // planning narration ("Let me browse the Wall family directly...") and was never meant
        // to be shown as-is. Replace it with a grounded summary of whatever real results were
        // gathered, or a plain apology if the chain produced nothing usable at all.
        if (!hadFatalError && !reachedCleanFinalTurn)
        {
            _logger.LogWarning(
                "MaxToolIterations ({Max}) exhausted without a clean final turn for session {SessionId} — discarding dangling narration text",
                _maxToolIterations, sessionId);
            finalAssistantText = latestStructuredChunks.Count > 0
                ? BuildGroundedFallbackText(latestStructuredChunks)
                : "I wasn't able to narrow down the best match in time — could you rephrase or name the specific area again (e.g. \"stair tread\" or \"pillar\")?";
        }

        // The set of catalog numbers actually being displayed (from the winning iteration only)
        // — used below to validate placement_map markers against what the user can actually see.
        var returnedCatalogNumbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var chunk in latestStructuredChunks)
        {
            if (chunk.Products is not null)
                foreach (var p in chunk.Products) returnedCatalogNumbers.Add(p.CatalogNumber);
            if (chunk.FurnitureItems is not null)
                foreach (var f in chunk.FurnitureItems) returnedCatalogNumbers.Add(f.CatalogNumber);
        }

        // Parse <suggested_actions> out of the final response text before it's ever shown to the
        // user or saved to history — the raw tag must never reach the frontend as text (it's
        // rendered separately as pills), and keeping it in session history would add ~50-100
        // tokens of XML noise to every future turn.
        var textToSave = finalAssistantText;
        List<string>? parsedActions = null;
        var saMatch = _suggestedActionsRegex.Match(finalAssistantText);
        if (saMatch.Success)
        {
            textToSave = finalAssistantText.Replace(saMatch.Value, string.Empty).Trim();
            try { parsedActions = JsonSerializer.Deserialize<List<string>>(saMatch.Groups[1].Value, _jsonOptions); }
            catch { /* malformed JSON inside tag — tag still stripped from history */ }
        }

        // Parse and strip <placement_map> (vision placement annotations)
        List<PlacementMapItem>? parsedPlacementMap = null;
        var pmMatch = _placementMapRegex.Match(textToSave);
        if (pmMatch.Success)
        {
            textToSave = textToSave.Replace(pmMatch.Value, string.Empty).Trim();
            try { parsedPlacementMap = JsonSerializer.Deserialize<List<PlacementMapItem>>(pmMatch.Groups[1].Value, _jsonOptions); }
            catch { /* malformed JSON — tag stripped from history */ }
        }

        // Grounding safety net for the prose itself — the same principle as the placement_map
        // guard below, applied to the visible recommendation text. Despite explicit prompt
        // rules, the model can cite plausible-sounding catalog numbers that don't match the
        // actual search results (inventing "ideal" near-miss numbers instead of accepting what
        // the real catalog returned). Zero tolerance: even ONE ungrounded citation makes the
        // whole response untrustworthy (a user reading it can't tell which lines are real), so
        // any mismatch — not just a total failure — replaces the prose with a deterministic
        // summary built directly from the real results instead.
        if (returnedCatalogNumbers.Count > 0)
        {
            var citedCatalogNumbers = _catalogNumberRegex.Matches(textToSave)
                .Select(m => m.Value)
                .Distinct()
                .ToList();
            var groundedCitations = citedCatalogNumbers.Count(n => returnedCatalogNumbers.Contains(n));

            if (citedCatalogNumbers.Count > 0 && groundedCitations < citedCatalogNumbers.Count)
            {
                _logger.LogWarning(
                    "Discarding partially/fully ungrounded recommendation text — cited [{Cited}] but actual results this turn were [{Returned}]",
                    string.Join(",", citedCatalogNumbers), string.Join(",", returnedCatalogNumbers));
                textToSave = BuildGroundedFallbackText(latestStructuredChunks);
            }
        }

        // Server-side guarantee — prompt instructions alone aren't reliable enough: drop any
        // marker whose catalog number wasn't actually returned this turn (hallucination guard),
        // collapse duplicate catalog numbers to their first occurrence (the model has repeatedly
        // emitted the same catalog number for multiple marker ids, which the product-card list
        // then renders as fewer cards than markers), cap at the same 6-product max enforced for
        // search results, and re-sequence ids 1..N.
        if (parsedPlacementMap is { Count: > 0 })
        {
            const int maxMarkers = 6;
            var seenCatalogNumbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var filtered = new List<PlacementMapItem>();
            foreach (var item in parsedPlacementMap)
            {
                if (returnedCatalogNumbers.Count > 0 && !returnedCatalogNumbers.Contains(item.CatalogNumber))
                    continue;
                if (!seenCatalogNumbers.Add(item.CatalogNumber))
                    continue;
                filtered.Add(item);
                if (filtered.Count == maxMarkers) break;
            }
            parsedPlacementMap = filtered
                .Select((item, idx) => item with { Id = idx + 1 })
                .ToList();
        }

        // yield must be outside try/catch (CS1626)
        foreach (var chunk in latestStructuredChunks)
            yield return chunk;

        // Text is sent as a single chunk rather than replayed token-by-token: it was buffered
        // for the entire winning iteration (see comment above the loop) precisely so the
        // <suggested_actions>/<placement_map> tags could be stripped before anything reaches the
        // user — replaying the raw per-token deltas here would re-leak those tags as literal text.
        if (!string.IsNullOrEmpty(textToSave))
            yield return new AgentStreamChunk { Type = AgentStreamEventType.TextDelta, Content = textToSave };

        if (parsedActions?.Count > 0)
            yield return new AgentStreamChunk { Type = AgentStreamEventType.SuggestedActions, SuggestedActions = parsedActions };

        if (parsedPlacementMap?.Count > 0)
            yield return new AgentStreamChunk { Type = AgentStreamEventType.PlacementMap, PlacementMap = parsedPlacementMap };

        // Persist the user message and stripped assistant response to the session.
        // Base64 image data is never stored in history — only a short marker is kept so
        // Claude's context window isn't inflated on subsequent turns.
        var session = await _sessionService.GetOrCreateAsync(sessionId, ct);
        var existingMessages = JsonSerializer.Deserialize<List<ChatMessage>>(session.MessagesJson, _jsonOptions) ?? [];
        var userHistoryContent = imageBase64 is not null
            ? $"[Image: {imageMimeType}] {userMessage}"
            : userMessage;
        existingMessages.Add(new ChatMessage { Role = "user", Content = userHistoryContent });
        if (!string.IsNullOrEmpty(textToSave))
            existingMessages.Add(new ChatMessage { Role = "assistant", Content = textToSave });
        session.MessagesJson = JsonSerializer.Serialize(existingMessages, _jsonOptions);
        session.LastActivityAt = DateTime.UtcNow;
        await _sessionService.SaveAsync(session, ct);
    }

    // ── Streaming one Claude turn ──────────────────────────────────────────────

    private async IAsyncEnumerable<(AgentStreamChunk? Chunk, CollectedToolCall? ToolCall, string? StopReason)>
        StreamTurnAsync(
            List<JsonObject> apiMessages,
            string systemPrompt,
            JsonObject[] tools,
            [EnumeratorCancellation] CancellationToken ct)
    {
        // System prompt as content-block array so the cache_control breakpoint can be set.
        // Everything up to and including this block is eligible for caching on subsequent calls.
        var systemArray = new JsonArray
        {
            new JsonObject
            {
                ["type"] = "text",
                ["text"] = systemPrompt,
                ["cache_control"] = new JsonObject { ["type"] = "ephemeral" }
            }
        };

        // Clone all tool definitions; add cache_control only to the LAST one.
        // The cache covers the system block + all tools together as one prefix.
        var toolNodes = tools
            .Select((t, i) =>
            {
                var clone = (JsonObject)t.DeepClone();
                if (i == tools.Length - 1)
                    clone["cache_control"] = new JsonObject { ["type"] = "ephemeral" };
                return (JsonNode)clone;
            })
            .ToArray();

        var requestBody = new JsonObject
        {
            ["model"] = _model,
            ["max_tokens"] = _maxTokens,
            ["temperature"] = 0,
            ["system"] = systemArray,
            ["stream"] = true,
            ["tools"] = new JsonArray(toolNodes),
            ["messages"] = new JsonArray(apiMessages.Select(m => (JsonNode)m.DeepClone()).ToArray())
        };

        using var client = _httpFactory.CreateClient("Anthropic");
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        request.Headers.Add("x-api-key", _apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        request.Headers.Add("anthropic-beta", "prompt-caching-2024-07-31");
        request.Content = new StringContent(requestBody.ToJsonString(), Encoding.UTF8, "application/json");

        HttpResponseMessage? response = null;
        string? httpError = null;
        try
        {
            response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude API request failed");
            httpError = ex.Message;
        }

        if (httpError is not null)
        {
            yield return (new AgentStreamChunk { Type = AgentStreamEventType.Error, ErrorMessage = httpError }, null, null);
            yield break;
        }

        // Track content blocks by index
        var textBlocks = new Dictionary<int, StringBuilder>();
        var toolBlocks = new Dictionary<int, (string Id, string Name, StringBuilder JsonBuffer)>();
        string? stopReason = null;

        using var stream = await response!.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line is null || !line.StartsWith("data: ", StringComparison.Ordinal)) continue;

            var json = line["data: ".Length..].Trim();
            if (json.Length == 0) continue;

            JsonNode? node;
            try { node = JsonNode.Parse(json); }
            catch { continue; }

            if (node is not JsonObject obj) continue;

            var type = obj["type"]?.GetValue<string>();

            switch (type)
            {
                case "content_block_start":
                    {
                        var index = obj["index"]?.GetValue<int>() ?? 0;
                        var block = obj["content_block"] as JsonObject;
                        var blockType = block?["type"]?.GetValue<string>();

                        if (blockType == "text")
                            textBlocks[index] = new StringBuilder();
                        else if (blockType == "tool_use")
                        {
                            var id = block!["id"]?.GetValue<string>() ?? string.Empty;
                            var name = block["name"]?.GetValue<string>() ?? string.Empty;
                            toolBlocks[index] = (id, name, new StringBuilder());
                        }
                        break;
                    }

                case "content_block_delta":
                    {
                        var index = obj["index"]?.GetValue<int>() ?? 0;
                        var delta = obj["delta"] as JsonObject;
                        var deltaType = delta?["type"]?.GetValue<string>();

                        if (deltaType == "text_delta" && textBlocks.TryGetValue(index, out var textSb))
                        {
                            var text = delta!["text"]?.GetValue<string>() ?? string.Empty;
                            textSb.Append(text);
                            yield return (new AgentStreamChunk { Type = AgentStreamEventType.TextDelta, Content = text }, null, null);
                        }
                        else if (deltaType == "input_json_delta" && toolBlocks.TryGetValue(index, out var tb))
                        {
                            var partialJson = delta!["partial_json"]?.GetValue<string>() ?? string.Empty;
                            tb.JsonBuffer.Append(partialJson);
                        }
                        break;
                    }

                case "content_block_stop":
                    {
                        var index = obj["index"]?.GetValue<int>() ?? 0;

                        if (toolBlocks.TryGetValue(index, out var tb))
                        {
                            JsonObject? input = null;
                            try
                            {
                                input = JsonNode.Parse(tb.JsonBuffer.ToString()) as JsonObject ?? new JsonObject();
                            }
                            catch
                            {
                                input = new JsonObject();
                            }

                            yield return (null, new CollectedToolCall(tb.Id, tb.Name, input), null);
                            toolBlocks.Remove(index);
                        }
                        break;
                    }

                case "message_delta":
                    {
                        var delta = obj["delta"] as JsonObject;
                        stopReason = delta?["stop_reason"]?.GetValue<string>();
                        break;
                    }

                case "message_stop":
                    yield return (null, null, stopReason ?? "end_turn");
                    yield break;

                case "error":
                    var errMsg = obj["error"]?["message"]?.GetValue<string>() ?? "Unknown Claude API error";
                    _logger.LogError("Claude API returned error: {Error}", errMsg);
                    yield return (new AgentStreamChunk { Type = AgentStreamEventType.Error, ErrorMessage = errMsg }, null, null);
                    yield break;
            }
        }

        // Fallback if stream ended without message_stop
        yield return (null, null, stopReason ?? "end_turn");
    }

    // ── Tool dispatch ─────────────────────────────────────────────────────────

    private async Task<(string ResultJson, AgentStreamChunk? SseChunk)> DispatchToolAsync(
        CollectedToolCall tc,
        CancellationToken ct)
    {
        _logger.LogDebug("Dispatching tool '{Name}' (id={Id})", tc.Name, tc.Id);

        try
        {
            return tc.Name switch
            {
                "search_products" => await SearchProductsAsync(tc.Input, ct),
                "get_product_detail" => await GetProductDetailAsync(tc.Input, ct),
                "browse_by_hierarchy" => await BrowseByHierarchyAsync(tc.Input, ct),
                "filter_by_specs" => await FilterBySpecsAsync(tc.Input, ct),
                "get_spec_document_context" => await GetSpecDocumentContextAsync(tc.Input, ct),
                "recommend_for_project" => await RecommendForProjectAsync(tc.Input, ct),
                "generate_bill_of_materials" => await GenerateBomAsync(tc.Input, ct),
                "search_furniture" => await SearchFurnitureAsync(tc.Input, ct),
                _ => ($"{{\"error\": \"Unknown tool: {tc.Name}\"}}", null)
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tool '{Name}' execution failed", tc.Name);
            return ($"{{\"error\": \"{ex.Message.Replace("\"", "\\\"")}\"}}", null);
        }
    }

    private async Task<(string, AgentStreamChunk?)> SearchProductsAsync(JsonObject input, CancellationToken ct)
    {
        var query = input["query"]?.GetValue<string>() ?? string.Empty;

        // Extract expanded_queries generated by Claude's search expansion layer
        var expandedQueries = input["expanded_queries"]?.AsArray()
            .Select(n => n?.GetValue<string>() ?? string.Empty)
            .Where(s => s.Length > 0 && s != query)
            .Take(4)
            .ToList() ?? (List<string>)[];

        var filters = new ProductSearchFilters
        {
            Category = input["category"]?.GetValue<string>(),
            Group = input["group"]?.GetValue<string>(),
            FamilyName = input["family_name"]?.GetValue<string>(),
            MinWattageW = TryGetDecimal(input["min_wattage_w"]),
            MaxWattageW = TryGetDecimal(input["max_wattage_w"]),
            MinLumenOutput = TryGetDecimal(input["min_lumen_output"]),
            MaxLumenOutput = TryGetDecimal(input["max_lumen_output"]),
            MinBeamAngleDeg = TryGetDecimal(input["min_beam_angle_deg"]),
            MaxBeamAngleDeg = TryGetDecimal(input["max_beam_angle_deg"]),
            ColorTemperatureK = input["color_temperature_k"]?.GetValue<int?>(),
            Voltage = input["voltage"]?.GetValue<string>(),
            ControlProtocol = input["control_protocol"]?.GetValue<string>(),
            Application = input["application"]?.GetValue<string>(),
            Distribution = input["distribution"]?.GetValue<string>(),
            DynamicLight = input["dynamic_light"]?.GetValue<string>(),
            Compliance = input["compliance"]?.GetValue<string>(),
            AdaCompliant = input["ada_compliant"]?.GetValue<bool?>(),
            ExpressDelivery = input["express_delivery"]?.GetValue<bool?>(),
            MinDnpPrice = TryGetDecimal(input["min_dnp_price"]),
            MaxDnpPrice = TryGetDecimal(input["max_dnp_price"]),
            ExcludedCatalogNumbers = input["exclude_catalog_numbers"]?.AsArray()
                .Select(n => n?.GetValue<string>() ?? string.Empty)
                .Where(s => s.Length > 0)
                .ToArray(),
            // Cap at 6. Single-area vision queries use top_k=6 (1 call × 6 = 6 products).
            // Multi-area vision queries use top_k=3 (2 calls × 3 = 6 products total).
            // Text-only queries always pass top_k=3. Cap prevents runaway results.
            TopK = Math.Min(input["top_k"]?.GetValue<int>() ?? 3, 6)
        };

        var results = await _productSearch.SearchByNaturalLanguageAsync(query, expandedQueries, filters, ct);

        // Zero-trust post-filter: enforce CCT and control_protocol in memory as a safety net
        // in case the SQL filter missed a row (e.g. partial JSON match on ColorTemperatureJson).
        if (filters.ColorTemperatureK.HasValue)
            results = results
                .Where(r => r.ColorTemperatureJson?.Contains(filters.ColorTemperatureK.Value.ToString()) == true)
                .ToList();
        if (filters.ControlProtocol is not null)
            results = results
                .Where(r => r.ControlProtocol?.Contains(filters.ControlProtocol, StringComparison.OrdinalIgnoreCase) == true)
                .ToList();

        // Compact JSON for Claude's context — full data goes to the frontend via sseChunk
        var json = results.Count > 0 ? CompactProductsJson(results) : "{\"results\":[]}";
        var sseChunk = results.Count > 0
            ? new AgentStreamChunk { Type = AgentStreamEventType.Products, Products = results }
            : null;
        return (json, sseChunk);
    }

    private async Task<(string, AgentStreamChunk?)> GetProductDetailAsync(JsonObject input, CancellationToken ct)
    {
        var catalogNumber = input["catalog_number"]?.GetValue<string>() ?? string.Empty;
        var detail = await _productSearch.GetProductDetailAsync(catalogNumber, ct);
        AgentStreamChunk? sseChunk = null;
        string json;
        if (detail is not null)
        {
            json = CompactProductsJson([(ProductSearchResult)detail]);
            sseChunk = new AgentStreamChunk
            {
                Type = AgentStreamEventType.Products,
                Products = [(ProductSearchResult)detail]
            };
        }
        else
        {
            json = $"{{\"error\": \"Product '{catalogNumber}' not found in the catalog.\"}}";
        }

        return (json, sseChunk);
    }

    private async Task<(string, AgentStreamChunk?)> BrowseByHierarchyAsync(JsonObject input, CancellationToken ct)
    {
        var level = input["level"]?.GetValue<string>() ?? "categories";
        var category = input["category"]?.GetValue<string>();
        var group = input["group"]?.GetValue<string>();
        var familySlug = input["family_slug"]?.GetValue<string>();

        object result = level switch
        {
            "categories" => await _familyBrowse.GetCategoriesAsync(ct),
            "groups" => await _familyBrowse.GetGroupsAsync(category, ct),
            "families" => await _familyBrowse.GetFamiliesAsync(category, group, ct),
            "products" when familySlug is not null => await _familyBrowse.GetProductsByFamilyAsync(familySlug, ct),
            _ => new List<string>()
        };

        AgentStreamChunk? sseChunk = null;
        string resultJson;
        if (level == "products" && result is List<ProductSearchResult> productList && productList.Count > 0)
        {
            sseChunk = new AgentStreamChunk { Type = AgentStreamEventType.Products, Products = productList };
            resultJson = CompactProductsJson(productList);
        }
        else
        {
            resultJson = JsonSerializer.Serialize(result, _jsonOptions);
        }

        return (resultJson, sseChunk);
    }

    private async Task<(string, AgentStreamChunk?)> FilterBySpecsAsync(JsonObject input, CancellationToken ct)
    {
        var filtersArray = input["filters"]?.AsArray() ?? [];
        var filters = new List<SpecFilter>();

        foreach (var item in filtersArray)
        {
            if (item is not JsonObject f) continue;
            filters.Add(new SpecFilter
            {
                SpecKey = f["spec_key"]?.GetValue<string>() ?? string.Empty,
                Operator = f["operator"]?.GetValue<string>() ?? "eq",
                Value = TryGetDecimal(f["value"]) ?? 0m,
                ValueMax = TryGetDecimal(f["value_max"])
            });
        }

        var results = await _productSearch.FilterBySpecsAsync(filters, ct);
        var json = results.Count > 0 ? CompactProductsJson(results) : "{\"results\":[]}";
        var sseChunk = results.Count > 0
            ? new AgentStreamChunk { Type = AgentStreamEventType.Products, Products = results }
            : null;
        return (json, sseChunk);
    }

    private async Task<(string, AgentStreamChunk?)> GetSpecDocumentContextAsync(JsonObject input, CancellationToken ct)
    {
        var productId = input["product_id"]?.GetValue<int>() ?? 0;
        var question = input["question"]?.GetValue<string>() ?? string.Empty;

        var queryVector = await _embedding.EmbedAsync(question, ct);
        var vectorResults = await _vectorSearch.SearchAsync(
            queryVector, topK: 5, filterProductIds: [productId], ct);

        var contextText = string.Join("\n\n---\n\n", vectorResults.Select(r =>
            $"[Source: {r.ChunkSource}]\n{r.ChunkText}"));

        if (string.IsNullOrWhiteSpace(contextText))
            contextText = $"No spec document context found for product ID {productId}.";

        return (JsonSerializer.Serialize(new { context = contextText }, _jsonOptions), null);
    }

    private async Task<(string, AgentStreamChunk?)> RecommendForProjectAsync(JsonObject input, CancellationToken ct)
    {
        var projectType = input["project_type"]?.GetValue<string>() ?? string.Empty;
        var areas = input["areas"]?.AsArray()
            .Select(a => a?.GetValue<string>() ?? string.Empty)
            .Where(s => s.Length > 0)
            .ToList();
        var budgetUsd = TryGetDecimal(input["budget_usd"]);
        var styleKeywords = input["style_keywords"]?.AsArray()
            .Select(k => k?.GetValue<string>() ?? string.Empty)
            .Where(s => s.Length > 0)
            .ToList();
        var category = input["category"]?.GetValue<string>();

        var recommendations = await _projectRecommendation.RecommendAsync(
            projectType, areas, budgetUsd, styleKeywords, category, ct);

        // Compact summary for Claude's context — full product data goes to frontend via SSE
        var json = CompactProjectRecommendationsJson(recommendations);
        var sseChunk = recommendations.Count > 0
            ? new AgentStreamChunk { Type = AgentStreamEventType.ProjectRecommendation, ProjectAreas = recommendations }
            : null;
        return (json, sseChunk);
    }

    /// <summary>
    /// Strips image URLs, dimensions, raw JSON blobs, and all fields Claude doesn't
    /// need for reasoning. Typically 85-90% fewer tokens than full serialization.
    /// The complete product data is still sent to the frontend via the SSE chunk.
    /// </summary>
    private static string CompactProjectRecommendationsJson(List<ProjectAreaRecommendation> recommendations)
    {
        var compact = recommendations.Select(r => new
        {
            r.AreaName,
            r.Rationale,
            r.EstimatedTotalDnp,
            products = r.RecommendedProducts.Select(p => new
            {
                p.CatalogNumber,
                p.FamilyName,
                p.GroupsName,
                p.LuminaireType,
                p.LedWattage,
                p.LumenOutputLm,
                p.Voltage,
                p.ControlProtocol,
                p.DnpPrice,
                p.IsAdaCompliant
            })
        });
        return JsonSerializer.Serialize(compact, _jsonOptions);
    }

    private async Task<(string, AgentStreamChunk?)> GenerateBomAsync(JsonObject input, CancellationToken ct)
    {
        var itemsArray = input["items"]?.AsArray() ?? [];
        var items = new List<BomLineRequest>();

        foreach (var item in itemsArray)
        {
            if (item is not JsonObject i) continue;
            var catalogNumber = i["catalog_number"]?.GetValue<string>() ?? string.Empty;
            var quantity = i["quantity"]?.GetValue<int>() ?? 1;
            var areaLabel = i["area_label"]?.GetValue<string>();
            if (!string.IsNullOrWhiteSpace(catalogNumber))
                items.Add(new BomLineRequest(catalogNumber, quantity, areaLabel));
        }

        var projectName = input["project_name"]?.GetValue<string>();
        var report = await _bom.GenerateAsync(items, projectName, ct);
        // Full report goes to the frontend via SSE; Claude only needs totals and missing items
        var claudeContext = new
        {
            report.SubtotalDnp,
            report.SubtotalMsrp,
            report.Currency,
            report.ItemCount,
            report.NotFoundItems
        };
        var json = JsonSerializer.Serialize(claudeContext, _jsonOptions);
        var sseChunk = new AgentStreamChunk { Type = AgentStreamEventType.Bom, BomReport = report };
        return (json, sseChunk);
    }

    private async Task<(string, AgentStreamChunk?)> SearchFurnitureAsync(JsonObject input, CancellationToken ct)
    {
        var query = input["query"]?.GetValue<string>() ?? string.Empty;
        var furnitureType = input["furniture_type"]?.GetValue<string>();
        var material = input["material"]?.GetValue<string>();
        var illuminated = input["illuminated"]?.GetValue<bool?>();
        var topK = input["top_k"]?.GetValue<int>() ?? 5;

        // application is intentionally not read — the DB Application column holds luminaire-specific
        // values (Accent/Facade/Pathway) that do not match space descriptions like "public plaza".
        // Space context travels through query for semantic vector matching.
        var excludedCatalogNumbers = input["exclude_catalog_numbers"]?.AsArray()
            .Select(n => n?.GetValue<string>() ?? string.Empty)
            .Where(s => s.Length > 0)
            .ToArray();

        var results = await _furnitureSearch.SearchAsync(query, furnitureType, null, material, illuminated, topK, excludedCatalogNumbers, ct);
        var json = results.Count > 0 ? CompactFurnitureJson(results) : "{\"results\":[]}";
        var sseChunk = results.Count > 0
            ? new AgentStreamChunk { Type = AgentStreamEventType.Furniture, FurnitureItems = results }
            : null;
        return (json, sseChunk);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns a compact summary of products for Claude's tool-result context.
    /// Excludes image URLs, spec document URLs, all dimension details, and raw JSON blobs
    /// that Claude doesn't need for reasoning — typically 80-90% fewer tokens than full JSON.
    /// The full product data is still emitted via the SSE <see cref="AgentStreamChunk"/> to the frontend.
    /// </summary>
    private static string CompactProductsJson(List<ProductSearchResult> products)
    {
        var summaries = products.Select(p => new
        {
            p.CatalogNumber,
            p.FamilyName,
            p.SubFamilyName,
            p.CategoryName,
            p.GroupsName,
            p.LuminaireType,
            p.LedWattage,
            p.LumenOutputLm,
            p.BeamAngleDeg,
            p.Distribution,
            p.Voltage,
            p.ControlProtocol,
            p.Application,
            p.LeadTime,
            p.DnpPrice,
            p.IsAdaCompliant,
            p.MatchScore
        });
        return JsonSerializer.Serialize(summaries, _jsonOptions);
    }

    /// <summary>
    /// Compact summary of furniture results for Claude's tool-result context.
    /// Excludes image URLs, dimension fractions, and document URLs — ~70% fewer tokens than full serialisation.
    /// Full data is still emitted via the SSE chunk to the frontend.
    /// </summary>
    private static string CompactFurnitureJson(List<FurnitureSearchResult> items)
    {
        var summaries = items.Select(f => new
        {
            f.CatalogNumber,
            f.FamilyName,
            f.SubFamilyName,
            f.GroupsName,
            f.CategoryName,
            f.Application,
            f.Finish,
            f.LeadTime
        });
        return JsonSerializer.Serialize(summaries, _jsonOptions);
    }

    /// <summary>
    /// Builds a standard text-only message. Used for history reconstruction and assistant turns.
    /// </summary>
    private static JsonObject TextMessage(string role, string content) => new()
    {
        ["role"] = role,
        ["content"] = content
    };

    /// <summary>
    /// Builds the current user message.
    /// <list type="bullet">
    ///   <item>No image → plain text string (minimal tokens).</item>
    ///   <item>Image only → [image, text] content blocks.</item>
    ///   <item>Image + marked-area image → [label, original image, label, marked-area image,
    ///         (bounding box note), text] blocks. Labels tell Claude which image is which; the
    ///         bounding box note (when the outline could be detected) gives exact numeric
    ///         x/y percent ranges so placement-map coordinates don't depend on the model
    ///         visually estimating where the polygon outline falls.</item>
    /// </list>
    /// </summary>
    private static JsonObject BuildUserMessage(
        string text,
        string? imageBase64,
        string? imageMimeType,
        string? markedAreaBase64 = null,
        AreaBoundingBox? areaBoundingBox = null)
    {
        if (imageBase64 is null || imageMimeType is null)
            return TextMessage("user", text);

        // Two-image vision turn: original scene + Florence-2/SAM2 marked-area overlay
        if (markedAreaBase64 is not null)
        {
            var content = new JsonArray
            {
                new JsonObject { ["type"] = "text", ["text"] = "IMAGE 1 — Original scene:" },
                new JsonObject
                {
                    ["type"] = "image",
                    ["source"] = new JsonObject
                    {
                        ["type"]       = "base64",
                        ["media_type"] = imageMimeType,
                        ["data"]       = imageBase64
                    }
                },
                new JsonObject
                {
                    ["type"] = "text",
                    ["text"] = "IMAGE 2 — Same scene with the requested area outlined in bright green (Florence-2 + SAM2 segmentation):"
                },
                new JsonObject
                {
                    ["type"] = "image",
                    ["source"] = new JsonObject
                    {
                        ["type"]       = "base64",
                        ["media_type"] = DetectImageMimeType(markedAreaBase64),
                        ["data"]       = markedAreaBase64
                    }
                }
            };

            if (areaBoundingBox is not null)
            {
                content.Add(new JsonObject
                {
                    ["type"] = "text",
                    ["text"] =
                        $"AREA BOUNDING BOX — computed directly from the green outline pixels in IMAGE 2: " +
                        $"x from {areaBoundingBox.XMinPct} to {areaBoundingBox.XMaxPct}, " +
                        $"y from {areaBoundingBox.YMinPct} to {areaBoundingBox.YMaxPct} (percent of image, 0=top-left). " +
                        "This is the authoritative, numeric placement boundary."
                });
            }

            content.Add(new JsonObject { ["type"] = "text", ["text"] = text });

            return new JsonObject { ["role"] = "user", ["content"] = content };
        }

        // Single-image vision turn
        return new JsonObject
        {
            ["role"] = "user",
            ["content"] = new JsonArray
            {
                new JsonObject
                {
                    ["type"] = "image",
                    ["source"] = new JsonObject
                    {
                        ["type"]       = "base64",
                        ["media_type"] = imageMimeType,
                        ["data"]       = imageBase64
                    }
                },
                new JsonObject { ["type"] = "text", ["text"] = text }
            }
        };
    }

    /// <summary>
    /// Detects the actual image format from base64 magic-byte prefixes. The area-marking
    /// sidecar's encoder isn't guaranteed to produce PNG — Anthropic rejects a base64 image
    /// whose declared <c>media_type</c> doesn't match its real bytes with a 400, so the
    /// declared type must always be derived from the data rather than assumed.
    /// </summary>
    private static string DetectImageMimeType(string base64)
    {
        if (base64.StartsWith("iVBORw0KGgo", StringComparison.Ordinal)) return "image/png";
        if (base64.StartsWith("/9j/", StringComparison.Ordinal)) return "image/jpeg";
        if (base64.StartsWith("R0lGOD", StringComparison.Ordinal)) return "image/gif";
        if (base64.StartsWith("UklGR", StringComparison.Ordinal)) return "image/webp";
        return "image/png";
    }

    /// <summary>
    /// Filters a Products/Furniture SSE chunk down to items whose catalog number hasn't been
    /// returned earlier in this same dispatch round, adding the survivors to <paramref name="seen"/>
    /// in the process. Returns <c>null</c> if every item in the chunk was already seen (so the
    /// caller can skip adding an empty chunk). Chunk types other than Products/Furniture pass
    /// through unchanged.
    /// </summary>
    private static AgentStreamChunk? DedupeAgainstSeen(AgentStreamChunk chunk, HashSet<string> seen)
    {
        if (chunk.Products is not null)
        {
            var deduped = new List<ProductSearchResult>();
            foreach (var p in chunk.Products)
                if (seen.Add(p.CatalogNumber)) deduped.Add(p);
            return deduped.Count == 0 ? null : chunk with { Products = deduped };
        }

        if (chunk.FurnitureItems is not null)
        {
            var deduped = new List<FurnitureSearchResult>();
            foreach (var f in chunk.FurnitureItems)
                if (seen.Add(f.CatalogNumber)) deduped.Add(f);
            return deduped.Count == 0 ? null : chunk with { FurnitureItems = deduped };
        }

        return chunk;
    }

    /// <summary>
    /// Builds a plain, deterministic recommendation summary directly from the actual search
    /// results — used as a fallback when the model's own prose fails the grounding check, or
    /// when MaxToolIterations was exhausted before a clean final turn. Guarantees every catalog
    /// number and spec shown is real, at the cost of losing the model's contextual phrasing.
    /// </summary>
    private static string BuildGroundedFallbackText(List<AgentStreamChunk> chunks)
    {
        var lines = new List<string>();

        foreach (var chunk in chunks)
        {
            if (chunk.Products is not null)
            {
                foreach (var p in chunk.Products)
                {
                    var specs = new List<string>();
                    if (!string.IsNullOrEmpty(p.LedWattage)) specs.Add(p.LedWattage);
                    if (p.LumenOutputLm is { } lm) specs.Add($"{lm} lm");
                    if (p.BeamAngleDeg is { } beam) specs.Add($"{beam}° beam");
                    if (!string.IsNullOrEmpty(p.Distribution)) specs.Add(p.Distribution);
                    if (!string.IsNullOrEmpty(p.ControlProtocol)) specs.Add(p.ControlProtocol);
                    if (p.DnpPrice is > 0) specs.Add($"${p.DnpPrice:N0} DNP");
                    var specsText = specs.Count > 0 ? $" — {string.Join(", ", specs)}" : string.Empty;
                    lines.Add($"{p.CatalogNumber} ({p.FamilyName ?? "BEGA luminaire"}){specsText}");
                }
            }

            if (chunk.FurnitureItems is not null)
            {
                foreach (var f in chunk.FurnitureItems)
                    lines.Add($"{f.CatalogNumber} ({f.FamilyName ?? "BEGA furniture"})");
            }
        }

        return lines.Count == 0
            ? "Here are the matching BEGA products from the catalog."
            : "Here are the matching BEGA products from the catalog:\n\n" + string.Join("\n", lines);
    }

    /// <summary>
    /// Maps a friendly alias to the canonical Anthropic model ID.
    /// Full model IDs (starting with "claude-") are passed through unchanged
    /// so existing appsettings values continue to work without modification.
    /// </summary>
    private static string ResolveModel(string modelConfig) =>
        modelConfig.ToLowerInvariant() switch
        {
            "haiku"  => "claude-haiku-4-5-20251001",
            "sonnet" => "claude-sonnet-4-6",
            "opus"   => "claude-opus-4-8",
            _        => modelConfig  // full model ID passed through as-is
        };

    private static decimal? TryGetDecimal(JsonNode? node)
    {
        if (node is null) return null;
        try { return node.GetValue<decimal>(); }
        catch { return null; }
    }

    // ── Inner types ───────────────────────────────────────────────────────────

    private sealed record CollectedToolCall(string Id, string Name, JsonObject Input);
}
