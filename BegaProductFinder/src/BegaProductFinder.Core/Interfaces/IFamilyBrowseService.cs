using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Navigates the BEGA product hierarchy: Category → Group → Family → Products.
/// Used by the <c>browse_by_hierarchy</c> Claude tool.
/// All queries use Dapper against SQL Server — no vector search involved.
/// </summary>
public interface IFamilyBrowseService
{
    /// <summary>Returns the distinct list of top-level category names e.g. ["Exterior", "Interior"].</summary>
    Task<List<string>> GetCategoriesAsync(CancellationToken ct = default);

    /// <summary>
    /// Returns the distinct list of group names, optionally filtered by category.
    /// </summary>
    /// <param name="category">Optional category filter e.g. "Exterior".</param>
    Task<List<string>> GetGroupsAsync(
        string? category = null,
        CancellationToken ct = default);

    /// <summary>
    /// Returns product families at the family level of the hierarchy,
    /// optionally scoped to a category and/or group.
    /// </summary>
    /// <param name="category">Optional category filter e.g. "Exterior".</param>
    /// <param name="group">Optional group name filter e.g. "In-grade".</param>
    Task<List<FamilyBrowseResult>> GetFamiliesAsync(
        string? category = null,
        string? group = null,
        CancellationToken ct = default);

    /// <summary>
    /// Returns all products belonging to a specific family, identified by its slug.
    /// </summary>
    /// <param name="familySlug">Family slug e.g. "130033".</param>
    Task<List<ProductSearchResult>> GetProductsByFamilyAsync(
        string familySlug,
        CancellationToken ct = default);
}
