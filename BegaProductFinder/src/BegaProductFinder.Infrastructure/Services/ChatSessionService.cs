using System.Text.Json;
using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Persists conversation sessions in the SQL Server ChatSessions table.
/// Messages are stored as a JSON blob within a single row — no separate messages table.
/// </summary>
public sealed class ChatSessionService : IChatSessionService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ChatSessionService> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ChatSessionService(AppDbContext db, ILogger<ChatSessionService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<ChatSession> GetOrCreateAsync(string sessionId, CancellationToken ct = default)
    {
        if (!Guid.TryParse(sessionId, out var guid))
            throw new ArgumentException($"Invalid session ID format: {sessionId}", nameof(sessionId));

        var session = await _db.ChatSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SessionId == guid, ct);

        if (session is not null) return session;

        session = new ChatSession
        {
            SessionId = guid,
            CreatedAt = DateTime.UtcNow,
            LastActivityAt = DateTime.UtcNow,
            MessagesJson = "[]"
        };

        try
        {
            _db.ChatSessions.Add(session);
            await _db.SaveChangesAsync(ct);
            _db.ChangeTracker.Clear();
        }
        catch (DbUpdateException)
        {
            // Race condition: another request created the session concurrently — reload it
            _db.ChangeTracker.Clear();
            session = await _db.ChatSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionId == guid, ct)
                ?? throw new InvalidOperationException($"Session {sessionId} could not be created or retrieved.");
        }

        return session;
    }

    /// <inheritdoc/>
    public async Task SaveAsync(ChatSession session, CancellationToken ct = default)
    {
        try
        {
            session.LastActivityAt = DateTime.UtcNow;
            _db.ChatSessions.Update(session);
            await _db.SaveChangesAsync(ct);
            _db.ChangeTracker.Clear();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save chat session {SessionId}", session.SessionId);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<List<ChatMessage>> GetHistoryAsync(
        string sessionId,
        int lastN = 10,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(sessionId, out var guid)) return [];

        var session = await _db.ChatSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SessionId == guid, ct);

        if (session is null) return [];

        try
        {
            var messages = JsonSerializer.Deserialize<List<ChatMessage>>(session.MessagesJson, _jsonOptions) ?? [];
            return messages.Count <= lastN ? messages : messages[^lastN..];
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Could not deserialize MessagesJson for session {SessionId}", sessionId);
            return [];
        }
    }
}
