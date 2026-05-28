using BegaProductFinder.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Search endpoint for BEGA outdoor furniture and urban design elements.
/// Furniture products share the Products table with luminaires but are identified by
/// their GroupSlug values and have no electrical specifications.
/// </summary>
public static class FurnitureEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/furniture").WithTags("Furniture");

        group.MapGet("/search", SearchAsync)
            .WithName("SearchFurniture")
            .WithSummary("Search BEGA outdoor furniture and urban design elements.");
    }

    // ── GET /api/furniture/search ─────────────────────────────────────────────

    private static async Task<IResult> SearchAsync(
        [FromQuery] string? q,
        [FromQuery] string? type,
        [FromQuery] string? application,
        [FromQuery] string? material,
        [FromQuery] bool? illuminated,
        [FromQuery] int topK = 10,
        IFurnitureSearchService furnitureSearch = default!,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Results.BadRequest("Query parameter 'q' is required.");

        var results = await furnitureSearch.SearchAsync(
            query: q,
            furnitureType: type,
            application: application,
            material: material,
            illuminated: illuminated,
            topK: Math.Clamp(topK, 1, 50),
            ct: ct);

        return Results.Ok(results);
    }
}
