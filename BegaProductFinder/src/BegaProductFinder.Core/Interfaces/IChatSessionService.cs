using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Persists and retrieves conversation sessions from SQL Server.
/// Sessions are identified by a client-supplied UUID created in the browser via <c>crypto.randomUUID()</c>.
/// Messages are stored as a JSON blob within the <see cref="ChatSession"/> row — no separate messages table.
/// </summary>
public interface IChatSessionService
{
    /// <summary>
    /// Returns the existing session for <paramref name="sessionId"/>, or creates and persists a new empty session.
    /// </summary>
    /// <param name="sessionId">Client-supplied UUID string.</param>
    Task<ChatSession> GetOrCreateAsync(string sessionId, CancellationToken ct = default);

    /// <summary>
    /// Persists the session state — updates <see cref="ChatSession.MessagesJson"/>,
    /// <see cref="ChatSession.ContextJson"/>, and <see cref="ChatSession.LastActivityAt"/>.
    /// </summary>
    Task SaveAsync(ChatSession session, CancellationToken ct = default);

    /// <summary>
    /// Returns the last <paramref name="lastN"/> messages from the session in chronological order.
    /// Used to build the messages array sent to the Claude API.
    /// </summary>
    /// <param name="sessionId">Client-supplied UUID string.</param>
    /// <param name="lastN">Maximum number of recent messages to include. Defaults to 10.</param>
    Task<List<ChatMessage>> GetHistoryAsync(
        string sessionId,
        int lastN = 10,
        CancellationToken ct = default);
}
