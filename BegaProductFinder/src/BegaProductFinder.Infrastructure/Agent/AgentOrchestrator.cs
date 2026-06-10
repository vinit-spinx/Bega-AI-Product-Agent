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
    private readonly DepthAnalysisService _depthAnalysis;
    private readonly ILogger<AgentOrchestrator> _logger;

    private readonly string _apiKey;
    private readonly string _model;
    private readonly int _maxTokens;
    private readonly int _maxToolIterations;

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
        DepthAnalysisService depthAnalysis,
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
        _depthAnalysis = depthAnalysis;
        _logger = logger;

        _apiKey = config["Anthropic:ApiKey"]
            ?? throw new InvalidOperationException("Anthropic:ApiKey is required.");
        _model = ResolveModel(config["Anthropic:Model"] ?? "sonnet");
        _maxTokens = config.GetValue<int>("Anthropic:MaxTokens", 2048);
        _maxToolIterations = config.GetValue<int>("Anthropic:MaxToolIterations", 5);
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

        // When an image is present, request a depth map from the local Depth Anything V2 sidecar.
        // The depth map gives Claude explicit surface-distance information so placement markers
        // land on physical surfaces rather than sky or mid-air regions.
        string? depthMapBase64 = null;
        if (imageBase64 is not null)
        {
            depthMapBase64 = await _depthAnalysis.GetDepthMapBase64Async(imageBase64, ct);
            if (depthMapBase64 is not null)
                _logger.LogDebug("Depth map acquired ({Chars} base64 chars) — sending two-image vision request", depthMapBase64.Length);
            else
                _logger.LogDebug("Depth analysis unavailable — sending single-image vision request");
        }

        // When an image is present, build a content-block array message (vision turn).
        // When a depth map is also available, include it as a second labeled image block.
        // Otherwise fall back to a plain text string (standard turn, no extra tokens).
        apiMessages.Add(BuildUserMessage(userMessage, imageBase64, imageMimeType, depthMapBase64));

        var systemPrompt = _promptBuilder.Build();
        var tools = _toolDefinitions;

        string finalAssistantText = string.Empty;

        // Track dispatched tool calls to skip exact duplicates (same name + input hash)
        var dispatchedToolKeys = new HashSet<string>();

        for (int iteration = 0; iteration < _maxToolIterations; iteration++)
        {
            var accText = new StringBuilder();
            var toolCalls = new List<CollectedToolCall>();
            string? stopReason = null;

            await foreach (var (eventChunk, toolCall, reason) in
                StreamTurnAsync(apiMessages, systemPrompt, tools, ct))
            {
                if (eventChunk is not null) yield return eventChunk;
                if (toolCall is not null) toolCalls.Add(toolCall);
                if (reason is not null) stopReason = reason;

                if (eventChunk?.Type == AgentStreamEventType.TextDelta && eventChunk.Content is not null)
                    accText.Append(eventChunk.Content);
            }

            var assistantText = accText.ToString();
            finalAssistantText = assistantText;

            if (toolCalls.Count == 0 || stopReason is "max_tokens" or "stop_sequence")
                break;

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

            // Emit SSE chunks and build the tool-result array sequentially (safe for yield)
            for (int i = 0; i < toolCalls.Count; i++)
            {
                var (resultJson, sseChunk) = dispatchResults[i];
                if (sseChunk is not null) yield return sseChunk;
                toolResultsArray.Add(new JsonObject
                {
                    ["type"] = "tool_result",
                    ["tool_use_id"] = toolCalls[i].Id,
                    ["content"] = resultJson
                });
            }

            apiMessages.Add(new JsonObject { ["role"] = "user", ["content"] = toolResultsArray });
        }

        // Parse <suggested_actions> out of the final response text before saving to history.
        // The raw tag is streamed to the frontend as text_delta (frontend renders it as pills),
        // but keeping it in session history adds ~50-100 tokens of XML noise to every future turn.
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

        // yield must be outside try/catch (CS1626)
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
    ///   <item>Image + depth map → [label, original image, label, depth map, text] blocks.
    ///         Labels tell Claude which image is which so it can correlate depth values
    ///         with scene regions when computing placement-map coordinates.</item>
    /// </list>
    /// </summary>
    private static JsonObject BuildUserMessage(
        string text,
        string? imageBase64,
        string? imageMimeType,
        string? depthMapBase64 = null)
    {
        if (imageBase64 is null || imageMimeType is null)
            return TextMessage("user", text);

        // Two-image vision turn: original scene + depth map
        if (depthMapBase64 is not null)
        {
            return new JsonObject
            {
                ["role"] = "user",
                ["content"] = new JsonArray
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
                        ["text"] = "IMAGE 2 — Depth map (light/white pixels = surfaces CLOSE to camera; dark/black pixels = surfaces FAR from camera or open sky):"
                    },
                    new JsonObject
                    {
                        ["type"] = "image",
                        ["source"] = new JsonObject
                        {
                            ["type"]       = "base64",
                            ["media_type"] = "image/png",
                            ["data"]       = depthMapBase64
                        }
                    },
                    new JsonObject { ["type"] = "text", ["text"] = text }
                }
            };
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
    /// Maps a friendly alias to the canonical Anthropic model ID.
    /// Full model IDs (starting with "claude-") are passed through unchanged
    /// so existing appsettings values continue to work without modification.
    /// </summary>
    private static string ResolveModel(string modelConfig) =>
        modelConfig.ToLowerInvariant() switch
        {
            "haiku"  => "claude-haiku-4-5-20251001",
            "sonnet" => "claude-sonnet-4-20250514",
            "opus"   => "claude-opus-4-8",
            _        => modelConfig  // full model ID passed through as-is Old One claude-sonnet-4-20250514
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
