using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Admin analytics endpoints and public event-tracking endpoint.
/// </summary>
public static class InsightsEndpoints
{
    public static void Map(WebApplication app)
    {
        var admin = app.MapGroup("/api/admin/insights").WithTags("Insights");
        admin.MapGet("/overview", GetOverviewAsync).WithName("InsightsOverview");
        admin.MapGet("/usage",    GetUsageAsync).WithName("InsightsUsage");
        admin.MapGet("/actions",  GetActionsAsync).WithName("InsightsActions");
        admin.MapGet("/content",  GetContentAsync).WithName("InsightsContent");

        // Public — called from the frontend without admin key
        app.MapPost("/api/analytics/event", TrackEventAsync)
            .WithTags("Analytics")
            .WithName("TrackAnalyticsEvent");
    }

    // ── GET /api/admin/insights/overview?range=7D|30D|90D|12M ─────────────────

    private static async Task<IResult> GetOverviewAsync(
        HttpContext httpContext, AppDbContext db, IConfiguration config,
        [FromQuery] string range = "30D",
        CancellationToken ct = default)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();

        var (cutoff, prevCutoff, labelFmt) = ParseRange(range);
        var now = DateTime.UtcNow;

        // ── Current period counts ──────────────────────────────────────────────
        var currQueries     = await db.AnalyticsEvents.Where(e => e.EventType == "query"            && e.CreatedAt >= cutoff).CountAsync(ct);
        var currActions     = await db.AnalyticsEvents.Where(e => e.EventType == "action_click"     && e.CreatedAt >= cutoff).CountAsync(ct);
        var currSuggestions = await db.AnalyticsEvents.Where(e => e.EventType == "suggestion_click" && e.CreatedAt >= cutoff).CountAsync(ct);
        var currSessions    = await db.ChatSessions.Where(s => s.CreatedAt >= cutoff).CountAsync(ct);
        var withMessages    = await db.ChatSessions.Where(s => s.CreatedAt >= cutoff && s.MessagesJson != "[]").CountAsync(ct);

        // ── Previous period counts (for trend %) ──────────────────────────────
        var prevQueries     = await db.AnalyticsEvents.Where(e => e.EventType == "query"            && e.CreatedAt >= prevCutoff && e.CreatedAt < cutoff).CountAsync(ct);
        var prevActions     = await db.AnalyticsEvents.Where(e => e.EventType == "action_click"     && e.CreatedAt >= prevCutoff && e.CreatedAt < cutoff).CountAsync(ct);
        var prevSuggestions = await db.AnalyticsEvents.Where(e => e.EventType == "suggestion_click" && e.CreatedAt >= prevCutoff && e.CreatedAt < cutoff).CountAsync(ct);
        var prevSessions    = await db.ChatSessions.Where(s => s.CreatedAt >= prevCutoff && s.CreatedAt < cutoff).CountAsync(ct);

        double successRate = currSessions > 0 ? Math.Round((double)withMessages / currSessions * 100, 1) : 0;
        double avgMsgsPerSession = currSessions > 0 ? Math.Round((double)currQueries / currSessions, 1) : 0;

