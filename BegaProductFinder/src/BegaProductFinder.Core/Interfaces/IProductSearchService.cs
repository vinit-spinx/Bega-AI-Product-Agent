using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Hybrid product search combining vector similarity (pgvector) with structured SQL filtering.
/// Used by the <c>search_products</c>, <c>filter_by_specs</c>, and <c>get_product_detail</c> Claude tools.
/// </summary>
public interface IProductSearchService
{
    /// <summary>
    /// Performs a hybrid search: embeds the query, runs pgvector ANN search, then re-ranks
    /// results with SQL-side filters from <paramref name="filters"/>.
    /// Furniture products (identified by GroupSlug) are excluded from results.
    /// </summary>
    /// <param name="query">Natural language search query e.g. "exterior in-grade luminaire 24V dark sky".</param>
    /// <param name="filters">Optional structured filters applied after vector retrieval.</param>
    /// <returns>Ranked list of matching luminaire products.</returns>
    Task<List<ProductSearchResult>> SearchByNaturalLanguageAsync(
        string query,
        ProductSearchFilters? filters = null,
        CancellationToken ct = default);

    /// <summary>
    /// Applies precise numerical filters to product spec columns without vector search.
    /// Used for queries with exact numerical requirements e.g. "lumens >= 500".
    /// </summary>
    /// <param name="filters">One or more <see cref="SpecFilter"/> conditions — all must match (AND logic).</param>
    Task<List<ProductSearchResult>> FilterBySpecsAsync(
        List<SpecFilter> filters,
        CancellationToken ct = default);

    /// <summary>
    /// Retrieves the full specification record for a single product by catalog number.
    /// Returns null if the catalog number does not exist in the database.
    /// </summary>
    /// <param name="catalogNumber">BEGA catalog number e.g. "77127".</param>
    Task<ProductDetail?> GetProductDetailAsync(
        string catalogNumber,
        CancellationToken ct = default);
}
