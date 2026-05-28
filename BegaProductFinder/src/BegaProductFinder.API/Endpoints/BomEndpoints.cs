using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Bill of materials endpoint — assembles a priced BOM from a list of catalog numbers and quantities.
/// All prices come from the SQL Server Products table; no values are estimated.
/// </summary>
public static class BomEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/bom").WithTags("BOM");

        group.MapPost("/generate", GenerateAsync)
            .WithName("GenerateBom")
            .WithSummary("Generate a priced bill of materials from catalog numbers and quantities.");
    }

    // ── POST /api/bom/generate ────────────────────────────────────────────────

    private static async Task<IResult> GenerateAsync(
        [FromBody] BomGenerateRequest request,
        IBillOfMaterialsService bomService,
        CancellationToken ct)
    {
        if (request.Items is not { Count: > 0 })
            return Results.BadRequest("At least one item is required.");

        foreach (var item in request.Items)
        {
            if (string.IsNullOrWhiteSpace(item.CatalogNumber))
                return Results.BadRequest("Each item must have a non-empty catalogNumber.");
            if (item.Quantity <= 0)
                return Results.BadRequest($"Quantity for '{item.CatalogNumber}' must be greater than zero.");
        }

        var lineRequests = request.Items
            .Select(i => new BomLineRequest(i.CatalogNumber.Trim(), i.Quantity, i.AreaLabel))
            .ToList();

        var report = await bomService.GenerateAsync(lineRequests, request.ProjectName, ct);
        return Results.Ok(report);
    }
}

/// <summary>Request body for <c>POST /api/bom/generate</c>.</summary>
public sealed record BomGenerateRequest(
    string? ProjectName,
    List<BomItemRequest> Items
);

/// <summary>A single line in a BOM generation request.</summary>
public sealed record BomItemRequest(
    string CatalogNumber,
    int Quantity,
    string? AreaLabel
);
