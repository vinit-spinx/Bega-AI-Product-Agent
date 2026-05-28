using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Generates curated multi-area product recommendations for named project types.
/// For each project area, builds a targeted natural language query that combines the
/// project type and area context, then calls <see cref="IProductSearchService"/> to search.
/// Budget constraints are applied by filtering out products whose DNP exceeds the per-area ceiling.
/// </summary>
public sealed class ProjectRecommendationService : IProjectRecommendationService
{
    private readonly IProductSearchService _productSearch;
    private readonly ILogger<ProjectRecommendationService> _logger;

    // Default areas inferred per project type when the caller provides none
    private static readonly Dictionary<string, string[]> DefaultAreasByProjectType =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["hotel"] = ["entrance", "pathways", "facade", "parking", "landscape"],
            ["5-star hotel"] = ["entrance", "pathways", "facade", "pool area", "landscape"],
            ["villa"] = ["entrance", "driveway", "garden", "pool area", "facade"],
            ["luxury villa"] = ["entrance", "driveway", "garden", "pool area", "facade"],
            ["university campus"] = ["pathways", "parking", "entrance", "landscape", "sports areas"],
            ["campus"] = ["pathways", "parking", "entrance", "landscape"],
            ["park"] = ["pathways", "landscape", "entrance", "seating areas"],
            ["public park"] = ["pathways", "landscape", "feature trees", "seating areas"],
            ["airport"] = ["entrance canopy", "access roads", "parking", "landscape"],
            ["hospital"] = ["entrance", "car park", "pathways", "emergency access"],
            ["shopping mall"] = ["entrance", "car park", "pathways", "facade"],
            ["waterfront"] = ["promenade", "seating areas", "feature lighting", "pathways"],
            ["residential"] = ["entrance", "driveway", "garden", "pathways"],
        };

    public ProjectRecommendationService(
        IProductSearchService productSearch,
        ILogger<ProjectRecommendationService> logger)
    {
        _productSearch = productSearch;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<List<ProjectAreaRecommendation>> RecommendAsync(
        string projectType,
        List<string>? areas = null,
        decimal? budgetUsd = null,
        List<string>? styleKeywords = null,
        string? category = null,
        CancellationToken ct = default)
    {
        // Resolve areas: use provided list, or infer from project type, or use generic defaults
        var resolvedAreas = (areas is { Count: > 0 }
            ? (IEnumerable<string>)areas
            : InferAreas(projectType)).ToList();
        var styleHint = styleKeywords is { Count: > 0 }
            ? string.Join(", ", styleKeywords)
            : string.Empty;

        // When a budget is set, distribute it evenly across areas as a per-area ceiling
        decimal? perAreaBudget = budgetUsd.HasValue && resolvedAreas.Count > 0
            ? budgetUsd.Value / resolvedAreas.Count
            : null;

        var recommendations = new List<ProjectAreaRecommendation>();
        var tasks = resolvedAreas.Select(area => RecommendForAreaAsync(
            area, projectType, styleHint, category, perAreaBudget, ct));

        var results = await Task.WhenAll(tasks);
        recommendations.AddRange(results);

        return recommendations;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<ProjectAreaRecommendation> RecommendForAreaAsync(
        string area,
        string projectType,
        string styleHint,
        string? category,
        decimal? perAreaBudget,
        CancellationToken ct)
    {
        // Build a focused natural language query for this area
        var queryParts = new List<string>
        {
            $"BEGA luminaire for {area}",
            $"{projectType} project"
        };
        if (!string.IsNullOrWhiteSpace(styleHint))
            queryParts.Add(styleHint);

        var query = string.Join(" ", queryParts);

        var filters = new ProductSearchFilters
        {
            Category = category,
            TopK = 5
        };

        List<ProductSearchResult> products;
        try
        {
            products = await _productSearch.SearchByNaturalLanguageAsync(query, filters, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Product search failed for area '{Area}' in project '{Project}'", area, projectType);
            products = [];
        }

        // Apply per-area budget ceiling: prefer products under the ceiling, only fallback if none qualify
        if (perAreaBudget.HasValue && products.Count > 0)
        {
            var withinBudget = products
                .Where(p => p.DnpPrice is null || p.DnpPrice <= perAreaBudget.Value)
                .ToList();

            if (withinBudget.Count > 0)
                products = withinBudget;
            // else keep all results and note it in rationale
        }

        var estimatedDnp = products
            .Where(p => p.DnpPrice.HasValue)
            .Sum(p => p.DnpPrice!.Value);

        var rationale = BuildRationale(area, projectType, products, perAreaBudget);

        return new ProjectAreaRecommendation
        {
            AreaName = area,
            RecommendedProducts = products,
            Rationale = rationale,
            EstimatedTotalDnp = estimatedDnp
        };
    }

    private static string BuildRationale(
        string area,
        string projectType,
        List<ProductSearchResult> products,
        decimal? perAreaBudget)
    {
        if (products.Count == 0)
            return $"No suitable BEGA products were found for the {area} area. Consider reviewing the catalog filters or expanding the search criteria.";

        var topProduct = products.First();
        var rationale = $"For the {area} of a {projectType}, the BEGA {topProduct.FamilyName ?? topProduct.CatalogNumber} ({topProduct.CatalogNumber}) is recommended";

        if (topProduct.CategoryName is not null)
            rationale += $" as an {topProduct.CategoryName.ToLower()} luminaire";

        if (topProduct.LumenOutputLm.HasValue)
            rationale += $" delivering {topProduct.LumenOutputLm:0}lm";

        rationale += ".";

        if (perAreaBudget.HasValue)
        {
            var overBudget = products.Any(p => p.DnpPrice.HasValue && p.DnpPrice > perAreaBudget.Value);
            if (overBudget)
                rationale += $" Note: some options exceed the per-area budget of ${perAreaBudget:0.00}.";
        }

        return rationale;
    }

    private static string[] InferAreas(string projectType)
    {
        // Try exact match first, then partial match
        if (DefaultAreasByProjectType.TryGetValue(projectType, out var exact))
            return exact;

        foreach (var (key, value) in DefaultAreasByProjectType)
        {
            if (projectType.Contains(key, StringComparison.OrdinalIgnoreCase) ||
                key.Contains(projectType, StringComparison.OrdinalIgnoreCase))
                return value;
        }

        // Generic fallback areas for unknown project types
        return ["entrance", "pathways", "landscape", "parking"];
    }
}
