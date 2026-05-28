using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// SSE streaming chat endpoint and session management endpoints.
/// </summary>
public static class ChatEndpoints
{
    private static readonly JsonSerializerOptions SseJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/chat").WithTags("Chat");

        group.MapPost("/message", HandleMessageAsync)
            .WithName("PostChatMessage")
            .WithSummary("Send a message and receive a streamed agent response via SSE.");

        group.MapGet("/session/{sessionId}", GetSessionAsync)
            .WithName("GetChatSession")
            .WithSummary("Retrieve conversation history for a session.");

        group.MapDelete("/session/{sessionId}", DeleteSessionAsync)
            .WithName("DeleteChatSession")
            .WithSummary("Clear all messages for a session.");
    }

    // ── POST /api/chat/message ────────────────────────────────────────────────

    private static async Task HandleMessageAsync(
        [FromBody] ChatMessageRequest request,
        IAgentOrchestrator orchestrator,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var response = httpContext.Response;
        response.ContentType = "text/event-stream";
        response.Headers.CacheControl = "no-cache";
        response.Headers.Append("X-Accel-Buffering", "no");
        response.Headers.Append("Connection", "keep-alive");

        await response.StartAsync(ct);

        await foreach (var chunk in orchestrator.StreamResponseAsync(
            request.SessionId, request.Message, ct))
        {
            var ssePayload = BuildSsePayload(chunk);
            if (ssePayload is null) continue;

            var line = $"data: {ssePayload}\n\n";
            await response.WriteAsync(line, Encoding.UTF8, ct);
            await response.Body.FlushAsync(ct);
        }
    }

    private static string? BuildSsePayload(AgentStreamChunk chunk)
    {
        object? envelope = chunk.Type switch
        {
            AgentStreamEventType.TextDelta =>
                new { type = "text_delta", content = chunk.Content },

            AgentStreamEventType.Products =>
                new { type = "products", products = chunk.Products },

            AgentStreamEventType.Furniture =>
                new { type = "furniture", items = chunk.FurnitureItems },

            AgentStreamEventType.ProjectRecommendation =>
                new { type = "project_recommendation", areas = chunk.ProjectAreas },

            AgentStreamEventType.Bom =>
                new { type = "bom", report = chunk.BomReport },

            AgentStreamEventType.SuggestedActions =>
                new { type = "suggested_actions", actions = chunk.SuggestedActions },

            AgentStreamEventType.Done =>
                new { type = "done" },

            AgentStreamEventType.Error =>
                new { type = "error", message = chunk.ErrorMessage },

            _ => null
        };

        return envelope is null ? null : JsonSerializer.Serialize(envelope, SseJsonOptions);
    }

    // ── GET /api/chat/session/{sessionId} ─────────────────────────────────────

    private static async Task<IResult> GetSessionAsync(
        string sessionId,
        IChatSessionService sessionService,
        CancellationToken ct)
    {
        if (!Guid.TryParse(sessionId, out _))
            return Results.BadRequest("sessionId must be a valid UUID.");

        var history = await sessionService.GetHistoryAsync(sessionId, lastN: 100, ct);
        return Results.Ok(new { sessionId, messages = history });
    }

    // ── DELETE /api/chat/session/{sessionId} ──────────────────────────────────

    private static async Task<IResult> DeleteSessionAsync(
        string sessionId,
        IChatSessionService sessionService,
        CancellationToken ct)
    {
        if (!Guid.TryParse(sessionId, out var guid))
            return Results.BadRequest("sessionId must be a valid UUID.");

        var session = await sessionService.GetOrCreateAsync(sessionId, ct);
        session.MessagesJson = "[]";
        session.ContextJson = null;
        session.LastActivityAt = DateTime.UtcNow;
        await sessionService.SaveAsync(session, ct);

        return Results.Ok(new { sessionId, cleared = true });
    }
}

/// <summary>Request body for <c>POST /api/chat/message</c>.</summary>
public sealed record ChatMessageRequest(
    string SessionId,
    string Message
);
