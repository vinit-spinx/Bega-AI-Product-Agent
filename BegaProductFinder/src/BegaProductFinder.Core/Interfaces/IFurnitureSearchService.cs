using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Searches the BEGA outdoor furniture and urban design catalog.
/// Furniture products share the Products table with luminaires but are identified by their
/// <c>GroupSlug</c> values listed in <c>specsMapping.json → furniture_group_slugs</c>.
/// Used by the <c>search_furniture</c> Claude tool.
/// </summary>
public interface IFurnitureSearchService
{
    /// <summary>
    /// Searches for furniture products matching the query and optional structured filters.
    /// Uses hybrid vector + SQL search, scoped to furniture GroupSlugs only.
    /// </summary>
    /// <param name="query">Natural language query e.g. "outdoor benches for a waterfront plaza".</param>
    /// <param name="furnitureType">Optional type filter e.g. "bench", "bollard", "planter", "modular seating".</param>
    /// <param name="application">Optional application context e.g. "public plaza", "campus", "smart city".</param>
    /// <param name="material">Optional material filter e.g. "steel", "concrete", "wood".</param>
    /// <param name="illuminated">When true, restricts to furniture with integrated lighting.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    Task<List<FurnitureSearchResult>> SearchAsync(
        string query,
        string? furnitureType = null,
        string? application = null,
        string? material = null,
        bool? illuminated = null,
        int topK = 5,
        string[]? excludedCatalogNumbers = null,
        CancellationToken ct = default);
}
