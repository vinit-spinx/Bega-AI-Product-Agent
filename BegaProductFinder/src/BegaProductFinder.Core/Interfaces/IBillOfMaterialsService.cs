using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Assembles a priced bill of materials by looking up DNP and MSRP from the Products table.
/// Used by the <c>generate_bill_of_materials</c> Claude tool.
/// Never estimates prices — all values come directly from the database.
/// </summary>
public interface IBillOfMaterialsService
{
    /// <summary>
    /// Generates a fully priced BOM for the given list of catalog numbers and quantities.
    /// For each item: looks up the product, multiplies DNP/MSRP by quantity, and sums totals.
    /// Catalog numbers not found in the database are collected in <see cref="BomReport.NotFoundItems"/>.
    /// </summary>
    /// <param name="items">One or more <see cref="BomLineRequest"/> entries with catalog number, quantity, and area label.</param>
    /// <param name="projectName">Optional project name included in the report header.</param>
    /// <returns>A <see cref="BomReport"/> with line items, subtotals, and any not-found catalog numbers.</returns>
    Task<BomReport> GenerateAsync(
        List<BomLineRequest> items,
        string? projectName = null,
        CancellationToken ct = default);
}
