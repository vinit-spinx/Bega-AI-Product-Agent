using BegaProductFinder.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Project recommendation endpoint — returns curated product sets grouped by building area
/// for named project types such as hotels, campuses, villas, and parks.
/// </summary>
public static class ProjectEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/projects").WithTags("Projects");

        group.MapPost("/recommend", RecommendAsync)
            .WithName("RecommendForProject")
            .WithSummary("Generate area-by-area product recommendations for a named project type.");
    }

    // ── POST /api/projects/recommend ──────────────────────────────────────────

    private static async Task<IResult> RecommendAsync(
        [FromBody] ProjectRecommendRequest request,
        IProjectRecommendationService recommendationService,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ProjectType))
            return Results.BadRequest("projectType is required.");

        var areas = await recommendationService.RecommendAsync(
            projectType: request.ProjectType,
            areas: request.Areas,
            budgetUsd: request.BudgetUsd,
            styleKeywords: request.StyleKeywords,
            category: request.Category,
            ct: ct);

        return Results.Ok(new
        {
            projectType = request.ProjectType,
            areas
        });
    }
}

/// <summary>Request body for <c>POST /api/projects/recommend</c>.</summary>
public sealed record ProjectRecommendRequest(
    string ProjectType,
    List<string>? Areas,
    decimal? BudgetUsd,
    List<string>? StyleKeywords,
    string? Category
);
