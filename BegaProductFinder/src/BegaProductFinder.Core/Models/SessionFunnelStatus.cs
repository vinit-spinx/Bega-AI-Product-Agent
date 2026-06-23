namespace BegaProductFinder.Core.Models;

/// <summary>
/// One row per chat session, written once the session is finalized (either the visitor clicks
/// "New Chat" or the background sweep detects inactivity). Holds the session's single highest
/// funnel stage reached, plus the AI-generated summary and lead classification — replacing the
/// old per-event independent counting and the keyword-based lead scoring.
/// </summary>
public class SessionFunnelStatus
{
    /// <summary>Same UUID as <see cref="ChatSession.SessionId"/> — 1:1, also the primary key.</summary>
    public Guid SessionId { get; set; }

    /// <summary>
    /// The session's single highest funnel stage reached, mutually exclusive across stages:
    /// 'query' | 'product_viewed' | 'shortlisted' | 'bom_generated' | 'lead_captured'.
    /// Reaching a later stage supersedes earlier ones for counting purposes — e.g. a session
    /// that shortlisted items and then generated a BOM is classified only as 'bom_generated',
    /// and a session that shortlisted then removed everything (net zero) falls back to
    /// whatever stage it last genuinely held.
    /// </summary>
    public string FunnelStage { get; set; } = "query";

    /// <summary>True if the AI determined this conversation shows genuine purchase/specification intent.</summary>
    public bool IsLead { get; set; }

    /// <summary>'cold' | 'warm' | 'hot' — only meaningful when <see cref="IsLead"/> is true.</summary>
    public string? LeadTemperature { get; set; }

    /// <summary>AI-generated 2-3 sentence summary of what the visitor wanted and how the conversation went.</summary>
    public string? Summary { get; set; }

    /// <summary>True once the AI classification has run. Sessions are only counted in the funnel/lead views when finalized.</summary>
    public bool IsFinalized { get; set; }

    public DateTime? FinalizedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
