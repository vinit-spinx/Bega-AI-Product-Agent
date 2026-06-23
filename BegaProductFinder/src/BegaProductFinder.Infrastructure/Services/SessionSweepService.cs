using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Periodically finalizes chat sessions that went inactive without the visitor explicitly
/// starting a new chat (e.g. they just closed the tab). Catches what the explicit "New Chat"
/// trigger in <c>ChatEndpoints.FinalizeSessionAsync</c> would otherwise miss.
/// </summary>
public sealed class SessionSweepService(
    IServiceScopeFactory scopeFactory,
    ILogger<SessionSweepService> logger) : BackgroundService
{
    private static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan InactivityThreshold = TimeSpan.FromMinutes(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Stagger the first run so it doesn't compete with app startup.
        try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (TaskCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SweepOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Session sweep iteration failed");
            }

            try { await Task.Delay(SweepInterval, stoppingToken); } catch (TaskCanceledException) { break; }
        }
    }

    private async Task SweepOnceAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var finalizer = scope.ServiceProvider.GetRequiredService<ISessionFinalizationService>();

        var cutoff = DateTime.UtcNow - InactivityThreshold;

        // Sessions inactive past the threshold, with no row in SessionFunnelStatuses at all,
        // or a row that exists but isn't yet finalized.
        var candidateIds = await db.ChatSessions
            .Where(s => s.LastActivityAt < cutoff)
            .Where(s => !db.SessionFunnelStatuses.Any(f => f.SessionId == s.SessionId && f.IsFinalized))
            .Select(s => s.SessionId)
            .Take(50) // bounded batch per sweep — avoids a burst of AI calls if the backlog is large
            .ToListAsync(ct);

        foreach (var id in candidateIds)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                await finalizer.FinalizeSessionAsync(id.ToString(), ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to finalize inactive session {SessionId}", id);
            }
        }

        if (candidateIds.Count > 0)
            logger.LogInformation("Session sweep finalized {Count} inactive session(s)", candidateIds.Count);
    }
}
