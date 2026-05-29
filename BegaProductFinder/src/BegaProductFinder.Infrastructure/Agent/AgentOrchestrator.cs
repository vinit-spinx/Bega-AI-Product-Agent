using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
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
        _logger = logger;

        _apiKey = config["Anthropic:ApiKey"]
            ?? throw new InvalidOperationException("Anthropic:ApiKey is required.");
        _model = config["Anthropic:Model"] ?? "claude-sonnet-4-20250514";
        _maxTokens = config.GetValue<int>("Anthropic:MaxTokens", 2048);
        _maxToolIterations = config.GetValue<int>("Anthropic:MaxToolIterations", 5);
    }

    /// <inheritdoc/>
    public async IAsyncEnumerable<AgentStreamChunk> StreamResponseAsync(
        string sessionId,
        string userMessage,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        Exception? caught = null;

        await using var enumerator = RunAsync(sessionId, userMessage, ct).GetAsyncEnumerator(ct);

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
        [EnumeratorCancellation] CancellationToken ct)
    {
        // Build API messages from session history + current user turn
        var history = await _sessionService.GetHistoryAsync(sessionId, lastN: 10, ct);

        var apiMessages = new List<JsonObject>();
        foreach (var msg in history)
            apiMessages.Add(TextMessage(msg.Role, msg.Content));
        apiMessages.Add(TextMessage("user", userMessage));

        var systemPrompt = _promptBuilder.Build();
        var tools = AgentTools.GetDefinitions();

        string finalAssistantText = string.Empty;

        for (int iteration = 0; iteration < _maxToolIterations; iteration++)
        {
            var accText = new StringBuilder();
            var toolCalls = new List<CollectedToolCall>();
            string stopReason = "end_turn";

            // Stream this turn from Claude
            await foreach (var (eventChunk, toolCall, reason) in
                StreamTurnAsync(apiMessages, systemPrompt, tools, ct))
            {
                if (eventChunk is not null) yield return eventChunk;
                if (toolCall is not null) toolCalls.Add(toolCall);
                if (reason is not null) stopReason = reason;

                // Accumulate text from TextDelta chunks to build history
                if (eventChunk?.Type == AgentStreamEventType.TextDelta && eventChunk.Content is not null)
                    accText.Append(eventChunk.Content);
            }

            var assistantText = accText.ToString();
            finalAssistantText = assistantText;

            // No tool calls — Claude gave a final answer
            if (toolCalls.Count == 0 || stopReason == "end_turn")
            {
                finalAssistantText = assistantText;
                break;
            }

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

            // Execute tool calls and collect results
            var toolResultsArray = new JsonArray();

            foreach (var tc in toolCalls)
            {
                var (resultJson, sseChunk) = await DispatchToolAsync(tc, ct);
                if (sseChunk is not null) yield return sseChunk;

                toolResultsArray.Add(new JsonObject
                {
                    ["type"] = "tool_result",
                    ["tool_use_id"] = tc.Id,
                    ["content"] = resultJson
                });
            }

            apiMessages.Add(new JsonObject { ["role"] = "user", ["content"] = toolResultsArray });
        }

        // Persist the user message and final assistant response to the session
        var session = await _sessionService.GetOrCreateAsync(sessionId, ct);
        var existingMessages = JsonSerializer.Deserialize<List<ChatMessage>>(session.MessagesJson, _jsonOptions) ?? [];
        existingMessages.Add(new ChatMessage { Role = "user", Content = userMessage });
        if (!string.IsNullOrEmpty(finalAssistantText))
            existingMessages.Add(new ChatMessage { Role = "assistant", Content = finalAssistantText });
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
        var requestBody = new JsonObject
        {
            ["model"] = _model,
            ["max_tokens"] = _maxTokens,
            ["system"] = systemPrompt,
            ["stream"] = true,
            ["tools"] = new JsonArray(tools.Select(t => (JsonNode)t.DeepClone()).ToArray()),
            ["messages"] = new JsonArray(apiMessages.Select(m => (JsonNode)m.DeepClone()).ToArray())
        };

        using var client = _httpFactory.CreateClient("Claude");
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        request.Headers.Add("x-api-key", _apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
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
        var filters = new ProductSearchFilters
        {
            Category = input["category"]?.GetValue<string>(),
            Group = input["group"]?.GetValue<string>(),
            FamilyName = input["family_name"]?.GetValue<string>(),
            MinWattageW = TryGetDecimal(input["min_wattage_w"]),
            MaxWattageW = TryGetDecimal(input["max_wattage_w"]),
            MinLumenOutput = TryGetDecimal(input["min_lumen_output"]),
            BeamAngleDeg = TryGetDecimal(input["beam_angle_deg"]),
            ColorTemperatureK = input["color_temperature_k"]?.GetValue<int?>(),
            Voltage = input["voltage"]?.GetValue<string>(),
            ControlProtocol = input["control_protocol"]?.GetValue<string>(),
            AdaCompliant = input["ada_compliant"]?.GetValue<bool?>(),
            ExpressDelivery = input["express_delivery"]?.GetValue<bool?>(),
            TopK = input["top_k"]?.GetValue<int>() ?? 5
        };

        var results = await _productSearch.SearchByNaturalLanguageAsync(query, filters, ct);
        var json = JsonSerializer.Serialize(results, _jsonOptions);
        var sseChunk = results.Count > 0
            ? new AgentStreamChunk { Type = AgentStreamEventType.Products, Products = results }
            : null;
        return (json, sseChunk);
    }

    private async Task<(string, AgentStreamChunk?)> GetProductDetailAsync(JsonObject input, CancellationToken ct)
    {
        var catalogNumber = input["catalog_number"]?.GetValue<string>() ?? string.Empty;
        var detail = await _productSearch.GetProductDetailAsync(catalogNumber, ct);
        var json = detail is not null
            ? JsonSerializer.Serialize(detail, _jsonOptions)
            : $"{{\"error\": \"Product '{catalogNumber}' not found in the catalog.\"}}";

        AgentStreamChunk? sseChunk = null;
        if (detail is not null)
        {
            sseChunk = new AgentStreamChunk
            {
                Type = AgentStreamEventType.Products,
                Products = [(ProductSearchResult)detail]
            };
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
        if (level == "products" && result is List<ProductSearchResult> productList && productList.Count > 0)
            sseChunk = new AgentStreamChunk { Type = AgentStreamEventType.Products, Products = productList };

        return (JsonSerializer.Serialize(result, _jsonOptions), sseChunk);
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
        var json = JsonSerializer.Serialize(results, _jsonOptions);
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

        var json = JsonSerializer.Serialize(recommendations, _jsonOptions);
        var sseChunk = recommendations.Count > 0
            ? new AgentStreamChunk { Type = AgentStreamEventType.ProjectRecommendation, ProjectAreas = recommendations }
            : null;
        return (json, sseChunk);
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
        var json = JsonSerializer.Serialize(report, _jsonOptions);
        var sseChunk = new AgentStreamChunk { Type = AgentStreamEventType.Bom, BomReport = report };
        return (json, sseChunk);
    }

    private async Task<(string, AgentStreamChunk?)> SearchFurnitureAsync(JsonObject input, CancellationToken ct)
    {
        var query = input["query"]?.GetValue<string>() ?? string.Empty;
        var furnitureType = input["furniture_type"]?.GetValue<string>();
        var application = input["application"]?.GetValue<string>();
        var material = input["material"]?.GetValue<string>();
        var illuminated = input["illuminated"]?.GetValue<bool?>();
        var topK = input["top_k"]?.GetValue<int>() ?? 5;

        var results = await _furnitureSearch.SearchAsync(query, furnitureType, application, material, illuminated, topK, ct);
        var json = JsonSerializer.Serialize(results, _jsonOptions);
        var sseChunk = results.Count > 0
            ? new AgentStreamChunk { Type = AgentStreamEventType.Furniture, FurnitureItems = results }
            : null;
        return (json, sseChunk);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static JsonObject TextMessage(string role, string content) => new()
    {
        ["role"] = role,
        ["content"] = content
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
