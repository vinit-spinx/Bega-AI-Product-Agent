using BegaProductFinder.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// V2 AI Insights endpoints — business intelligence from real application data.
/// All responses are derived from actual DB records; no fabricated metrics.
/// </summary>
public static class InsightsV2Endpoints
{
    // ── In-memory caches ──────────────────────────────────────────────────────
    private static string? _briefCache;
    private static DateTime _briefCachedAt = DateTime.MinValue;

    // Holds the AI-generated portion of the Lead Insights response.
    // Populated from the LLM call and persisted to disk so it survives server restarts.
    private sealed record LeadInsightsCacheEntry(
        IReadOnlyList<object> SortedCards,
        IReadOnlyList<object> TopOpportunities,
        string Summary);
    private static LeadInsightsCacheEntry? _leadInsightsCache;
    private static DateTime _leadInsightsCachedAt = DateTime.MinValue;

    public static void Map(WebApplication app)
    {
        var g = app.MapGroup("/api/admin/insights/v2").WithTags("InsightsV2");
        g.MapGet("/overview",       GetOverviewAsync);
        g.MapGet("/brief",          GetExecutiveBriefAsync);
        g.MapGet("/leads",          GetLeadsAsync);
        g.MapGet("/lead-insights",  GetLeadInsightsAsync);
        g.MapGet("/lead-table",     GetLeadTableAsync);
        g.MapGet("/conversations",  GetConversationsAsync);
        g.MapGet("/funnel",         GetFunnelAsync);
        g.MapGet("/products",       GetProductsAsync);
        g.MapGet("/specifications", GetSpecificationsAsync);
        g.MapGet("/content",        GetContentIntelligenceAsync);
        g.MapGet("/opportunities",  GetOpportunitiesAsync);
        g.MapGet("/network",        GetNetworkAsync);
        g.MapGet("/geography",      GetGeographyAsync);
        g.MapGet("/dashboard",      GetDashboardAsync);
    }

    // ── Overview ──────────────────────────────────────────────────────────────

    private static async Task<IResult> GetOverviewAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config,
        [FromQuery] string range = "30D", CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var (cutoff, prev) = Range(range);
        var now = DateTime.UtcNow;

