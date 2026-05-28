using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// REST endpoints for direct product catalog access — search, detail, and hierarchy navigation.
/// </summary>
public static class ProductEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/products").WithTags("Products");

        group.MapGet("/search", SearchAsync)
            .WithName("SearchProducts")
            .WithSummary("Natural language product search with optional structured filters.");

        group.MapGet("/families", GetFamiliesAsync)
            .WithName("GetFamilies")
            .WithSummary("List product families, optionally filtered by category and group.");

        group.MapGet("/hierarchy", GetHierarchyAsync)
            .WithName("GetHierarchy")
            .WithSummary("Return the full category → group → family navigation hierarchy.");

        // Must come last to avoid shadowing /families and /hierarchy
        group.MapGet("/{catalogNumber}", GetDetailAsync)
            .WithName("GetProductDetail")
            .WithSummary("Full specifications for a single product by catalog number.");
    }

    // ── GET /api/products/search ──────────────────────────────────────────────

    private static async Task<IResult> SearchAsync(
        [FromQuery] string? q,
        [FromQuery] string? category,
        [FromQuery] string? group,
        [FromQuery] string? family,
        [FromQuery] decimal? minWattage,
        [FromQuery] decimal? maxWattage,
        [FromQuery] decimal? minLumens,
        [FromQuery] string? voltage,
        [FromQuery] string? controlProtocol,
        [FromQuery] bool? adaCompliant,
        [FromQuery] bool? expressDelivery,
        [FromQuery] int topK = 10,
        IProductSearchService productSearch = default!,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Results.BadRequest("Query parameter 'q' is required.");

        var filters = new ProductSearchFilters
        {
            Category = category,
            Group = group,
            FamilyName = family,
            MinWattageW = minWattage,
            MaxWattageW = maxWattage,
            MinLumenOutput = minLumens,
            Voltage = voltage,
            ControlProtocol = controlProtocol,
            AdaCompliant = adaCompliant,
            ExpressDelivery = expressDelivery,
            TopK = Math.Clamp(topK, 1, 50)
        };

        var results = await productSearch.SearchByNaturalLanguageAsync(q, filters, ct);
        return Results.Ok(results);
    }

    // ── GET /api/products/{catalogNumber} ─────────────────────────────────────

    private static async Task<IResult> GetDetailAsync(
        string catalogNumber,
        IProductSearchService productSearch,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(catalogNumber))
            return Results.BadRequest("catalogNumber is required.");

        var detail = await productSearch.GetProductDetailAsync(catalogNumber.Trim(), ct);
        return detail is null
            ? Results.NotFound(new { catalogNumber, message = "Product not found in catalog." })
            : Results.Ok(detail);
    }

    // ── GET /api/products/families ────────────────────────────────────────────

    private static async Task<IResult> GetFamiliesAsync(
        [FromQuery] string? category,
        [FromQuery] string? group,
        IFamilyBrowseService browse,
        CancellationToken ct)
    {
        var families = await browse.GetFamiliesAsync(category, group, ct);
        return Results.Ok(families);
    }

    // ── GET /api/products/hierarchy ───────────────────────────────────────────

    private static async Task<IResult> GetHierarchyAsync(
        IFamilyBrowseService browse,
        CancellationToken ct)
    {
        var categories = await browse.GetCategoriesAsync(ct);
        var groups = await browse.GetGroupsAsync(ct: ct);
        var families = await browse.GetFamiliesAsync(ct: ct);

        return Results.Ok(new
        {
            categories,
            groups,
            families
        });
    }
}
