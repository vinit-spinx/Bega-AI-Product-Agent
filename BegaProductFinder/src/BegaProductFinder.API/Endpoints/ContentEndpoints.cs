using BegaProductFinder.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Public read-only endpoints for CMS-managed content consumed by the frontend.
/// No authentication required — these return only active, published data.
/// </summary>
public static class ContentEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/content").WithTags("Content");

        group.MapGet("/actions", GetActiveActionsAsync)
            .WithName("GetContentActions")
            .WithSummary("Returns all active AI action cards ordered by SortOrder.");

        group.MapGet("/suggestions", GetActiveSuggestionsAsync)
            .WithName("GetContentSuggestions")
            .WithSummary("Returns all active suggestion chips ordered by SortOrder.");

        group.MapGet("/hero", GetHeroContentAsync)
            .WithName("GetContentHero")
            .WithSummary("Returns the current hero banner content.");

    }

    // ── GET /api/content/actions ──────────────────────────────────────────────

    private static async Task<IResult> GetActiveActionsAsync(
        AppDbContext db, CancellationToken ct)
    {
        var actions = await db.CmsActions
            .AsNoTracking()
            .Where(a => a.IsActive)
            .OrderBy(a => a.SortOrder)
            .Select(a => new
            {
                a.Id, a.Title, a.Description, a.Prompt,
                a.Icon, a.IsActive, a.IsFeatured, a.SortOrder,
            })
            .ToListAsync(ct);

        return Results.Ok(actions);
    }

    // ── GET /api/content/suggestions ─────────────────────────────────────────

    private static async Task<IResult> GetActiveSuggestionsAsync(
        AppDbContext db, CancellationToken ct)
    {
        var suggestions = await db.CmsSuggestions
            .AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .Select(s => new { s.Id, s.Text, s.IsActive, s.SortOrder })
            .ToListAsync(ct);

        return Results.Ok(suggestions);
    }

    // ── GET /api/content/hero ─────────────────────────────────────────────────

    private static async Task<IResult> GetHeroContentAsync(
        AppDbContext db, CancellationToken ct)
    {
        var hero = await db.CmsHeroContent
            .AsNoTracking()
            .Select(h => new { h.Id, h.Title, h.Description, h.BackgroundImageUrl })
            .FirstOrDefaultAsync(ct);

        if (hero is null)
            return Results.Ok(new
            {
                Id = 1,
                Title = "Find the Perfect Lighting Solution",
                Description = "Discover lighting, furniture, and control solutions engineered for exceptional architectural environments.",
                BackgroundImageUrl = "",
            });

        return Results.Ok(hero);
    }

}
