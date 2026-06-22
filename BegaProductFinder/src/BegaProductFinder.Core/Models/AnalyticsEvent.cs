namespace BegaProductFinder.Core.Models;

/// <summary>
/// Lightweight event log for AI usage analytics.
/// Tracks queries, action card clicks, suggestion clicks, and conversion funnel stages
/// (product views, shortlisting, BOM generation, lead capture).
/// </summary>
public class AnalyticsEvent
{
    public long EventId { get; set; }

    /// <summary>
    /// 'query' | 'action_click' | 'suggestion_click' | 'product_viewed' | 'shortlisted' |
    /// 'unshortlisted' | 'bom_generated' | 'lead_captured'.
    /// </summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>Browser session that originated the event.</summary>
    public string? SessionId { get; set; }

    /// <summary>Query text, action title, or suggestion text depending on EventType.</summary>
    public string? Name { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