        // ── Time series ────────────────────────────────────────────────────────
        var queriesByDay = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff)
            .GroupBy(e => e.CreatedAt.Date)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .OrderBy(x => x.Day)
            .ToListAsync(ct);

        var sessionsByDay = await db.ChatSessions
            .Where(s => s.CreatedAt >= cutoff)
            .GroupBy(s => s.CreatedAt.Date)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .OrderBy(x => x.Day)
            .ToListAsync(ct);

        var queryMap   = queriesByDay.ToDictionary(x => x.Day, x => x.Count);
        var sessionMap = sessionsByDay.ToDictionary(x => x.Day, x => x.Count);

        // Build a complete day-by-day series (fill gaps with 0)
        var allDays = Enumerable.Range(0, (int)(now - cutoff).TotalDays + 1)
            .Select(i => cutoff.Date.AddDays(i))
            .Where(d => d <= now.Date)
            .ToList();

        var timeSeries = allDays.Select(d => new
        {
            date    = d.ToString(labelFmt),
            queries = queryMap.TryGetValue(d, out var q) ? q : 0,
            sessions = sessionMap.TryGetValue(d, out var s) ? s : 0,
        }).ToList();

        // ── Top actions ────────────────────────────────────────────────────────
        var actionGroups = await db.AnalyticsEvents
            .Where(e => e.EventType == "action_click" && e.CreatedAt >= cutoff && e.Name != null)
            .GroupBy(e => e.Name!)
            .Select(g => new { Name = g.Key, Clicks = g.Count() })
            .OrderByDescending(x => x.Clicks)
            .Take(8)
            .ToListAsync(ct);

        var totalActionClicks = actionGroups.Sum(x => x.Clicks);
        var topActions = actionGroups.Select(a => new
        {
            name       = a.Name,
            clicks     = a.Clicks,
            percentage = totalActionClicks > 0 ? Math.Round((double)a.Clicks / totalActionClicks * 100, 1) : 0,
            trend      = 0.0, // Would require per-period breakdown — leave as 0 for now
        }).ToList();

        // ── Popular queries ────────────────────────────────────────────────────
        var popularQueries = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff && e.Name != null)
            .GroupBy(e => e.Name!)
            .Select(g => new { Query = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync(ct);

        // ── Intent distribution ────────────────────────────────────────────────
        var queryTexts = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff && e.Name != null)
            .Select(e => e.Name!)
            .ToListAsync(ct);

        var intents = ClassifyIntents(queryTexts);

        // ── Highlights ─────────────────────────────────────────────────────────
        var topAction = topActions.FirstOrDefault()?.name ?? "—";
        var topQuery  = popularQueries.FirstOrDefault()?.Query ?? "—";
        var topCategory = DeriveTopCategory(queryTexts);
        var topApplication = DeriveTopApplication(queryTexts);

        return Results.Ok(new
        {
            kpis = new
            {
                totalSessions        = currSessions,
                totalQueries         = currQueries,
                actionsTriggered     = currActions,
                suggestionsClicked   = currSuggestions,
                successRate,
                avgMessagesPerSession = avgMsgsPerSession,
                trends = new
                {
                    sessions    = Trend(currSessions, prevSessions),
                    queries     = Trend(currQueries, prevQueries),
                    actions     = Trend(currActions, prevActions),
                    suggestions = Trend(currSuggestions, prevSuggestions),
                },
            },
            timeSeries,
            topActions,
            popularQueries,
            intents,
            highlights = new
            {
                topAction,
                topQuery   = topQuery.Length > 60 ? topQuery[..60] + "…" : topQuery,
                topCategory,
                topApplication,
            },
        });
    }

    // ── GET /api/admin/insights/usage ──────────────────────────────────────────

    private static async Task<IResult> GetUsageAsync(
        HttpContext httpContext, AppDbContext db, IConfiguration config,
        CancellationToken ct = default)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();

        var cutoff30   = DateTime.UtcNow.AddDays(-30);
        var cutoff60   = DateTime.UtcNow.AddDays(-60);

        var totalSessions = await db.ChatSessions.Where(s => s.CreatedAt >= cutoff30).CountAsync(ct);
        var totalQueries  = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30).CountAsync(ct);
        var totalActions  = await db.AnalyticsEvents.Where(e => e.EventType == "action_click" && e.CreatedAt >= cutoff30).CountAsync(ct);
        var totalSugg     = await db.AnalyticsEvents.Where(e => e.EventType == "suggestion_click" && e.CreatedAt >= cutoff30).CountAsync(ct);

        var prevSessions  = await db.ChatSessions.Where(s => s.CreatedAt >= cutoff60 && s.CreatedAt < cutoff30).CountAsync(ct);
        var prevQueries   = await db.AnalyticsEvents.Where(e => e.EventType == "query" && e.CreatedAt >= cutoff60 && e.CreatedAt < cutoff30).CountAsync(ct);

        double avgMsgs   = totalSessions > 0 ? Math.Round((double)totalQueries / totalSessions, 1) : 0;
        double prevAvg   = prevSessions  > 0 ? Math.Round((double)prevQueries  / prevSessions,  1) : 0;

        // Daily volume (30 days)
        var dailyVolume = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30)
            .GroupBy(e => e.CreatedAt.Date)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .OrderBy(x => x.Day)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        var allDays = Enumerable.Range(0, 30).Select(i => cutoff30.Date.AddDays(i)).Where(d => d <= now.Date).ToList();
        var dayMap  = dailyVolume.ToDictionary(x => x.Day, x => x.Count);
        var volumeSeries = allDays.Select(d => new
        {
            date    = d.ToString("MMM d"),
            queries = dayMap.TryGetValue(d, out var c) ? c : 0,
        }).ToList();

        // Popular queries
        var popularQueries = await db.AnalyticsEvents
            .Where(e => e.EventType == "query" && e.CreatedAt >= cutoff30 && e.Name != null)
            .GroupBy(e => e.Name!)
            .Select(g => new { Query = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(15)
            .ToListAsync(ct);

        // Search vs actions ratio
        var totalInteractions = totalQueries + totalActions + totalSugg;
        var searchPct  = totalInteractions > 0 ? Math.Round((double)totalQueries  / totalInteractions * 100) : 0;
        var actionPct  = totalInteractions > 0 ? Math.Round((double)totalActions  / totalInteractions * 100) : 0;
        var suggPct    = totalInteractions > 0 ? Math.Round((double)totalSugg     / totalInteractions * 100) : 0;

        return Results.Ok(new
        {
            metrics = new[]
            {
                new { label = "Messages per Session",  value = avgMsgs.ToString("F1"),         sub = "avg turns per conversation",          trend = Trend(avgMsgs, prevAvg) },
                new { label = "Total Active Sessions", value = totalSessions.ToString(),         sub = "unique sessions in last 30 days",     trend = Trend(totalSessions, prevSessions) },
                new { label = "Total Queries Sent",    value = totalQueries.ToString("N0"),      sub = "user messages sent to BEGA AI",       trend = Trend(totalQueries, prevQueries) },
            },
            dailyVolume = volumeSeries,
            popularQueries = popularQueries.Select(q => new
            {
                query = q.Query.Length > 80 ? q.Query[..80] + "…" : q.Query,
                count = q.Count,
                trend = 0.0,
            }),
            searchVsAction = new[]
            {
                new { label = "Natural Language Queries",  value = (int)searchPct, color = "#1A1A1A" },
                new { label = "AI Action Clicks",          value = (int)actionPct, color = "#B5A99A" },
                new { label = "Suggestion Clicks",         value = (int)suggPct,   color = "#DEDAD5" },
            },
        });
    }

    // ── GET /api/admin/insights/actions ────────────────────────────────────────

    private static async Task<IResult> GetActionsAsync(
        HttpContext httpContext, AppDbContext db, IConfiguration config,
        CancellationToken ct = default)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();

        var cmsActions = await db.CmsActions.AsNoTracking().ToListAsync(ct);

        // Aggregate all action_click events (no date cutoff for actions tab — lifetime totals)
        var clicksByAction = await db.AnalyticsEvents
            .Where(e => e.EventType == "action_click" && e.Name != null)
            .GroupBy(e => e.Name!)
            .Select(g => new { Name = g.Key, Clicks = g.Count(), LastUsed = g.Max(e => e.CreatedAt) })
            .ToListAsync(ct);

        var clickMap = clicksByAction.ToDictionary(x => x.Name);

        var actions = cmsActions.Select(a =>
        {
            clickMap.TryGetValue(a.Title, out var ev);
            return new
            {
                id          = a.Id,
                name        = a.Title,
                clicks      = ev?.Clicks ?? 0,
                executions  = ev?.Clicks ?? 0, // we track clicks = executions (same event)
                successRate = 100.0,            // no error tracking at this level
                lastUsed    = ev == null ? "Never" : FormatRelativeTime(ev.LastUsed),
                trend       = 0.0,
                isActive    = a.IsActive,
            };
        }).OrderByDescending(x => x.clicks).ToList();

        // Monthly trend (last 6 months)
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var monthlyTrend = await db.AnalyticsEvents
            .Where(e => e.EventType == "action_click" && e.CreatedAt >= sixMonthsAgo)
            .GroupBy(e => new { e.CreatedAt.Year, e.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync(ct);

        var trend = monthlyTrend.Select(x => new
        {
            month    = new DateTime(x.Year, x.Month, 1).ToString("MMM"),
            triggers = x.Count,
        }).ToList();

        return Results.Ok(new { actions, monthlyTrend = trend });
    }

    // ── GET /api/admin/insights/content ────────────────────────────────────────

    private static async Task<IResult> GetContentAsync(
        HttpContext httpContext, AppDbContext db, IConfiguration config,
        CancellationToken ct = default)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();

        var suggestions = await db.CmsSuggestions.AsNoTracking().ToListAsync(ct);

        var clicksByText = await db.AnalyticsEvents
            .Where(e => e.EventType == "suggestion_click" && e.Name != null)
            .GroupBy(e => e.Name!)
            .Select(g => new { Text = g.Key, Clicks = g.Count() })
            .ToListAsync(ct);

        var clickMap = clicksByText.ToDictionary(x => x.Text);
        var maxClicks = clicksByText.Any() ? clicksByText.Max(x => x.Clicks) : 1;

        var suggestionPerf = suggestions.Select(s =>
        {
            clickMap.TryGetValue(s.Text, out var ev);
            var clicks = ev?.Clicks ?? 0;
            // Conversion rate = relative performance vs top suggestion
            var convRate = maxClicks > 0 ? Math.Round((double)clicks / maxClicks * 100, 1) : 0;
            var status   = convRate >= 60 ? "top" : convRate >= 25 ? "normal" : "low";
            return new
            {
                id             = s.Id,
                text           = s.Text,
                clicks,
                conversionRate = convRate,
                trend          = 0.0,
                status,
            };
        }).OrderByDescending(x => x.clicks).ToList();

        // Hero metrics from ChatSessions
        var cutoff30 = DateTime.UtcNow.AddDays(-30);
        var heroViews       = await db.ChatSessions.Where(s => s.CreatedAt >= cutoff30).CountAsync(ct);
        var heroInteractions = await db.AnalyticsEvents
            .Where(e => e.CreatedAt >= cutoff30 && e.EventType != "query")
            .CountAsync(ct);
        var interactionRate = heroViews > 0 ? Math.Round((double)heroInteractions / heroViews * 100, 1) : 0;

        return Results.Ok(new
        {
            suggestions = suggestionPerf,
            heroMetrics = new[]
            {
                new { label = "Sessions (30d)",    value = heroViews.ToString("N0"),       trend = 0.0 },
                new { label = "Action Events",     value = heroInteractions.ToString("N0"), trend = 0.0 },
                new { label = "Interaction Rate",  value = $"{interactionRate}%",           trend = 0.0 },
            },
        });
    }

    // ── POST /api/analytics/event ─────────────────────────────────────────────

    private static async Task<IResult> TrackEventAsync(
        [FromBody] TrackEventRequest req,
        AppDbContext db,
        CancellationToken ct)
    {
        // Validate
        if (req.Type is not ("query" or "action_click" or "suggestion_click"
            or "product_viewed" or "shortlisted" or "unshortlisted" or "bom_generated" or "lead_captured"))
            return Results.BadRequest(new { error = "Unknown event type." });

        if (string.IsNullOrWhiteSpace(req.Name) && req.Type != "query")
            return Results.BadRequest(new { error = "Name is required for action/suggestion events." });

        db.AnalyticsEvents.Add(new AnalyticsEvent
        {
            EventType = req.Type,
            SessionId = req.SessionId?.Trim(),
            Name      = req.Name?.Trim()[..Math.Min(req.Name.Trim().Length, 500)],
            CreatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync(ct);
        return Results.Ok();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static bool IsAuthorized(HttpContext httpContext, IConfiguration config)
    {
        var expectedKey = config["AdminApiKey"] ?? string.Empty;
        if (string.IsNullOrWhiteSpace(expectedKey)) return false;
        httpContext.Request.Headers.TryGetValue("X-Admin-Api-Key", out var providedKey);
        return string.Equals(expectedKey, providedKey.ToString(), StringComparison.Ordinal);
    }

    private static (DateTime cutoff, DateTime prevCutoff, string labelFmt) ParseRange(string range)
    {
        var now = DateTime.UtcNow;
        return range switch
        {
            "7D"  => (now.AddDays(-7),    now.AddDays(-14),   "MMM d"),
            "90D" => (now.AddDays(-90),   now.AddDays(-180),  "MMM d"),
            "12M" => (now.AddMonths(-12), now.AddMonths(-24), "MMM yy"),
            _     => (now.AddDays(-30),   now.AddDays(-60),   "MMM d"),  // 30D default
        };
    }

    private static double Trend(double current, double previous)
    {
        if (previous == 0) return current > 0 ? 100 : 0;
        return Math.Round((current - previous) / previous * 100, 1);
    }

    private static string FormatRelativeTime(DateTime dt)
    {
        var diff = DateTime.UtcNow - dt;
        if (diff.TotalMinutes < 1)  return "Just now";
        if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes}m ago";
        if (diff.TotalHours   < 24) return $"{(int)diff.TotalHours}h ago";
        if (diff.TotalDays    < 7)  return $"{(int)diff.TotalDays}d ago";
        return dt.ToString("MMM d");
    }

    private static List<object> ClassifyIntents(List<string> queries)
    {
        if (queries.Count == 0)
            return [
                new { label = "Product Discovery", value = 0 },
                new { label = "Specifications",    value = 0 },
                new { label = "Compliance",        value = 0 },
                new { label = "Controls",          value = 0 },
                new { label = "Comparisons",       value = 0 },
                new { label = "General Questions", value = 0 },
            ];

        var buckets = new Dictionary<string, int>
        {
            ["Product Discovery"] = 0,
            ["Specifications"]    = 0,
            ["Compliance"]        = 0,
            ["Controls"]          = 0,
            ["Comparisons"]       = 0,
            ["General Questions"] = 0,
        };

        foreach (var q in queries)
        {
            var lq = q.ToLowerInvariant();
            var bucket =
                ContainsAny(lq, "dali", "0-10v", "dim", "control", "sensor", "automation", "smart", "schedule") ? "Controls" :
                ContainsAny(lq, "dark sky", "ada", "compliant", "ip66", "ip65", "certification", "environmental", "green") ? "Compliance" :
                ContainsAny(lq, "compar", " vs ", "versus", "difference", "between", "which is better") ? "Comparisons" :
                ContainsAny(lq, "spec", "watt", "lumen", "beam", "voltage", "kelvin", "cct", "dimension", "ip rating", "ip6") ? "Specifications" :
                ContainsAny(lq, "what is", "how to", "how do", "explain", "tell me", "what are", "why") ? "General Questions" :
                "Product Discovery";

            buckets[bucket]++;
        }

        var total = buckets.Values.Sum();
        var colors = new[] { "#1A1A1A", "#5A5750", "#9A9590", "#B5A99A", "#C8C4BE", "#DEDAD5" };

        return buckets.Select((kv, i) => (object)new
        {
            label = kv.Key,
            value = total > 0 ? (int)Math.Round((double)kv.Value / total * 100) : 0,
            color = colors[i],
        }).ToList();
    }

    private static bool ContainsAny(string text, params string[] terms)
        => terms.Any(text.Contains);

    private static string DeriveTopCategory(List<string> queries)
    {
        if (!queries.Any()) return "—";
        var ext = queries.Count(q => q.Contains("exterior", StringComparison.OrdinalIgnoreCase) || q.Contains("outdoor", StringComparison.OrdinalIgnoreCase));
        var itr = queries.Count(q => q.Contains("interior", StringComparison.OrdinalIgnoreCase) || q.Contains("indoor", StringComparison.OrdinalIgnoreCase));
        return ext >= itr ? "Exterior Lighting" : "Interior Lighting";
    }

    private static string DeriveTopApplication(List<string> queries)
    {
        if (!queries.Any()) return "—";
        var apps = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["Hospitality"]  = queries.Count(q => ContainsAny(q.ToLower(), "hotel", "hospitality", "resort", "restaurant")),
            ["Residential"]  = queries.Count(q => ContainsAny(q.ToLower(), "villa", "home", "residential", "house", "garden")),
            ["Commercial"]   = queries.Count(q => ContainsAny(q.ToLower(), "office", "commercial", "retail", "corporate")),
            ["Landscape"]    = queries.Count(q => ContainsAny(q.ToLower(), "garden", "landscape", "park", "pathway", "tree")),
            ["Campus"]       = queries.Count(q => ContainsAny(q.ToLower(), "campus", "university", "school", "hospital")),
        };
        var top = apps.MaxBy(kv => kv.Value);
        return top.Value > 0 ? top.Key : "—";
    }
}

public sealed record TrackEventRequest(string Type, string? Name, string? SessionId);
