namespace BegaProductFinder.Core.Models;

/// <summary>
/// Represents one turn in a conversation.
/// Serialized as JSON within <see cref="ChatSession.MessagesJson"/> — not a separate DB table.
/// </summary>
public record ChatMessage
{
    /// <summary>Sender role: "user" or "assistant".</summary>
    public required string Role { get; init; }

    /// <summary>Text content of the message.</summary>
    public required string Content { get; init; }

    /// <summary>UTC timestamp of message creation.</summary>
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
