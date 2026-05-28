namespace BegaProductFinder.Core.Models;

/// <summary>
/// EF Core entity persisting a conversation session in SQL Server.
/// Messages and context are stored as JSON blobs to avoid a separate messages table.
/// </summary>
public class ChatSession
{
    /// <summary>Client-supplied UUID — set once on session creation via <c>crypto.randomUUID()</c>.</summary>
    public Guid SessionId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Updated on every message exchange.</summary>
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    /// <summary>JSON-serialized <see cref="List{ChatMessage}"/> — the full conversation history.</summary>
    public string MessagesJson { get; set; } = "[]";

    /// <summary>JSON-serialized session context (recently mentioned catalog numbers, active filters, etc.).</summary>
    public string? ContextJson { get; set; }
}
