using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Drives the multi-turn Claude API tool execution loop and streams typed chunks to the caller.
/// The orchestrator maintains conversation history via <c>IChatSessionService</c>, calls the
/// Claude Messages API with all 8 tool definitions, executes tool calls by dispatching to
/// the appropriate service, and streams <see cref="AgentStreamChunk"/> events as they arrive.
/// </summary>
public interface IAgentOrchestrator
{
    /// <summary>
    /// Sends a user message, runs the full tool execution loop, and streams the response.
    /// </summary>
    /// <param name="sessionId">Client-supplied UUID identifying the conversation session.</param>
    /// <param name="userMessage">The raw user message text.</param>
    /// <returns>
    /// An async enumerable of <see cref="AgentStreamChunk"/> events covering:
    /// text deltas, product results, furniture results, project recommendations,
    /// bill of materials, suggested actions, done, and error signals.
    /// </returns>
    IAsyncEnumerable<AgentStreamChunk> StreamResponseAsync(
        string sessionId,
        string userMessage,
        string? imageBase64 = null,
        string? imageMimeType = null,
        CancellationToken ct = default);
}
