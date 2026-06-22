using System.Text;
using System.Text.Json;
using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <inheritdoc cref="ISessionFinalizationService"/>
public sealed class SessionFinalizationService(
    AppDbContext db,
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<SessionFinalizationService> logger) : ISessionFinalizationService
{
    private static readonly JsonSerializerOptions MessagesJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <inheritdoc/>
    public async Task FinalizeSessionAsync(string sessionId, CancellationToken ct = default)
    {
        if (!Guid.TryParse(sessionId, out var guid)) return;

        // Idempotent — skip if already finalized so the AI is never called twice for one session.
        var existing = await db.SessionFunnelStatuses.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SessionId == guid, ct);
        if (existing is { IsFinalized: true }) return;

        var session = await db.ChatSessions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SessionId == guid, ct);
        if (session is null) return;

        List<ChatMessage> messages;
        try
        {
            messages = JsonSerializer.Deserialize<List<ChatMessage>>(session.MessagesJson, MessagesJsonOptions) ?? [];
        }
        catch (JsonException)
        {
            messages = [];
        }

        // Nothing was ever asked — no funnel stage was reached, nothing to classify.
        if (!messages.Any(m => m.Role == "user")) return;

        var sessionIdStr = guid.ToString();

        // ── Stage classification — single highest stage, mutually exclusive ────────────
        var contactInquiry = await db.ContactInquiries.AsNoTracking()
            .Where(c => c.SessionId == sessionIdStr)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);
        var hasLeadCaptured = contactInquiry is not null;

        var bomGeneratedCount = await db.AnalyticsEvents
            .CountAsync(e => e.EventType == "bom_generated" && e.SessionId == sessionIdStr, ct);

        var shortlistedCount = await db.AnalyticsEvents
            .CountAsync(e => e.EventType == "shortlisted" && e.SessionId == sessionIdStr, ct);
        var unshortlistedCount = await db.AnalyticsEvents
            .CountAsync(e => e.EventType == "unshortlisted" && e.SessionId == sessionIdStr, ct);

        var productViewedCount = await db.AnalyticsEvents
            .CountAsync(e => e.EventType == "product_viewed" && e.SessionId == sessionIdStr, ct);

        var netShortlisted = shortlistedCount - unshortlistedCount;

        var stage = hasLeadCaptured ? "lead_captured"
            : bomGeneratedCount > 0 ? "bom_generated"
            : netShortlisted > 0 ? "shortlisted"
            : productViewedCount > 0 ? "product_viewed"
            : "query";

        // ── AI summary + lead classification ────────────────────────────────────────────
        string? summary = null;
        bool isLead = hasLeadCaptured; // a submitted form is always a lead, regardless of AI's read
        string? temperature = BaselineTemperature(stage);

        try
        {
            // The "Connect with BEGA" form's free-text query (3rd step) is a strong lead signal in
            // its own right — feed it to the AI alongside the chat transcript when present. Quote
            // requests carry their own synthesized Query too, but their richer Message field is more
            // representative of visitor intent, so prefer that when available.
            var formQuery = contactInquiry is null ? null
                : contactInquiry.Source == "inquiry"
                    ? contactInquiry.Query
                    : contactInquiry.Message ?? contactInquiry.Query;

            var (aiSummary, aiIsLead, aiTemperature) = await ClassifyWithAiAsync(messages, stage, hasLeadCaptured, formQuery, ct);
            summary = aiSummary;
            isLead = isLead || aiIsLead;
            if (isLead) temperature = aiTemperature ?? temperature;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AI session classification failed for {SessionId} — falling back to funnel-stage baseline", sessionId);
        }

        var status = existing ?? new SessionFunnelStatus { SessionId = guid };
        status.FunnelStage     = stage;
        status.IsLead          = isLead;
        status.LeadTemperature = isLead ? temperature : null;
        status.Summary         = summary;
        status.IsFinalized     = true;
        status.FinalizedAt     = DateTime.UtcNow;

        if (existing is null) db.SessionFunnelStatuses.Add(status);
        else db.SessionFunnelStatuses.Update(status);

        await db.SaveChangesAsync(ct);
    }

    private static string BaselineTemperature(string stage) => stage switch
    {
        "bom_generated" or "lead_captured" => "hot",
        "shortlisted" => "warm",
        _ => "cold",
    };

    private async Task<(string? Summary, bool IsLead, string? Temperature)> ClassifyWithAiAsync(
        List<ChatMessage> messages, string stage, bool hasLeadCaptured, string? formQuery, CancellationToken ct)
    {
        var apiKey = config["Anthropic:ApiKey"] ?? string.Empty;
        if (string.IsNullOrWhiteSpace(apiKey)) return (null, false, null);

        var model = config["Anthropic:Model"] switch
        {
            "haiku"  => "claude-haiku-4-5-20251001",
            "sonnet" => "claude-sonnet-4-6",
            "opus"   => "claude-opus-4-8",
            var m when !string.IsNullOrEmpty(m) => m,
            _ => "claude-haiku-4-5-20251001",
        };

        var transcript = string.Join("\n", messages.Select(m =>
            $"{(m.Role == "user" ? "Visitor" : "AI Advisor")}: {(m.Content.Length > 800 ? m.Content[..800] + "…" : m.Content)}"));

        var prompt = $$"""
            You are analysing a conversation between a visitor and BEGA's AI architectural lighting
            product advisor, in order to classify it for the sales team.

            ## Conversation
            {{transcript}}

            ## Funnel signal
            The visitor's furthest tracked action this session was: {{stage}}.
            {{(hasLeadCaptured ? "The visitor also submitted a contact/quote form — this is a strong lead signal." : "")}}
            {{(string.IsNullOrWhiteSpace(formQuery) ? "" : $"The visitor wrote this in the contact form: \"{(formQuery!.Length > 500 ? formQuery[..500] + "…" : formQuery)}\"")}}

            ## Instructions
            Judge whether this conversation shows genuine purchase or specification intent (not just
            casual browsing, a test message, or an unrelated question). Use the funnel signal as a
            starting point for lead temperature, but adjust based on what was actually said:
            - cold: browsing, vague, single short message, no project specifics
            - warm: a real project or requirement was discussed, but no urgency/budget/timeline given
            - hot: specific project details, budget, timeline, or urgency mentioned, or a form was submitted

            Return ONLY valid JSON, no markdown fences, no prose:
            {
              "summary": "2-3 sentence summary of what the visitor wanted and how the conversation went",
              "isLead": true or false,
              "leadTemperature": "cold" | "warm" | "hot" | null
            }
            leadTemperature must be null when isLead is false.
            """;

        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Add("x-api-key", apiKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var body = JsonSerializer.Serialize(new
        {
            model,
            max_tokens = 400,
            messages = new[] { new { role = "user", content = prompt } },
        });

        var response = await client.PostAsync(
            "https://api.anthropic.com/v1/messages",
            new StringContent(body, Encoding.UTF8, "application/json"), ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var rawText = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "{}";

        var jsonText = rawText.Trim();
        if (jsonText.StartsWith("```")) jsonText = jsonText[(jsonText.IndexOf('{'))..];
        if (jsonText.EndsWith("```")) jsonText = jsonText[..(jsonText.LastIndexOf('}') + 1)];

        using var result = JsonDocument.Parse(jsonText.Trim());
        var root = result.RootElement;

        var summary = root.TryGetProperty("summary", out var s) ? s.GetString() : null;
        var isLead  = root.TryGetProperty("isLead", out var l) && l.GetBoolean();
        var temp    = root.TryGetProperty("leadTemperature", out var t) && t.ValueKind == JsonValueKind.String
            ? t.GetString() : null;

        return (summary, isLead, temp);
    }
}
