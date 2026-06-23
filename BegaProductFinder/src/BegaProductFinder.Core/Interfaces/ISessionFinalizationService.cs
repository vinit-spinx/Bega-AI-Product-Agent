namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Classifies a chat session once it has ended: determines the single highest funnel stage
/// reached, asks Claude to summarize the conversation and judge lead intent/temperature, and
/// persists the result to <c>SessionFunnelStatuses</c>. Idempotent — already-finalized sessions
/// are skipped without making another AI call.
/// </summary>
public interface ISessionFinalizationService
{
    Task FinalizeSessionAsync(string sessionId, CancellationToken ct = default);
}