        var sessions     = await db.ChatSessions.Where(s => s.CreatedAt >= cutoff).CountAsync(ct);
        var prevSessions = await db.ChatSessions.Where(s => s.CreatedAt >= prev && s.CreatedAt < cutoff).CountAsync(ct);
        var leads        = await db.ContactInquiries.Where(l => l.CreatedAt >= cutoff).CountAsync(ct);
        var prevLeads    = await db.ContactInquiries.Where(l => l.CreatedAt >= prev && l.CreatedAt < cutoff).CountAsync(ct);
        var queries      = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff).CountAsync(ct);
        var prevQueries  = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= prev && e.CreatedAt < cutoff).CountAsync(ct);

        var convRate     = sessions > 0 ? Math.Round((double)leads / sessions * 100, 1) : 0.0;
        var prevConvRate = prevSessions > 0 ? Math.Round((double)prevLeads / prevSessions * 100, 1) : 0.0;

        // Query text analysis
        var queryTexts = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff && e.Name != null)
            .Select(e => e.Name!)
            .ToListAsync(ct);

        var topCategory    = DeriveTopCategory(queryTexts);
        var topProjectType = DeriveTopProjectType(queryTexts);

        // Opportunity radar — trending topics over last 7D vs 7D before
        var radar7d  = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= now.AddDays(-7) && e.Name != null)
            .Select(e => e.Name!).ToListAsync(ct);
        var radar14d = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= now.AddDays(-14) && e.CreatedAt < now.AddDays(-7) && e.Name != null)
            .Select(e => e.Name!).ToListAsync(ct);

        var radar = BuildOpportunityRadar(radar7d, radar14d);

        // Daily activity series
        var fmt = range == "12M" ? "MMM yy" : "MMM d";
        var qByDay = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff)
            .GroupBy(e => e.CreatedAt.Date)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var lByDay = await db.ContactInquiries
            .Where(l => l.CreatedAt >= cutoff)
            .GroupBy(l => l.CreatedAt.Date)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var qMap = qByDay.ToDictionary(x => x.Day, x => x.Count);
        var lMap = lByDay.ToDictionary(x => x.Day, x => x.Count);
        var days = Enumerable.Range(0, (int)(now - cutoff).TotalDays + 1)
            .Select(i => cutoff.Date.AddDays(i)).Where(d => d <= now.Date).ToList();

        var activity = days.Select(d => new
        {
            date    = d.ToString(fmt),
            queries = qMap.TryGetValue(d, out var q) ? q : 0,
            leads   = lMap.TryGetValue(d, out var l) ? l : 0,
        }).ToList();

        return Results.Ok(new
        {
            kpis = new
            {
                totalConversations  = sessions,
                totalLeads          = leads,
                conversionRate      = convRate,
                totalQueries        = queries,
                mostActiveCategory  = topCategory,
                mostActiveProject   = topProjectType,
                trends = new
                {
                    conversations = Trend(sessions, prevSessions),
                    leads         = Trend(leads, prevLeads),
                    queries       = Trend(queries, prevQueries),
                    conversion    = Trend(convRate, prevConvRate),
                },
            },
            opportunityRadar = radar,
            activity,
        });
    }

    // ── Executive Brief (AI-generated via Anthropic API, cached 1h) ───────────

    private static async Task<IResult> GetExecutiveBriefAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config,
        IHttpClientFactory httpClientFactory, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        if (_briefCache != null && DateTime.UtcNow - _briefCachedAt < TimeSpan.FromHours(1))
            return Results.Ok(new { text = _briefCache, generatedAt = _briefCachedAt, cached = true });

        var cutoff30 = DateTime.UtcNow.AddDays(-30);
        var sessions = await db.ChatSessions.CountAsync(ct);
        var leads    = await db.ContactInquiries.Where(l => l.CreatedAt >= cutoff30).CountAsync(ct);
        var convRate = sessions > 0 ? Math.Round((double)leads / sessions * 100, 1) : 0.0;

        var queryTexts = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .Select(e => e.Name!).ToListAsync(ct);

        var topQuery = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .GroupBy(e => e.Name!)
            .Select(g => new { Q = g.Key, N = g.Count() })
            .OrderByDescending(x => x.N)
            .Select(x => x.Q)
            .FirstOrDefaultAsync(ct) ?? "N/A";

        var topCategory   = DeriveTopCategory(queryTexts);
        var topProject    = DeriveTopProjectType(queryTexts);
        var radar         = BuildOpportunityRadar(queryTexts, []);
        var topTrend      = radar.FirstOrDefault();

        var apiKey = config["Anthropic:ApiKey"] ?? string.Empty;
        if (string.IsNullOrWhiteSpace(apiKey) || sessions == 0)
        {
            var fallback = sessions == 0
                ? "No conversation activity recorded yet. The BEGA AI Product Advisor is live and ready to capture insights as users begin interacting with the platform."
                : GenerateFallbackBrief(sessions, leads, convRate, topCategory, topProject, topTrend?.topic);
            _briefCache = fallback;
            _briefCachedAt = DateTime.UtcNow;
            return Results.Ok(new { text = fallback, generatedAt = _briefCachedAt, cached = false });
        }

        var prompt = $"""
            You are a business intelligence analyst for BEGA, a premium architectural lighting brand.
            Based on the following 30-day analytics from the BEGA AI Product Advisor, write a concise executive brief (3-4 sentences, business-report style, no bullet points):

            - Total AI conversations: {sessions}
            - Leads captured this month: {leads}
            - Lead conversion rate: {convRate}%
            - Most requested product category: {topCategory}
            - Most common project type: {topProject}
            - Most frequently asked: "{(topQuery.Length > 80 ? topQuery[..80] + "…" : topQuery)}"
            {(topTrend != null ? $"- Fastest-growing specification trend: {topTrend.topic} (up {topTrend.growth}% week-over-week)" : "")}

            Write in active, confident business language. Identify the key opportunity. End with one actionable recommendation. Do not fabricate statistics beyond what is provided. Do not mention that this was AI-generated.
            """;

        try
        {
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("x-api-key", apiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            var model = config["Anthropic:Model"] switch
            {
                "haiku"  => "claude-haiku-4-5-20251001",
                "sonnet" => "claude-sonnet-4-6",
                "opus"   => "claude-opus-4-8",
                var m when !string.IsNullOrEmpty(m) => m,
                _ => "claude-haiku-4-5-20251001",
            };

            var body = JsonSerializer.Serialize(new
            {
                model,
                max_tokens = 350,
                messages   = new[] { new { role = "user", content = prompt } }
            });

            var response = await client.PostAsync(
                "https://api.anthropic.com/v1/messages",
                new StringContent(body, Encoding.UTF8, "application/json"), ct);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(json);
                var text = doc.RootElement
                    .GetProperty("content")[0]
                    .GetProperty("text")
                    .GetString() ?? string.Empty;

                _briefCache   = text;
                _briefCachedAt = DateTime.UtcNow;
                return Results.Ok(new { text, generatedAt = _briefCachedAt, cached = false });
            }
        }
        catch { /* fall through to fallback */ }

        var fb = GenerateFallbackBrief(sessions, leads, convRate, topCategory, topProject, topTrend?.topic);
        _briefCache   = fb;
        _briefCachedAt = DateTime.UtcNow;
        return Results.Ok(new { text = fb, generatedAt = _briefCachedAt, cached = false });
    }

    // ── Lead Intelligence ──────────────────────────────────────────────────────

    private static async Task<IResult> GetLeadsAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var now      = DateTime.UtcNow;
        var cutoff30 = now.AddDays(-30);
        var cutoff7  = now.AddDays(-7);

        var totalSessions    = await db.ChatSessions.CountAsync(ct);
        var activeSessions   = await db.ChatSessions.Where(s => s.MessagesJson != "[]" && s.MessagesJson.Length > 10).CountAsync(ct);
        var totalInteractions = await db.AnalyticsEvents
            .Where(e => e.EventType != "query").CountAsync(ct);
        var totalLeads        = await db.ContactInquiries.CountAsync(ct);
        var newLeads          = await db.ContactInquiries.Where(l => l.CreatedAt >= cutoff7).CountAsync(ct);
        var prevLeads         = await db.ContactInquiries.Where(l => l.CreatedAt >= cutoff30 && l.CreatedAt < cutoff7).CountAsync(ct);

        var convRate     = totalSessions > 0 ? Math.Round((double)totalLeads / totalSessions * 100, 1) : 0.0;
        var prevConvRate = (totalSessions - activeSessions) > 0
            ? Math.Round((double)prevLeads / Math.Max(totalSessions - activeSessions, 1) * 100, 1) : 0.0;

        // Recent leads (last 10) — fetch raw then project in memory to avoid EF expression-tree limits
        var rawLeads = await db.ContactInquiries
            .OrderByDescending(l => l.CreatedAt)
            .Take(10)
            .Select(l => new { l.Name, l.Email, l.Query, l.CreatedAt })
            .ToListAsync(ct);

        var recentLeads = rawLeads.Select(l => new
        {
            name    = l.Name,
            email   = l.Email,
            preview = l.Query.Length > 80 ? l.Query[..80] + "…" : l.Query,
            date    = l.CreatedAt.ToString("MMM d, HH:mm"),
        }).ToList();

        // Top lead queries
        var topLeadQueries = await db.ContactInquiries
            .Where(l => l.Query != null && l.Query.Length > 5)
            .GroupBy(l => l.Query.ToLower())
            .Select(g => new { query = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(8)
            .ToListAsync(ct);

        // Leads by day (30 days)
        var leadsByDay = await db.ContactInquiries
            .Where(l => l.CreatedAt >= cutoff30)
            .GroupBy(l => l.CreatedAt.Date)
            .Select(g => new { day = g.Key, count = g.Count() })
            .ToListAsync(ct);

        var lMap  = leadsByDay.ToDictionary(x => x.day, x => x.count);
        var days  = Enumerable.Range(0, 30).Select(i => cutoff30.Date.AddDays(i)).Where(d => d <= now.Date).ToList();
        var trend = days.Select(d => new
        {
            date  = d.ToString("MMM d"),
            leads = lMap.TryGetValue(d, out var c) ? c : 0,
        }).ToList();

        return Results.Ok(new
        {
            funnel = new[]
            {
                new { stage = "Total Conversations",   count = totalSessions,    pct = 100.0 },
                new { stage = "Active Engagements",    count = activeSessions,   pct = totalSessions > 0 ? Math.Round((double)activeSessions / totalSessions * 100, 1) : 0 },
                new { stage = "AI Interactions",       count = totalInteractions, pct = totalSessions > 0 ? Math.Round((double)Math.Min(totalInteractions, totalSessions) / totalSessions * 100, 1) : 0 },
                new { stage = "Leads Submitted",       count = totalLeads,       pct = totalSessions > 0 ? Math.Round((double)totalLeads / totalSessions * 100, 1) : 0 },
            },
            metrics = new
            {
                totalLeads,
                newThisWeek  = newLeads,
                conversionRate = convRate,
                trend = Trend(newLeads, prevLeads),
            },
            recentLeads,
            topLeadQueries,
            leadsByDay = trend,
        });
    }

    // ── Lead Table (30-day leads with session link) ───────────────────────────

    private static async Task<IResult> GetLeadTableAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 15,
        [FromQuery] string? temperature = null, [FromQuery] string? source = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        page     = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        // Leads are sessions the AI classified as IsLead — not just form submissions, so an AI-only
        // lead (no Connect with BEGA form) still shows up here, attributed to "Anonymous Visitor".
        var statuses = await db.SessionFunnelStatuses
            .AsNoTracking()
            .Where(s => s.IsFinalized && s.IsLead)
            .OrderByDescending(s => s.FinalizedAt)
            .ToListAsync(ct);

        var sessionIds = statuses.Select(s => s.SessionId.ToString()).ToList();
        var inquiriesBySession = await db.ContactInquiries
            .AsNoTracking()
            .Where(c => sessionIds.Contains(c.SessionId))
            .ToListAsync(ct);
        var inquiryMap = inquiriesBySession
            .GroupBy(c => c.SessionId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(c => c.CreatedAt).First());

        var leads = statuses
        .Where(s =>
        {
            // Drop error-state/gibberish form submissions, but never drop AI-only leads —
            // they have no form query to validate in the first place.
            var sid = s.SessionId.ToString();
            return !inquiryMap.TryGetValue(sid, out var inquiry) || IsValidLeadQuery(inquiry.Query);
        })
        .Select(s =>
        {
            var sid = s.SessionId.ToString();
            inquiryMap.TryGetValue(sid, out var inquiry);
            var brief = inquiry?.Query ?? s.Summary ?? string.Empty;
            return new
            {
                id            = inquiry?.InquiryId ?? 0,
                sessionId     = sid,
                name          = inquiry?.Name ?? "Anonymous Visitor",
                email         = inquiry?.Email ?? string.Empty,
                query         = brief,
                preview       = brief.Length > 120 ? brief[..120] + "…" : brief,
                date          = (s.FinalizedAt ?? s.CreatedAt).ToString("MMM d, yyyy · HH:mm"),
                temperature   = s.LeadTemperature ?? "cold",
                source        = inquiry?.Source,
                company       = inquiry?.Company,
                // Raw JSON strings — frontend parses with JSON.parse, same pattern as
                // ColorTemperatureOption/ProductOptions parsing elsewhere in the codebase.
                shortlistJson = inquiry?.ShortlistJson,
                bomReportJson = inquiry?.BomReportJson,
            };
        })
        .Where(l => temperature is null || l.temperature == temperature)
        .Where(l => source is null || l.source == source)
        .Where(l => string.IsNullOrWhiteSpace(search) ||
            l.name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
            l.email.Contains(search, StringComparison.OrdinalIgnoreCase) ||
            l.query.Contains(search, StringComparison.OrdinalIgnoreCase))
        .ToList();

        var total = leads.Count;
        var page_ = leads.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Results.Ok(new { leads = page_, count = total, total, page, pageSize });
    }

    // ── Conversation & Logs ───────────────────────────────────────────────────

    private static async Task<IResult> GetConversationsAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 15,
        [FromQuery] string? stage = null, [FromQuery] string? temperature = null,
        [FromQuery] bool? isLead = null, [FromQuery] string? search = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        page     = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.SessionFunnelStatuses.AsNoTracking().Where(s => s.IsFinalized);
        if (!string.IsNullOrWhiteSpace(stage))       query = query.Where(s => s.FunnelStage == stage);
        if (!string.IsNullOrWhiteSpace(temperature)) query = query.Where(s => s.LeadTemperature == temperature);
        if (isLead.HasValue)                         query = query.Where(s => s.IsLead == isLead.Value);
        if (from.HasValue)                           query = query.Where(s => s.FinalizedAt >= from.Value);
        if (to.HasValue)                              query = query.Where(s => s.FinalizedAt <= to.Value);

        var statuses = await query.OrderByDescending(s => s.FinalizedAt).ToListAsync(ct);

        var sessionIds = statuses.Select(s => s.SessionId).ToList();
        var sessionIdStrs = sessionIds.Select(g => g.ToString()).ToList();

        var sessions = await db.ChatSessions.AsNoTracking()
            .Where(c => sessionIds.Contains(c.SessionId))
            .Select(c => new { c.SessionId, c.LastActivityAt, c.MessagesJson })
            .ToListAsync(ct);
        var sessionMap = sessions.ToDictionary(s => s.SessionId);

        var inquiries = await db.ContactInquiries.AsNoTracking()
            .Where(c => sessionIdStrs.Contains(c.SessionId))
            .ToListAsync(ct);
        var inquiryMap = inquiries
            .GroupBy(c => c.SessionId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(c => c.CreatedAt).First());

        var items = statuses.Select(s =>
        {
            sessionMap.TryGetValue(s.SessionId, out var session);
            inquiryMap.TryGetValue(s.SessionId.ToString(), out var inquiry);
            int messageCount = 0;
            if (session is not null)
            {
                try { messageCount = JsonSerializer.Deserialize<List<object>>(session.MessagesJson)?.Count ?? 0; }
                catch (JsonException) { messageCount = 0; }
            }
            return new
            {
                sessionId      = s.SessionId.ToString(),
                name           = inquiry?.Name ?? "Anonymous Visitor",
                email          = inquiry?.Email,
                stage          = s.FunnelStage,
                isLead         = s.IsLead,
                temperature    = s.LeadTemperature,
                summary        = s.Summary,
                messageCount,
                lastActivityAt = session?.LastActivityAt ?? s.FinalizedAt ?? s.CreatedAt,
            };
        })
        .Where(c => string.IsNullOrWhiteSpace(search) ||
            c.name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
            (c.email != null && c.email.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
            (c.summary != null && c.summary.Contains(search, StringComparison.OrdinalIgnoreCase)))
        .ToList();

        var total = items.Count;
        var page_ = items.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Results.Ok(new { items = page_, total, page, pageSize });
    }

    // ── Conversion Funnel: Query → Product Viewed → Shortlisted → BOM Generated → Lead Captured ──

    private static readonly string[] FunnelStageOrder  = ["query", "product_viewed", "shortlisted", "bom_generated", "lead_captured"];
    private static readonly string[] FunnelStageLabels = ["Query", "Product Viewed", "Shortlisted", "BOM Generated", "Lead Captured"];

    private static async Task<IResult> GetFunnelAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config,
        [FromQuery] string range = "30D", CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var (cutoff, _) = Range(range);

        // Each session is classified into exactly ONE highest stage reached (set once the
        // session ends, by SessionFinalizationService) — no double-counting across stages.
        // Reconstruct the classic decreasing funnel by summing forward: a session's final
        // stage implicitly means it also passed through every earlier stage.
        var rawCounts = await db.SessionFunnelStatuses
            .Where(s => s.IsFinalized)
            .Join(db.ChatSessions, s => s.SessionId, c => c.SessionId, (s, c) => new { s.FunnelStage, c.CreatedAt })
            .Where(x => x.CreatedAt >= cutoff)
            .GroupBy(x => x.FunnelStage)
            .Select(g => new { stage = g.Key, count = g.Count() })
            .ToListAsync(ct);

        var rawMap = rawCounts.ToDictionary(x => x.stage, x => x.count);

        var counts = new int[FunnelStageOrder.Length];
        for (var i = 0; i < FunnelStageOrder.Length; i++)
            for (var j = i; j < FunnelStageOrder.Length; j++)
                counts[i] += rawMap.GetValueOrDefault(FunnelStageOrder[j], 0);

        var names = FunnelStageLabels;

        double? DropOff(int prevCount, int currCount) =>
            prevCount > 0 ? Math.Round((1 - (double)currCount / Math.Max(prevCount, 1)) * 100, 1) : (double?)null;

        var stages = new List<object>();
        string? worstStage = null;
        var worstDropOff = -1.0;

        for (var i = 0; i < counts.Length; i++)
        {
            double? dropOffPct = i == 0 ? null : DropOff(counts[i - 1], counts[i]);
            stages.Add(new { stage = names[i], count = counts[i], dropOffPct });

            if (dropOffPct.HasValue && dropOffPct.Value > worstDropOff)
            {
                worstDropOff = dropOffPct.Value;
                worstStage = $"{names[i - 1]} → {names[i]}";
            }
        }

        return Results.Ok(new
        {
            stages,
            worstDropOffStage = worstStage,
            range,
        });
    }

    // ── Product Intelligence ───────────────────────────────────────────────────

    private static async Task<IResult> GetProductsAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var cutoff30 = DateTime.UtcNow.AddDays(-30);
        var cutoff7  = DateTime.UtcNow.AddDays(-7);

        var allQueries  = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var recent7d    = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff7 && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var prev7d      = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= DateTime.UtcNow.AddDays(-14) && e.CreatedAt < cutoff7 && e.Name != null).Select(e => e.Name!).ToListAsync(ct);

        var categories = new Dictionary<string, string[]>
        {
            ["Exterior Lighting"] = ["exterior", "outdoor", "in-grade", "facade", "bollard", "pathway", "landscape"],
            ["Interior Lighting"] = ["interior", "indoor", "ceiling", "recessed", "wall", "downlight"],
            ["Controls & DALI"]   = ["dali", "control", "dim", "smart", "automation", "0-10v", "sensor"],
            ["Furniture"]         = ["bench", "seating", "urban", "furniture", "planter", "litter"],
            ["Special Compliance"]= ["dark sky", "ada", "ip66", "ip65", "marine", "waterproof"],
        };

        var catCounts = categories.Select(kv => new
        {
            category = kv.Key,
            mentions = allQueries.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
            recent   = recent7d.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
            prev     = prev7d.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
        }).Where(x => x.mentions > 0).OrderByDescending(x => x.mentions).ToList();

        var total = catCounts.Sum(c => c.mentions);
        var categoryData = catCounts.Select(c => new
        {
            c.category,
            c.mentions,
            share  = total > 0 ? Math.Round((double)c.mentions / total * 100, 1) : 0.0,
            growth = Trend(c.recent, c.prev),
        }).ToList();

        // Comparison detection
        var comparisons = allQueries
            .Where(q => ContainsAny(q.ToLower(), " vs ", "versus", "compar", "difference", "between"))
            .GroupBy(q => NormalizeQuery(q))
            .Select(g => new { pattern = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(8)
            .ToList();

        // Product families mentioned (from Products table)
        var families = await db.Products
            .GroupBy(p => p.FamilyName)
            .Select(g => new { family = g.Key, count = g.Count() })
            .ToListAsync(ct);

        var familyMentions = families.Select(f => new
        {
            f.family,
            mentioned = allQueries.Count(q => q.Contains(f.family, StringComparison.OrdinalIgnoreCase)),
        }).Where(x => x.mentioned > 0).OrderByDescending(x => x.mentioned).Take(10).ToList();

        return Results.Ok(new
        {
            categories    = categoryData,
            comparisons   = comparisons.Cast<object>().ToList(),
            familyDemand  = familyMentions,
            totalQueries  = allQueries.Count,
        });
    }

    // ── Specification Intelligence ────────────────────────────────────────────

    private static async Task<IResult> GetSpecificationsAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var cutoff7  = DateTime.UtcNow.AddDays(-7);
        var cutoff14 = DateTime.UtcNow.AddDays(-14);

        var all     = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var recent  = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff7 && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var prev    = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff14 && e.CreatedAt < cutoff7 && e.Name != null).Select(e => e.Name!).ToListAsync(ct);

        var projectTypes = new Dictionary<string, string[]>
        {
            ["Hospitality"]  = ["hotel", "hospitality", "resort", "restaurant", "lounge", "bar"],
            ["Commercial"]   = ["office", "commercial", "retail", "corporate", "mall", "shopping"],
            ["Campus"]       = ["campus", "university", "school", "college", "hospital", "clinic"],
            ["Landscape"]    = ["garden", "landscape", "park", "pathway", "botanical", "water feature"],
            ["Residential"]  = ["villa", "home", "residential", "house", "driveway", "terrace"],
            ["Urban/Public"] = ["urban", "public", "plaza", "street", "pedestrian", "municipality"],
            ["Healthcare"]   = ["hospital", "clinic", "medical", "healthcare"],
        };

        var typeDist = projectTypes.Select(kv => new
        {
            type     = kv.Key,
            count    = all.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
            recent   = recent.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
            previous = prev.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
        }).Where(x => x.count > 0).OrderByDescending(x => x.count).ToList();

        var typeTotal = typeDist.Sum(t => t.count);
        var projectTypeData = typeDist.Select(t => new
        {
            t.type,
            t.count,
            share  = typeTotal > 0 ? Math.Round((double)t.count / typeTotal * 100, 1) : 0.0,
            growth = Trend(t.recent, t.previous),
        }).ToList();

        var stages = new Dictionary<string, string[]>
        {
            ["Research"]      = ["what", "tell me", "explain", "overview", "introduction", "options", "what is"],
            ["Design"]        = ["recommend", "suggest", "best for", "ideal", "perfect", "suit", "match"],
            ["Specification"] = ["spec", "specification", "technical", "lumen", "watt", "beam", "voltage", "dimension"],
            ["Comparison"]    = ["compare", "vs", "versus", "difference", "better", "between"],
            ["Procurement"]   = ["price", "cost", "dnp", "lead time", "availability", "order", "bom", "quote"],
        };

        var stageDist = stages.Select(kv => new
        {
            stage  = kv.Key,
            count  = all.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
        }).Where(x => x.count > 0).OrderByDescending(x => x.count).ToList();

        var specTerms = new[]
        {
            "Dark Sky", "DALI", "IP66", "IP65", "ADA", "2700K", "3000K", "3500K", "4000K",
            "24V DC", "RGBW", "Tunable White", "Marine Grade", "Express Delivery",
            "Sustainability", "Carbon", "LEED", "Smart", "0-10V",
        };

        var emerging = specTerms.Select(term => new
        {
            term,
            total   = all.Count(q => q.Contains(term, StringComparison.OrdinalIgnoreCase)),
            r       = recent.Count(q => q.Contains(term, StringComparison.OrdinalIgnoreCase)),
            p       = prev.Count(q => q.Contains(term, StringComparison.OrdinalIgnoreCase)),
        }).Where(x => x.total > 0)
          .Select(x => new
          {
              x.term,
              x.total,
              growth = Trend(x.r, x.p),
          })
          .OrderByDescending(x => x.growth)
          .ThenByDescending(x => x.total)
          .Take(10)
          .ToList();

        return Results.Ok(new
        {
            projectTypes = projectTypeData,
            stages       = stageDist,
            emerging     = emerging.Cast<object>().ToList(),
        });
    }

    // ── Content Intelligence ──────────────────────────────────────────────────

    private static async Task<IResult> GetContentIntelligenceAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var cutoff30 = DateTime.UtcNow.AddDays(-30);

        // Repeated queries = potential content gaps. Capped to 5 for the High-Frequency
        // Queries widget — this is a focused "top priorities" list, not an exhaustive log.
        var repeatedQueries = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .GroupBy(e => e.Name!)
            .Where(g => g.Count() >= 2)
            .Select(g => new { query = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(5)
            .ToListAsync(ct);

        // Priority scoring: frequency × recency weight
        var prioritised = repeatedQueries.Select((q, i) => new
        {
            q.query,
            q.count,
            priority    = q.count >= 5 ? "high" : q.count >= 3 ? "medium" : "low",
            priorityScore = q.count * 10,
        }).ToList();

        // Content gap opportunities — derived from high-frequency query topics
        var all = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .Select(e => e.Name!).ToListAsync(ct);

        var gapTopics = new (string topic, string[] keywords, string action)[]
        {
            ("Installation Guides",     ["install", "mount", "wire", "connect", "setup"],    "Create installation FAQ"),
            ("IP Rating Guidance",      ["ip66", "ip65", "ip67", "waterproof", "rating"],    "Add IP rating guide"),
            ("DALI Programming Help",   ["dali", "program", "address", "configure"],         "Create DALI setup guide"),
            ("Color Temperature Guide", ["2700k", "3000k", "3500k", "4000k", "kelvin", "cct"], "Publish CCT selection guide"),
            ("Dark Sky Compliance",     ["dark sky", "ies", "uplight", "glare"],             "Feature Dark Sky compliance hub"),
            ("Budget Planning",         ["price", "cost", "budget", "expensive", "affordable"], "Add budget planning tool"),
            ("Product Comparison",      ["vs", "compare", "difference", "versus"],           "Build comparison widget"),
        };

        var gaps = gapTopics
            .Select(g => new
            {
                topic   = g.topic,
                demand  = all.Count(q => g.keywords.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
                action  = g.action,
            })
            .Where(x => x.demand > 0)
            .OrderByDescending(x => x.demand)
            .ToList();

        // All active CMS suggestions joined with their real click counts
        var cmsSuggestions = await db.CmsSuggestions
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .Select(s => s.Text)
            .ToListAsync(ct);

        var clickCounts = await db.AnalyticsEvents
            .Where(e => e.EventType == "suggestion_click" && e.Name != null)
            .GroupBy(e => e.Name!)
            .Select(g => new { text = g.Key, clicks = g.Count() })
            .ToListAsync(ct);

        var clickMap = clickCounts.ToDictionary(c => c.text, c => c.clicks, StringComparer.OrdinalIgnoreCase);

        var topSuggestions = cmsSuggestions
            .Select(text => new { text, clicks = clickMap.GetValueOrDefault(text, 0) })
            .OrderByDescending(s => s.clicks)
            .Take(10)
            .Cast<object>()
            .ToList();

        return Results.Ok(new
        {
            repeatedQueries  = prioritised,
            contentGaps      = gaps,
            topSuggestions,
            totalAnalysed    = all.Count,
        });
    }

    // ── Opportunity Center ────────────────────────────────────────────────────

    private static async Task<IResult> GetOpportunitiesAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var now       = DateTime.UtcNow;
        var cutoff7   = now.AddDays(-7);
        var cutoff14  = now.AddDays(-14);
        var cutoff30  = now.AddDays(-30);

        var recent = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff7  && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var prev   = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff14 && e.CreatedAt < cutoff7 && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var all    = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null).Select(e => e.Name!).ToListAsync(ct);

        var leads      = await db.ContactInquiries.Where(l => l.CreatedAt >= cutoff30).CountAsync(ct);
        var sessions   = await db.ChatSessions.Where(s => s.CreatedAt >= cutoff30).CountAsync(ct);
        var convRate   = sessions > 0 ? Math.Round((double)leads / sessions * 100, 1) : 0.0;

        var cards = new List<object>();

        // ── Trend-based opportunities ──────────────────────────────────────────
        var specTerms = new[]
        {
            ("Dark Sky Compliance", "dark sky"),
            ("DALI Controls",       "dali"),
            ("Hospitality Lighting","hotel"),
            ("Campus Lighting",     "campus"),
            ("Marine Grade",        "marine"),
            ("IP66 / IP67 Demand",  "ip6"),
            ("Tunable White",       "tunable"),
            ("Smart Controls",      "smart"),
            ("Sustainability",      "sustainab"),
            ("2700K Warm White",    "2700k"),
        };

        foreach (var (label, keyword) in specTerms)
        {
            var r = recent.Count(q => q.Contains(keyword, StringComparison.OrdinalIgnoreCase));
            var p = prev.Count(q => q.Contains(keyword, StringComparison.OrdinalIgnoreCase));
            var totalMentions = all.Count(q => q.Contains(keyword, StringComparison.OrdinalIgnoreCase));
            if (totalMentions < 1) continue;

            var growth = Trend(r, p);
            if (growth < 0 || r < 1) continue;

            var priority = Math.Min(99, (int)(50 + growth * 0.3 + r * 5));
            cards.Add(new
            {
                category = "SALES",
                title    = $"{label} demand is growing",
                evidence = $"{totalMentions} queries mention {label.ToLower()} in the last 30 days, up {(int)Math.Max(growth, 0)}% week-over-week.",
                action   = $"Feature {label} solutions prominently in product discovery and homepage content.",
                priority,
                growth   = (int)Math.Max(growth, 0),
            });
        }

        // ── Lead conversion opportunity ────────────────────────────────────────
        if (sessions >= 5 && convRate < 10)
        {
            cards.Add(new
            {
                category = "REVENUE",
                title    = "Lead conversion rate has room to grow",
                evidence = $"{sessions} conversations generated only {leads} leads ({convRate}% conversion). Industry benchmark for AI-assisted B2B is 12–18%.",
                action   = "Add a proactive \"Connect with BEGA\" prompt after the third AI response to capture higher-intent leads earlier.",
                priority = 88,
                growth   = 0,
            });
        }

        // ── Content gap opportunity ────────────────────────────────────────────
        var installMentions = all.Count(q => ContainsAny(q.ToLower(), "install", "mount", "wire", "setup"));
        if (installMentions >= 3)
        {
            cards.Add(new
            {
                category = "CONTENT",
                title    = "Installation guidance is frequently requested",
                evidence = $"{installMentions} queries ask about installation, mounting, or wiring — topics not in the AI product catalog.",
                action   = "Create a technical FAQ covering common installation scenarios for in-grade, wall, and ceiling luminaires.",
                priority = 75,
                growth   = 0,
            });
        }

        // ── Product demand opportunity ─────────────────────────────────────────
        var exteriorCount = all.Count(q => ContainsAny(q.ToLower(), "exterior", "outdoor", "facade"));
        var interiorCount = all.Count(q => ContainsAny(q.ToLower(), "interior", "indoor", "ceiling"));
        if (exteriorCount > interiorCount * 2 && exteriorCount >= 5)
        {
            cards.Add(new
            {
                category = "PRODUCT",
                title    = "Exterior products dominate demand",
                evidence = $"Exterior lighting queries ({exteriorCount}) outpace interior ({interiorCount}) by {(int)((double)exteriorCount / Math.Max(interiorCount, 1) * 100 - 100)}%. Users are primarily specifying outdoor applications.",
                action   = "Prioritise exterior product completeness in the AI knowledge base and expand outdoor application coverage.",
                priority = 70,
                growth   = 0,
            });
        }

        // ── AI quality opportunity ─────────────────────────────────────────────
        var repeated = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .GroupBy(e => e.Name!)
            .Where(g => g.Count() >= 3)
            .CountAsync(ct);
        if (repeated >= 3)
        {
            cards.Add(new
            {
                category = "AI QUALITY",
                title    = $"{repeated} queries asked 3+ times without resolution",
                evidence = $"Repeated queries suggest the AI is not fully satisfying these information needs — a knowledge gap or disambiguation issue.",
                action   = "Review the top repeated queries and expand relevant product chunks or create targeted response templates.",
                priority = 65,
                growth   = 0,
            });
        }

        // Sort by priority descending
        var sorted = cards
            .Cast<dynamic>()
            .OrderByDescending(c => (int)c.priority)
            .ToList<object>();

        return Results.Ok(new
        {
            cards  = sorted,
            total  = sorted.Count,
            hasData = all.Count > 0,
        });
    }

    // ── Network Graph Data ────────────────────────────────────────────────────

    private static async Task<IResult> GetNetworkAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var cutoff30 = DateTime.UtcNow.AddDays(-30);

        var queries = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .Select(e => e.Name!)
            .ToListAsync(ct);

        var leads = await db.ContactInquiries
            .Where(l => l.CreatedAt >= cutoff30)
            .Select(l => new { l.Query, l.CreatedAt })
            .ToListAsync(ct);

        if (!queries.Any() && !leads.Any())
            return Results.Ok(new { nodes = Array.Empty<object>(), edges = Array.Empty<object>() });

        var categoryDefs = new (string id, string label, string[] kw, string color)[]
        {
            ("cat-exterior",  "Exterior",   ["exterior","outdoor","facade","bollard","in-grade"],  "#1A1A1A"),
            ("cat-interior",  "Interior",   ["interior","indoor","ceiling","recessed"],             "#5A5750"),
            ("cat-controls",  "Controls",   ["dali","control","dim","automation","smart"],          "#9A9590"),
            ("cat-spec",      "Specs",      ["lumen","watt","beam","kelvin","cct","voltage"],       "#B5A99A"),
            ("cat-project",   "Projects",   ["hotel","campus","villa","hospital","park","urban"],   "#C8C4BE"),
            ("cat-compliance","Compliance", ["dark sky","ip66","ip65","ada","marine","green"],      "#DEDAD5"),
        };

        var nodes = new List<object>();
        var edges = new List<object>();

        // Category nodes
        foreach (var cat in categoryDefs)
        {
            var count = queries.Count(q => cat.kw.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase)));
            if (count == 0) continue;
            nodes.Add(new { id = cat.id, label = cat.label, type = "category", size = Math.Min(count * 3 + 15, 50), color = cat.color, count });
        }

        // Topic nodes (high-frequency terms)
        var topicTerms = new[] { "Dark Sky", "DALI", "Hospitality", "Landscape", "2700K", "IP66", "Marine", "Smart" };
        foreach (var term in topicTerms)
        {
            var count = queries.Count(q => q.Contains(term, StringComparison.OrdinalIgnoreCase));
            if (count == 0) continue;
            var nodeId = $"topic-{term.ToLower().Replace(" ", "-")}";
            nodes.Add(new { id = nodeId, label = term, type = "topic", size = Math.Min(count * 2 + 8, 30), color = "#5A5750", count });

            // Connect to related categories
            foreach (var cat in categoryDefs)
            {
                if (cat.kw.Any(k => term.Contains(k, StringComparison.OrdinalIgnoreCase) || k.Contains(term.ToLower(), StringComparison.OrdinalIgnoreCase)))
                    edges.Add(new { source = nodeId, target = cat.id, weight = count });
            }
        }

        // Lead nodes
        for (int i = 0; i < Math.Min(leads.Count, 8); i++)
        {
            var lead = leads[i];
            var nodeId = $"lead-{i}";
            nodes.Add(new { id = nodeId, label = "Lead", type = "lead", size = 10, color = "#B5A99A", count = 1 });

            // Connect lead to matching categories
            foreach (var cat in categoryDefs)
            {
                if (cat.kw.Any(k => lead.Query.Contains(k, StringComparison.OrdinalIgnoreCase)))
                    edges.Add(new { source = nodeId, target = cat.id, weight = 2 });
            }
        }

        return Results.Ok(new { nodes, edges });
    }

    // ── Geographic Intelligence ────────────────────────────────────────────────
    // Built entirely from real ContactInquiries rows geocoded at quote-request time
    // (RequestQuoteDrawer → Nominatim → ContactEndpoints) — no fabricated locations.

    private static async Task<IResult> GetGeographyAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();
        return Results.Ok(await BuildGeographyDataAsync(db, ct));
    }

    private static async Task<object> BuildGeographyDataAsync(AppDbContext db, CancellationToken ct)
    {
        var totalInquiries = await db.ContactInquiries.CountAsync(ct);

        var geotagged = await db.ContactInquiries
            .Where(c => c.Country != null && c.Latitude != null && c.Longitude != null)
            .Select(c => new { c.Country, c.CountryCode, c.City, c.Latitude, c.Longitude })
            .ToListAsync(ct);

        var totalGeotagged = geotagged.Count;

        var countries = geotagged
            .GroupBy(c => new { c.Country, c.CountryCode })
            .Select(g => new { country = g.Key.Country!, countryCode = g.Key.CountryCode, count = g.Count() })
            .OrderByDescending(c => c.count)
            .Select(c => new
            {
                c.country,
                c.countryCode,
                c.count,
                pct = totalGeotagged > 0 ? Math.Round((double)c.count / totalGeotagged * 100, 1) : 0.0,
            })
            .ToList();

        var cities = geotagged
            .Where(c => c.City != null)
            .GroupBy(c => new { c.City, c.Country, c.Latitude, c.Longitude })
            .Select(g => new
            {
                city    = g.Key.City!,
                country = g.Key.Country!,
                lat     = g.Key.Latitude!.Value,
                lon     = g.Key.Longitude!.Value,
                count   = g.Count(),
            })
            .OrderByDescending(c => c.count)
            .Take(50)
            .ToList();

        return new { countries, cities, totalGeotagged, totalInquiries };
    }

    // ── Dashboard (landing page) ──────────────────────────────────────────────
    // Composed from the same data sources/keyword taxonomies as the dedicated tabs above —
    // no separate tracking pipeline, just a single round-trip aggregation for the landing page.

    private static async Task<IResult> GetDashboardAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        var now      = DateTime.UtcNow;
        var cutoff7  = now.AddDays(-7);
        var cutoff14 = now.AddDays(-14);
        var cutoff30 = now.AddDays(-30);

        // ── KPIs ──────────────────────────────────────────────────────────────
        var totalQueries     = await db.AnalyticsEvents.Where(e => e.EventType == "query").CountAsync(ct);
        var prevWeekQueries  = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff14 && e.CreatedAt < cutoff7).CountAsync(ct);
        var thisWeekQueries  = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff7).CountAsync(ct);

        var highIntentQueries    = await db.SessionFunnelStatuses.Where(s => s.IsFinalized && s.IsLead && s.LeadTemperature == "hot").CountAsync(ct);
        var prevHighIntent       = await db.SessionFunnelStatuses.Where(s => s.IsFinalized && s.IsLead && s.LeadTemperature == "hot" && s.FinalizedAt >= cutoff14 && s.FinalizedAt < cutoff7).CountAsync(ct);
        var thisWeekHighIntent   = await db.SessionFunnelStatuses.Where(s => s.IsFinalized && s.IsLead && s.LeadTemperature == "hot" && s.FinalizedAt >= cutoff7).CountAsync(ct);

        var suggestionsClicked      = await db.AnalyticsEvents.Where(e => e.EventType == "suggestion_click").CountAsync(ct);
        var prevWeekClicks          = await db.AnalyticsEvents.Where(e => e.EventType == "suggestion_click" && e.CreatedAt >= cutoff14 && e.CreatedAt < cutoff7).CountAsync(ct);
        var thisWeekClicks          = await db.AnalyticsEvents.Where(e => e.EventType == "suggestion_click" && e.CreatedAt >= cutoff7).CountAsync(ct);

        var all30 = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var gapTopics = new (string topic, string[] keywords)[]
        {
            ("Installation Guides",     ["install", "mount", "wire", "connect", "setup"]),
            ("IP Rating Guidance",      ["ip66", "ip65", "ip67", "waterproof", "rating"]),
            ("DALI Programming Help",   ["dali", "program", "address", "configure"]),
            ("Color Temperature Guide", ["2700k", "3000k", "3500k", "4000k", "kelvin", "cct"]),
            ("Dark Sky Compliance",     ["dark sky", "ies", "uplight", "glare"]),
            ("Budget Planning",         ["price", "cost", "budget", "expensive", "affordable"]),
            ("Product Comparison",      ["vs", "compare", "difference", "versus"]),
        };
        var contentGapsFound = gapTopics.Count(g => all30.Any(q => g.keywords.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))));

        var kpis = new
        {
            totalQueries,
            totalQueriesTrend     = Trend(thisWeekQueries, prevWeekQueries),
            highIntentQueries,
            highIntentTrend       = Trend(thisWeekHighIntent, prevHighIntent),
            suggestionsClicked,
            suggestionsClickedTrend = Trend(thisWeekClicks, prevWeekClicks),
            contentGapsFound,
        };

        // ── High-frequency queries (top 5) ───────────────────────────────────
        var highFrequencyQueries = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .GroupBy(e => e.Name!)
            .Where(g => g.Count() >= 2)
            .Select(g => new { query = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(5)
            .ToListAsync(ct);
        var highFreq = highFrequencyQueries.Select(q => new
        {
            q.query,
            q.count,
            priority = q.count >= 5 ? "high" : q.count >= 3 ? "medium" : "low",
        }).ToList();

        // ── AI recommendations (top 3 opportunity cards) ─────────────────────
        var recent7  = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff7  && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var prev7    = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff14 && e.CreatedAt < cutoff7 && e.Name != null).Select(e => e.Name!).ToListAsync(ct);
        var specTerms = new[]
        {
            ("Dark Sky Compliance", "dark sky"), ("DALI Controls", "dali"), ("Hospitality Lighting", "hotel"),
            ("Campus Lighting", "campus"), ("Coastal Installation", "coastal"), ("IP66 / IP67 Demand", "ip6"),
        };
        var aiRecommendations = specTerms
            .Select(t => new
            {
                title    = $"Create {t.Item1} Guide",
                evidence = all30.Count(q => q.Contains(t.Item2, StringComparison.OrdinalIgnoreCase)),
                growth   = Trend(recent7.Count(q => q.Contains(t.Item2, StringComparison.OrdinalIgnoreCase)), prev7.Count(q => q.Contains(t.Item2, StringComparison.OrdinalIgnoreCase))),
            })
            .Where(x => x.evidence > 0)
            .OrderByDescending(x => x.growth)
            .ThenByDescending(x => x.evidence)
            .Take(3)
            .Select(x => new
            {
                x.title,
                detectedQueries = x.evidence,
                potentialImpactPct = (int)Math.Max(x.growth, 5),
                priority = x.evidence >= 5 ? "High Priority" : "Medium Priority",
            })
            .ToList();

        // ── Search trend (last 7 days) ────────────────────────────────────────
        var qByDay = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff7)
            .GroupBy(e => e.CreatedAt.Date)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var qMap = qByDay.ToDictionary(x => x.Day, x => x.Count);
        var searchTrend = Enumerable.Range(0, 7)
            .Select(i => cutoff7.Date.AddDays(i))
            .Where(d => d <= now.Date)
            .Select(d => new { date = d.ToString("MMM d"), queries = qMap.TryGetValue(d, out var c) ? c : 0 })
            .ToList();

        // ── Top categories ────────────────────────────────────────────────────
        var categories = new Dictionary<string, string[]>
        {
            ["Outdoor Lighting"] = ["exterior", "outdoor", "in-grade", "facade", "pathway", "landscape"],
            ["Bollard Lights"]   = ["bollard"],
            ["Architectural"]    = ["facade", "architectural", "highlight", "wall wash", "grazing"],
            ["Hotel Lighting"]   = ["hotel", "hospitality", "resort"],
            ["Interior Lighting"]= ["interior", "indoor", "ceiling", "recessed", "downlight"],
        };
        var catCounts = categories.Select(kv => new
        {
            category = kv.Key,
            mentions = all30.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))),
        }).Where(x => x.mentions > 0).OrderByDescending(x => x.mentions).ToList();
        var catTotal = Math.Max(catCounts.Sum(c => c.mentions), 1);
        var topCategories = catCounts.Select(c => new
        {
            c.category,
            c.mentions,
            share = Math.Round((double)c.mentions / catTotal * 100, 1),
        }).ToList();

        // ── Geographic (top 5 countries) ──────────────────────────────────────
        var geography = await BuildGeographyDataAsync(db, ct);

        // ── Opportunity score ──────────────────────────────────────────────────
        // Composite of three real signals, each capped to keep one metric from dominating:
        //   40% query-growth momentum, 30% lead conversion rate, 30% AI-classified hot-lead share.
        var leadsTotal      = await db.ContactInquiries.Where(l => l.CreatedAt >= cutoff30).CountAsync(ct);
        var sessionsTotal   = await db.ChatSessions.Where(s => s.CreatedAt >= cutoff30).CountAsync(ct);
        var convRate        = sessionsTotal > 0 ? (double)leadsTotal / sessionsTotal * 100 : 0.0;
        var leadTempTotal   = await db.SessionFunnelStatuses.Where(s => s.IsFinalized && s.IsLead).CountAsync(ct);
        var highIntentPct   = leadTempTotal > 0 ? (double)highIntentQueries / leadTempTotal * 100 : 0.0;
        var queryGrowthPct  = Trend(thisWeekQueries, prevWeekQueries);

        var opportunityScore = (int)Math.Clamp(
            0.4 * Math.Min(queryGrowthPct + 50, 100) +
            0.3 * Math.Min(convRate * 5, 100) +
            0.3 * Math.Min(highIntentPct, 100),
            0, 100);

        return Results.Ok(new
        {
            kpis,
            highFrequencyQueries = highFreq,
            aiRecommendations,
            searchTrend,
            topCategories,
            geographic = geography,
            contentGaps = gapTopics.Select(g => g.topic)
                .Where(t => all30.Any(q => gapTopics.First(g2 => g2.topic == t).keywords.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))))
                .ToList(),
            opportunityScore,
        });
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private static bool Auth(HttpContext ctx, IConfiguration config)
    {
        var key = config["AdminApiKey"] ?? string.Empty;
        if (string.IsNullOrWhiteSpace(key)) return false;
        ctx.Request.Headers.TryGetValue("X-Admin-Api-Key", out var provided);
        return string.Equals(key, provided.ToString(), StringComparison.Ordinal);
    }

    private static (DateTime cutoff, DateTime prev) Range(string range)
    {
        var now = DateTime.UtcNow;
        return range switch
        {
            "7D"  => (now.AddDays(-7),    now.AddDays(-14)),
            "90D" => (now.AddDays(-90),   now.AddDays(-180)),
            "12M" => (now.AddMonths(-12), now.AddMonths(-24)),
            _     => (now.AddDays(-30),   now.AddDays(-60)),
        };
    }

    private static double Trend(double curr, double prev)
    {
        if (prev == 0) return curr > 0 ? 100 : 0;
        return Math.Round((curr - prev) / prev * 100, 1);
    }

    private static bool ContainsAny(string text, params string[] terms)
        => terms.Any(text.Contains);

    private static string DeriveTopCategory(List<string> queries)
    {
        if (!queries.Any()) return "—";
        var ext = queries.Count(q => ContainsAny(q.ToLower(), "exterior", "outdoor", "in-grade", "bollard", "facade"));
        var itr = queries.Count(q => ContainsAny(q.ToLower(), "interior", "indoor", "recessed", "downlight"));
        if (ext == 0 && itr == 0) return "—";
        return ext >= itr ? "Exterior Lighting" : "Interior Lighting";
    }

    private static string DeriveTopProjectType(List<string> queries)
    {
        if (!queries.Any()) return "—";
        var types = new Dictionary<string, string[]>
        {
            ["Hospitality"]  = ["hotel","hospitality","resort","restaurant"],
            ["Residential"]  = ["villa","home","house","driveway","terrace","residential"],
            ["Commercial"]   = ["office","commercial","retail","corporate"],
            ["Landscape"]    = ["garden","landscape","park","pathway","botanical"],
            ["Campus"]       = ["campus","university","school","hospital"],
        };
        var best = types.MaxBy(kv => queries.Count(q => kv.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase))));
        var count = queries.Count(q => best.Value.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase)));
        return count > 0 ? best.Key : "—";
    }

    private record OpportunityItem(string topic, int growth, int mentions);

    private static List<OpportunityItem> BuildOpportunityRadar(List<string> recent, List<string> previous)
    {
        var topics = new[] { "Dark Sky", "DALI", "Hospitality", "Campus", "Marine", "Smart", "IP66", "2700K", "Tunable" };
        return topics
            .Select(t => new
            {
                topic   = t,
                r       = recent.Count(q => q.Contains(t, StringComparison.OrdinalIgnoreCase)),
                p       = previous.Count(q => q.Contains(t, StringComparison.OrdinalIgnoreCase)),
            })
            .Where(x => x.r > 0)
            .Select(x => new OpportunityItem(x.topic, (int)Math.Max(Trend(x.r, x.p), 0), x.r))
            .OrderByDescending(x => x.growth)
            .ThenByDescending(x => x.mentions)
            .Take(6)
            .ToList();
    }

    // Returns false for clearly non-product submissions: site-error fallbacks,
    // random-character test entries, or queries shorter than a real inquiry.
    private static bool IsValidLeadQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 15) return false;
        var lq = query.ToLower().Trim();

        // System / error-state phrases — user hit the Connect button while the AI was down
        string[] rejectPhrases =
        [
            "why is the site", "site not working", "not working",
            "error is showing", "why error", "site is down",
            "page not loading", "cannot access", "not loading", "why is it not",
        ];
        if (rejectPhrases.Any(p => lq.Contains(p))) return false;

        // Detect random-character gibberish: if the first 20 non-space chars are
        // >82% consonants, it is almost certainly keyboard mashing (dsfsdfsfs, fsfsdfsdf…)
        var sample = new string(lq.Where(c => c != ' ').Take(20).ToArray());
        if (sample.Length >= 8)
        {
            const string vowels = "aeiou";
            var letters    = sample.Count(char.IsLetter);
            var consonants = sample.Count(c => char.IsLetter(c) && !vowels.Contains(c));
            if (letters > 0 && (double)consonants / letters > 0.82) return false;
        }

        return true;
    }

    private static string NormalizeQuery(string q)
    {
        var s = q.ToLower().Trim();
        if (s.Length > 60) s = s[..60];
        return s;
    }

    private static string GenerateFallbackBrief(int sessions, int leads, double convRate, string topCat, string topProject, string? topTrend)
    {
        var sb = new StringBuilder();
        sb.Append($"The BEGA AI Product Advisor has handled {sessions} conversations to date");
        if (leads > 0)
            sb.Append($", converting {leads} into qualified leads at a {convRate}% rate");
        sb.Append(". ");
        if (topCat != "—")
            sb.Append($"{topCat} remains the dominant demand driver, reflecting sustained market interest in BEGA's outdoor portfolio. ");
        if (topProject != "—")
            sb.Append($"The {topProject} segment shows the highest engagement, presenting a targeted opportunity for sales outreach. ");
        if (topTrend != null)
            sb.Append($"Growing interest in {topTrend} represents an emerging specification trend worth prioritising in content and product promotion.");
        return sb.ToString().Trim();
    }

    // ── Lead Insights (AI-powered opportunity feed) ───────────────────────────

    private static async Task<IResult> GetLeadInsightsAsync(
        HttpContext ctx, AppDbContext db, IConfiguration config,
        IHttpClientFactory httpFactory, IWebHostEnvironment env,
        CancellationToken ct = default)
    {
        if (!Auth(ctx, config)) return Results.Unauthorized();

        // Live metrics are always cheap and always fresh (shown in the banner)
        var totalSessions = await db.ChatSessions.CountAsync(ct);
        var totalLeads    = await db.ContactInquiries.CountAsync(ct);
        var convRate      = totalSessions > 0
            ? Math.Round((double)totalLeads / totalSessions * 100, 1) : 0.0;

        if (totalLeads == 0)
        {
            return Results.Ok(new
            {
                summary          = (string?)null,
                topOpportunities = Array.Empty<object>(),
                cards            = Array.Empty<object>(),
                hasData          = false,
                totalLeads       = 0,
                totalSessions,
                conversionRate   = 0.0,
            });
        }

        // ── Serve from cache (memory → disk → LLM) ───────────────────────────
        var cacheFile = Path.Combine(env.ContentRootPath, ".cache", "lead-insights.json");

        // On in-memory miss, try to restore from disk (survives server restarts)
        if (_leadInsightsCache == null || DateTime.UtcNow - _leadInsightsCachedAt >= TimeSpan.FromDays(30))
        {
            var fileEntry = TryLoadCacheFile(cacheFile, out var fileAge);
            if (fileEntry != null)
            {
                _leadInsightsCache    = fileEntry;
                _leadInsightsCachedAt = DateTime.UtcNow - fileAge;
            }
        }

        if (_leadInsightsCache != null && DateTime.UtcNow - _leadInsightsCachedAt < TimeSpan.FromDays(30))
        {
            var cached = _leadInsightsCache;
            return Results.Ok(new
            {
                summary          = cached.Summary,
                topOpportunities = cached.TopOpportunities,
                cards            = cached.SortedCards,
                hasData          = true,
                totalLeads,        // always fresh
                totalSessions,     // always fresh
                conversionRate   = convRate,
            });
        }

        // ── Cache miss: query DB and call LLM ────────────────────────────────
        var cutoff30 = DateTime.UtcNow.AddDays(-30);

        var rawLeads = await db.ContactInquiries
            .Where(l => l.CreatedAt >= cutoff30)
            .Select(l => new { l.Query, l.CreatedAt })
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(ct);

        var allLeads = await db.ContactInquiries.Select(l => new { l.Query }).ToListAsync(ct);

        var recentQueries = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .Select(e => e.Name!)
            .ToListAsync(ct);

        var leadQ = allLeads.Select(l => l.Query.ToLower()).ToList();
        var allQ  = recentQueries.Select(q => q.ToLower()).ToList();

        // "High quality" is now the AI's own hot/warm/cold call (SessionFunnelStatus.LeadTemperature),
        // not a keyword-scored heuristic — there is no numeric lead score anywhere in this system.
        var temperatureCounts = await db.SessionFunnelStatuses
            .Where(s => s.IsFinalized && s.IsLead)
            .GroupBy(s => s.LeadTemperature)
            .Select(g => new { Temperature = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var hotCount       = temperatureCounts.FirstOrDefault(t => t.Temperature == "hot")?.Count ?? 0;
        var leadTempTotal  = temperatureCounts.Sum(t => t.Count);
        var highQuality    = hotCount;
        var highQualityPct = (int)Math.Round((double)hotCount / Math.Max(leadTempTotal, 1) * 100);

        List<object> cards;
        try
        {
            cards = await GenerateLeadInsightsWithAIAsync(
                config, httpFactory,
                rawLeads.Select(l => l.Query).ToList(),
                recentQueries,
                totalLeads, totalSessions, convRate, highQuality, highQualityPct,
                ct);
        }
        catch
        {
            cards = BuildLeadInsightCards(leadQ, allQ, totalLeads, totalSessions, convRate,
                highQuality, highQualityPct);
        }

        var sorted = cards
            .Cast<dynamic>()
            .OrderByDescending(c => (int)c.score)
            .Take(12)
            .ToList<object>();

        var topOpps = sorted.Cast<dynamic>().Take(4).Select((c, i) => new
        {
            label    = LeadOpportunityLabel(i),
            category = (string)c.category,
            title    = (string)c.title,
            score    = (int)c.score,
            detail   = Truncate((string)c.summary, 110),
        }).ToList<object>();

        var summary = BuildLeadSummary(
            totalLeads, totalSessions, convRate, leadQ, highQuality, highQualityPct, sorted);

        // Update in-memory cache
        var nowTs = DateTime.UtcNow;
        _leadInsightsCache    = new LeadInsightsCacheEntry(sorted.AsReadOnly(), topOpps.AsReadOnly(), summary);
        _leadInsightsCachedAt = nowTs;

        // Persist to disk in background so server restarts don't trigger another LLM call
        _ = Task.Run(async () =>
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(cacheFile)!);
                var payload = JsonSerializer.Serialize(new
                {
                    generatedAt = nowTs,
                    summary,
                    cards   = sorted,
                    topOpps,
                });
                await File.WriteAllTextAsync(cacheFile, payload);
            }
            catch { /* best effort — disk write failure should never break the response */ }
        });

        return Results.Ok(new
        {
            summary,
            topOpportunities = topOpps,
            cards            = sorted,
            hasData          = true,
            totalLeads,
            totalSessions,
            conversionRate   = convRate,
        });
    }

    // Reads the disk cache and reconstitutes a LeadInsightsCacheEntry.
    // Returns null if the file is missing, corrupt, or older than 30 days.
    private static LeadInsightsCacheEntry? TryLoadCacheFile(string path, out TimeSpan fileAge)
    {
        fileAge = TimeSpan.MaxValue;
        try
        {
            if (!File.Exists(path)) return null;
            var json = File.ReadAllText(path);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var generatedAt = root.GetProperty("generatedAt").GetDateTime();
            fileAge = DateTime.UtcNow - generatedAt;
            if (fileAge >= TimeSpan.FromDays(30)) return null;

            // Clone each element so it survives disposal of the JsonDocument
            var cards = root.GetProperty("cards")
                            .EnumerateArray()
                            .Select(e => (object)e.Clone())
                            .ToList();
            var topOpps = root.GetProperty("topOpps")
                              .EnumerateArray()
                              .Select(e => (object)e.Clone())
                              .ToList();
            var summary = root.TryGetProperty("summary", out var s)
                ? s.GetString() ?? string.Empty
                : string.Empty;

            return cards.Count > 0
                ? new LeadInsightsCacheEntry(cards.AsReadOnly(), topOpps.AsReadOnly(), summary)
                : null;
        }
        catch { return null; }
    }

    private static async Task<List<object>> GenerateLeadInsightsWithAIAsync(
        IConfiguration config,
        IHttpClientFactory httpFactory,
        List<string> leadQueries,
        List<string> analyticsQueries,
        int totalLeads, int totalSessions, double convRate,
        int highQuality, int highQualityPct,
        CancellationToken ct)
    {
        var apiKey = config["Anthropic:ApiKey"] ?? string.Empty;
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Anthropic API key not configured.");

        var model = config["Anthropic:Model"] switch
        {
            "haiku"  => "claude-haiku-4-5-20251001",
            "sonnet" => "claude-sonnet-4-6",
            "opus"   => "claude-opus-4-8",
            var m when !string.IsNullOrEmpty(m) => m,
            _ => "claude-haiku-4-5-20251001",
        };

        // Summarise topic frequency from analytics queries
        var topicFreq = new (string label, string[] kw)[]
        {
            ("hotel/hospitality", ["hotel", "hospitality", "resort"]),
            ("DALI controls",     ["dali"]),
            ("dark sky",          ["dark sky"]),
            ("villa/residential", ["villa", "residential", "home"]),
            ("bollard",           ["bollard"]),
            ("in-grade",          ["in-grade", "inground"]),
            ("IP66/outdoor",      ["ip66", "ip65", "outdoor", "exterior"]),
            ("campus/university", ["campus", "university", "hospital"]),
        };

        var topicsText = string.Join("; ", topicFreq
            .Select(t => (label: t.label, n: analyticsQueries.Count(q => t.kw.Any(k => q.Contains(k, StringComparison.OrdinalIgnoreCase)))))
            .Where(t => t.n > 0)
            .OrderByDescending(t => t.n)
            .Select(t => $"{t.label}: {t.n} queries"));

        var leadSample = string.Join("\n", leadQueries.Take(20).Select((q, i) =>
            $"{i + 1}. {(q.Length > 150 ? q[..150] + "…" : q)}"));

        var prompt = $$"""
            You are a B2B sales intelligence analyst for BEGA, a premium European architectural lighting manufacturer.

            Analyse the data below from the BEGA AI Product Advisor (last 30 days) and generate exactly 7 actionable insight cards for the BEGA sales and marketing team.

            ## Analytics Data
            - Total leads captured: {{totalLeads}}
            - Total chat sessions: {{totalSessions}}
            - Lead conversion rate: {{convRate}}%
            - AI-classified hot leads: {{highQuality}} of {{totalLeads}} ({{highQualityPct}}%)
            - Top query topics: {{(string.IsNullOrEmpty(topicsText) ? "insufficient data" : topicsText)}}

            ## Recent Lead Inquiries (what users who submitted leads actually wrote)
            {{leadSample}}

            ## Instructions
            Generate exactly 7 insight cards. Rules:
            - Base every insight on the data above — never fabricate statistics
            - Each card must name a concrete action the BEGA team can take
            - Vary the categories: use each category at most twice
            - Score 1-99: higher = more urgent / higher business impact
            - Evidence must quote or reference real data from the lead list or analytics above

            Return ONLY a valid JSON array — no markdown fences, no prose before or after:
            [
              {
                "category": "LEAD QUALITY|CONVERSION|SALES|OPPORTUNITY|PRODUCT|ARCHITECT INTENT|PROJECT DEMAND|CUSTOMER BEHAVIOR",
                "score": 1-99,
                "title": "max 10 words",
                "summary": "2-3 sentences explaining the insight",
                "evidence": "specific quote, number, or pattern from the data",
                "action": "one concrete next step for the sales/marketing team",
                "impact": "expected business outcome of taking the action",
                "trend": 0
              }
            ]
            """;

        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Add("x-api-key", apiKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var body = JsonSerializer.Serialize(new
        {
            model,
            max_tokens = 2500,
            messages   = new[] { new { role = "user", content = prompt } },
        });

        var response = await client.PostAsync(
            "https://api.anthropic.com/v1/messages",
            new StringContent(body, Encoding.UTF8, "application/json"), ct);

        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var rawText = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "[]";

        // Strip any accidental markdown fences Claude might add
        var jsonText = rawText.Trim();
        if (jsonText.StartsWith("```")) jsonText = jsonText[(jsonText.IndexOf('['))..];
        if (jsonText.EndsWith("```")) jsonText = jsonText[..jsonText.LastIndexOf(']')];

        using var cardsDoc = JsonDocument.Parse(jsonText.Trim());
        var cards = new List<object>();
        foreach (var card in cardsDoc.RootElement.EnumerateArray())
        {
            cards.Add(new
            {
                category = card.GetProperty("category").GetString() ?? "OPPORTUNITY",
                score    = card.GetProperty("score").GetInt32(),
                title    = card.GetProperty("title").GetString() ?? "",
                summary  = card.GetProperty("summary").GetString() ?? "",
                evidence = card.GetProperty("evidence").GetString() ?? "",
                action   = card.GetProperty("action").GetString() ?? "",
                impact   = card.GetProperty("impact").GetString() ?? "",
                trend    = card.TryGetProperty("trend", out var t) ? t.GetInt32() : 0,
            });
        }
        return cards;
    }

    private static List<object> BuildLeadInsightCards(
        List<string> leadQ, List<string> allQ,
        int totalLeads, int totalSessions, double convRate,
        int highQuality, int highQualityPct)
    {
        var cards  = new List<object>();
        var lTotal = Math.Max(leadQ.Count, 1);
        var qTotal = Math.Max(allQ.Count, 1);

        // ── LEAD QUALITY ──────────────────────────────────────────────────────
        if (highQualityPct >= 25)
        {
            cards.Add(new {
                category = "LEAD QUALITY",
                score    = Math.Min(99, 55 + (int)(highQualityPct * 0.44)),
                title    = $"{highQualityPct}% of leads show strong buying intent",
                summary  = $"The AI advisor is attracting specification-ready prospects. {highQuality} of {totalLeads} leads score above 75, indicating project-ready buyers with clear requirements.",
                evidence = $"{highQuality} leads ({highQualityPct}%) were AI-classified as hot, signalling project names, budgets, or specific product specifications — your warmest prospects.",
                action   = "Prioritise outreach to hot-classified leads. Their conversations contain specific project context that enables high-conversion personalised engagement.",
                impact   = "Focused follow-up on high-intent leads typically reduces sales cycle length and increases specification close rates.",
                trend    = Math.Max(0, highQualityPct - 40),
            });
        }
        else if (totalLeads >= 2)
        {
            cards.Add(new {
                category = "OPPORTUNITY",
                score    = 84,
                title    = "Lead quality enrichment would unlock higher-value sales opportunities",
                summary  = $"Only {highQualityPct}% of leads are AI-classified as hot. Adding contextual fields to Connect with BEGA would attract and identify specification-ready buyers earlier.",
                evidence = $"Only {highQuality} of {totalLeads} leads ({highQualityPct}%) were classified hot. Most reflect early-stage exploration. Richer qualification data enables smarter sales prioritisation.",
                action   = "Add Project Type, Timeline, and Estimated Budget fields to the Connect with BEGA form to improve lead data quality and scoring.",
                impact   = "Better qualification data reduces wasted sales effort and directs attention to highest-probability active specifications.",
                trend    = 0,
            });
        }

        // ── CONVERSION ────────────────────────────────────────────────────────
        if (totalSessions >= 5)
        {
            var addl = Math.Max(0, (int)(totalSessions * 0.12) - totalLeads);
            var convScore = convRate < 8.0
                ? 90
                : Math.Min(99, 62 + (int)(convRate * 2.4));
            cards.Add(new {
                category = "CONVERSION",
                score    = convScore,
                title    = convRate < 8.0
                    ? "Conversion rate improvement is the highest-impact growth lever available"
                    : $"{convRate}% conversion rate validates the AI advisor's lead generation effectiveness",
                summary  = convRate < 8.0
                    ? $"At {convRate}% conversion, there is significant headroom. AI-assisted B2B advisors benchmark at 12–18%. Closing this gap could double or triple lead volume from existing traffic."
                    : $"Converting {convRate}% of conversations to leads outperforms typical B2B benchmarks. The AI advisor is effectively identifying and capturing high-intent visitors.",
                evidence = convRate < 8.0
                    ? $"{totalSessions} conversations generated {totalLeads} leads ({convRate}% rate). At 12%: approximately {(int)(totalSessions * 0.12)} leads — {addl} more than current performance."
                    : $"{totalLeads} leads from {totalSessions} sessions ({convRate}%). B2B benchmark: 10–15%. Connect with BEGA prompt appears well-positioned in conversation flow.",
                action   = convRate < 8.0
                    ? "Introduce a Connect with BEGA nudge after the third recommendation, after BOM generation, and on any second session from the same visitor."
                    : "Maintain current flow. A/B test showing the Connect with BEGA option one interaction earlier to explore further headroom.",
                impact   = convRate < 8.0
                    ? $"Reaching 12% conversion would generate approximately {addl} additional leads per period from current traffic volume."
                    : "Sustaining this performance while growing session volume is the primary lead generation lever.",
                trend    = (int)(convRate - 10.0),
            });
        }

        // ── Topic-based insight cards ─────────────────────────────────────────
        var topics = new (string label, string cat, string[] kw, string act, string imp)[]
        {
            ("Hospitality & Hotel Projects", "PROJECT DEMAND",
                ["hotel","hospitality","resort","restaurant","lounge"],
                "Build a dedicated Hospitality Lighting guided experience with curated 5-star product selections and project-ready BOM templates.",
                "Hotel specifiers represent high-volume, high-value specifications. Targeted journeys convert this segment 2–3× more effectively than generic search."),

            ("Residential Villa Projects", "PROJECT DEMAND",
                ["villa","residential","home","house","driveway","terrace"],
                "Develop a Premium Residential Lighting journey tailored to high-net-worth homeowners and landscape architects.",
                "High-end residential projects generate premium-priced specifications with strong repeat potential and referral value."),

            ("Campus & Institutional Spaces", "PROJECT DEMAND",
                ["campus","university","hospital","school","clinic"],
                "Expand campus-specific compliance guidance and product groupings. Add IP rating and durability filters to this pathway.",
                "Institutional projects are large-volume with long-term supply relationships — worth dedicated sales engagement strategy."),

            ("Landscape & Garden Design", "PROJECT DEMAND",
                ["landscape","park","pathway","botanical","garden path","tree light","garden"],
                "Introduce an area-based Landscape Lighting Planner linking spaces to recommended luminaire families.",
                "Landscape architects are strong specifiers of premium outdoor products with high project repeatability and referral networks."),

            ("Urban & Public Spaces", "PROJECT DEMAND",
                ["urban","public","plaza","street","pedestrian","municipality","smart city"],
                "Create a Smart City & Urban Furniture experience combining BEGA luminaires with street furniture and controls solutions.",
                "Urban tenders represent large contract values. A dedicated experience positions BEGA as the specialist choice for public infrastructure."),

            ("Technical Specification Intent", "ARCHITECT INTENT",
                ["spec","specification","lumen","watt","ip6","voltage","beam","kelvin","cct","ip rating"],
                "Ensure every technical recommendation generates a downloadable spec sheet and a BOM export option.",
                "Specification-stage visitors are closest to procurement. Reducing friction at this stage accelerates conversion significantly."),

            ("Dark Sky & Sustainability", "ARCHITECT INTENT",
                ["dark sky","sustainability","carbon","leed","green","glare","light pollution","ies"],
                "Feature BEGA's Dark Sky compliant range in a dedicated sustainability hub within the AI advisor.",
                "Sustainability queries are growing. Positioning BEGA as the responsible choice captures an expanding, high-credibility segment."),

            ("DALI & Controls Systems", "ARCHITECT INTENT",
                ["dali","control","automation","dimming","smart","0-10v","sensor"],
                "Add a Controls & DALI advisor section that maps user requirements to BEGA-compatible system products.",
                "Controls-focused specifiers typically represent complete-system projects with higher total order values."),

            ("Facade & Architectural Lighting", "PRODUCT",
                ["facade","architectural","highlight","dramatic","wall wash","grazing","column"],
                "Create a Facade Lighting Design Guide with product recommendations mapped to surface types and architectural goals.",
                "Facade projects attract architect-grade specifications with premium lighting budgets and high creative ambition."),

            ("Bollard & Post Luminaires", "PRODUCT",
                ["bollard","post light","pole"],
                "Feature bollard and post solutions prominently in guided journeys and pathway recommendation flows.",
                "Bollard specifiers show consistent conversion patterns — targeted featuring would grow this high-value lead segment."),

            ("In-Grade & Ground Luminaires", "PRODUCT",
                ["in-grade","inground","in grade","ground mounted","uplighter"],
                "Add technical installation guidance for in-grade luminaires to improve specification confidence and reduce hesitation.",
                "In-grade products command premium pricing. Lead capture from this segment has high order-value potential per project."),

            ("Comparison Research Stage", "CUSTOMER BEHAVIOR",
                ["compare"," vs ","versus","difference","better","alternative","which is"],
                "Build a product comparison widget and add comparison-oriented quick actions to the AI suggestion cards.",
                "Visitors using comparison language are in late-stage research. A comparison tool converts them faster with less friction."),

            ("Recommendation-Seeking Visitors", "CUSTOMER BEHAVIOR",
                ["recommend","suggest","best for","ideal","what should","help me choose","which luminaire"],
                "Ensure recommendation flows conclude with a prominently positioned Connect with BEGA action.",
                "Visitors accepting recommendations are pre-qualified by intent — capturing them at this moment maximises conversion efficiency."),

            ("Budget & Pricing Inquiries", "SALES",
                ["budget","cost","price","affordable","how much","dnp","quote","bom"],
                "Introduce indicative pricing displays within the AI advisor and offer BOM generation for budget planning sessions.",
                "Price-inquiring visitors have active procurement intent. Budget transparency converts this audience at significantly higher rates."),
        };

        foreach (var (label, cat, kw, act, imp) in topics)
        {
            var lm  = leadQ.Count(q => kw.Any(k => q.Contains(k)));
            var am  = allQ.Count(q => kw.Any(k => q.Contains(k)));
            if (lm < 1) continue;

            var lr   = (double)lm / lTotal;
            var ar   = (double)am / qTotal;
            var lift = ar > 0.004 ? Math.Round(lr / ar, 1) : 2.5;
            var pct  = (int)Math.Round(lr * 100);
            if (pct < 8 && lift < 1.5) continue;

            var score   = Math.Min(99, (int)(45 + pct * 0.44 + lift * 6.5));
            var liftStr = lift >= 1.5
                ? $" Users discussing {label.ToLower()} are {lift}× more likely to submit a lead than average."
                : string.Empty;

            cards.Add(new {
                category = cat,
                score,
                title    = $"{label} conversations generate above-average lead conversion",
                summary  = $"{pct}% of submitted leads include {label.ToLower()} in their query, reflecting strong specification intent from this segment.",
                evidence = $"{lm} of {totalLeads} leads ({pct}%) originated from {label.ToLower()} discussions.{liftStr}",
                action   = act,
                impact   = imp,
                trend    = (int)Math.Round(Math.Max(0.0, (lift - 1.0) * 15)),
            });
        }

        // ── OPPORTUNITY: high query volume, low conversion ────────────────────
        var oppTopics = new (string label, string[] kw)[]
        {
            ("Interior Lighting",  ["interior","indoor","ceiling","downlight"]),
            ("Controls Queries",   ["control","dali","automation"]),
            ("IP Rating Research", ["ip66","ip65","ip rating","waterproof"]),
        };

        foreach (var (label, kw) in oppTopics)
        {
            var qm = allQ.Count(q => kw.Any(k => q.Contains(k)));
            var lm = leadQ.Count(q => kw.Any(k => q.Contains(k)));
            var qr = (double)qm / qTotal;
            var lr = (double)lm / lTotal;
            if (qr < 0.08 || lr >= 0.06) continue;

            var potential = Math.Max(1, (int)Math.Round((qr - lr) * totalLeads));
            cards.Add(new {
                category = "OPPORTUNITY",
                score    = Math.Min(88, 65 + (int)(qr * 80)),
                title    = $"{label} visitors engage heavily but rarely convert to leads",
                summary  = $"{Math.Round(qr * 100)}% of conversations explore {label.ToLower()}, yet only {Math.Round(lr * 100)}% of leads emerge here. This gap signals an untapped conversion pool.",
                evidence = $"{qm} total queries touch {label.ToLower()} topics, yet only {lm} leads resulted. The engagement exists — the conversion experience needs strengthening.",
                action   = $"Add targeted Connect with BEGA prompts within {label.ToLower()} conversation flows. Improve recommendation depth and add spec sheet downloads.",
                impact   = $"Improving {label.ToLower()} conversion to average rates could yield approximately {potential} additional leads per period from existing traffic.",
                trend    = 0,
            });
        }

        return cards;
    }

    private static string BuildLeadSummary(
        int totalLeads, int totalSessions, double convRate,
        List<string> leadQ, int highQuality, int highQualityPct, List<object> sorted)
    {
        var sb = new StringBuilder();

        sb.Append($"Analysis of {totalLeads} lead{(totalLeads != 1 ? "s" : "")} captured through the BEGA AI Product Advisor reveals ");

        if (highQualityPct >= 50)
            sb.Append($"a strong pipeline of specification-ready buyers — {highQualityPct}% demonstrate high buying intent through project-specific queries. ");
        else if (highQualityPct >= 25)
            sb.Append($"a mixed prospect profile — {highQualityPct}% show high buying intent, with meaningful opportunity to improve lead quality through better qualification. ");
        else
            sb.Append("predominantly early-stage exploration behaviour. Most visitors are researching rather than specifying — qualification improvement is the highest-impact next step. ");

        var topCard = sorted.Cast<dynamic>()
            .FirstOrDefault(c =>
                ((string)c.category).Equals("PROJECT DEMAND", StringComparison.Ordinal) ||
                ((string)c.category).Equals("ARCHITECT INTENT", StringComparison.Ordinal) ||
                ((string)c.category).Equals("PRODUCT", StringComparison.Ordinal));

        if (topCard != null)
            sb.Append($"{(string)topCard.category} signals emerge as the strongest lead conversion driver, with the highest-scoring segment contributing a disproportionate share of qualified leads. ");

        sb.Append(convRate < 8.0
            ? $"The {convRate}% conversion rate indicates significant room to grow the lead pipeline without additional traffic — conversion optimisation is the primary recommended focus area."
            : $"The {convRate}% conversion rate demonstrates the AI advisor's effectiveness. The priority focus should shift to lead quality improvement and deeper specification engagement to maximise revenue from current volumes.");

        return sb.ToString();
    }

    private static string LeadOpportunityLabel(int i) => i switch
    {
        0 => "Most Valuable Opportunity",
        1 => "Highest Converting Segment",
        2 => "Top Conversion Pattern",
        _ => "Emerging Lead Signal",
    };

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max].TrimEnd() + "…";
}
