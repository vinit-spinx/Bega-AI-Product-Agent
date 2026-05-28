using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Generates curated multi-area product recommendations for named project types and building typologies.
/// Used by the <c>recommend_for_project</c> Claude tool.
/// Internally calls <c>IProductSearchService</c> per area and assembles a structured recommendation set.
/// </summary>
public interface IProjectRecommendationService
{
    /// <summary>
    /// Produces a recommendation set grouped by project area.
    /// For each area, searches the catalog using the project type and area name as the query context,
    /// applying style keywords and budget constraints where provided.
    /// </summary>
    /// <param name="projectType">Named project type e.g. "5-star hotel", "university campus", "luxury villa".</param>
    /// <param name="areas">
    /// List of areas to recommend for e.g. ["entrance", "pathways", "facade", "parking"].
    /// When null, the service infers relevant areas from the project type.
    /// </param>
    /// <param name="budgetUsd">
    /// Optional upper ceiling on total DNP in USD.
    /// When set, lower-price options are prioritised and the response flags if the total exceeds budget.
    /// </param>
    /// <param name="styleKeywords">Design style hints e.g. ["minimalist", "warm white", "dark sky"].</param>
    /// <param name="category">Scope to "Exterior", "Interior", or null for both.</param>
    /// <returns>One <see cref="ProjectAreaRecommendation"/> per area, each with top product matches and rationale.</returns>
    Task<List<ProjectAreaRecommendation>> RecommendAsync(
        string projectType,
        List<string>? areas = null,
        decimal? budgetUsd = null,
        List<string>? styleKeywords = null,
        string? category = null,
        CancellationToken ct = default);
}
