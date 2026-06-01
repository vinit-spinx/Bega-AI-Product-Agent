using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Generates curated multi-area product recommendations for named project types.
/// Each area is mapped to the appropriate luminaire group so results are diverse
/// (e.g. entrance → Wall, pathways → Bollard, facade → Floodlight).
/// Falls back to an unfiltered search when the group-constrained search returns nothing.
/// </summary>
public sealed class ProjectRecommendationService : IProjectRecommendationService
{
    private readonly IProductSearchService _productSearch;
    private readonly ILogger<ProjectRecommendationService> _logger;

    // Default areas inferred per project type when the caller provides none
    private static readonly Dictionary<string, string[]> DefaultAreasByProjectType =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["hotel"]            = ["entrance", "pathways", "facade", "parking", "landscape"],
            ["5-star hotel"]     = ["entrance", "pathways", "facade", "pool area", "landscape"],
            ["luxury hotel"]     = ["entrance", "pathways", "facade", "pool area", "landscape"],
            ["villa"]            = ["entrance", "driveway", "garden", "pool area", "facade"],
            ["luxury villa"]     = ["entrance", "driveway", "garden", "pool area", "facade"],
            ["university campus"]= ["pathways", "parking", "entrance", "landscape", "sports areas"],
            ["campus"]           = ["pathways", "parking", "entrance", "landscape"],
            ["park"]             = ["pathways", "landscape", "entrance", "seating areas"],
            ["public park"]      = ["pathways", "landscape", "feature trees", "seating areas"],
            ["airport"]          = ["entrance canopy", "access roads", "parking", "landscape"],
            ["hospital"]         = ["entrance", "car park", "pathways", "emergency access"],
            ["shopping mall"]    = ["entrance", "car park", "pathways", "facade"],
            ["waterfront"]       = ["promenade", "seating areas", "feature lighting", "pathways"],
            ["residential"]      = ["entrance", "driveway", "garden", "pathways"],
        };

    /// <summary>
    /// Maps each project area to the luminaire groups most appropriate for that space.
    /// First entry in the array is the primary group tried first; subsequent entries are fallbacks
    /// tried in sequence until results are found.
    /// </summary>
    private static readonly Dictionary<string, string[]> AreaGroupPriority =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["entrance"]         = ["Wall", "Bollard", "In-grade"],
            ["pathways"]         = ["Bollard", "Garden"],
            ["pathway"]          = ["Bollard", "Garden"],
            ["facade"]           = ["Floodlight", "Wall"],
            ["parking"]          = ["Floodlight", "Pole-top", "Pole"],
            ["landscape"]        = ["Garden", "Bollard"],
            ["pool area"]        = ["In-grade", "Recessed Wall"],
            ["garden"]           = ["Garden", "Bollard"],
            ["driveway"]         = ["Bollard", "In-grade"],
            ["feature trees"]    = ["Floodlight", "In-grade"],
            ["seating areas"]    = ["Bollard", "Garden"],
            ["promenade"]        = ["Bollard", "Garden"],
            ["feature lighting"] = ["Floodlight"],
            ["car park"]         = ["Floodlight", "Pole-top"],
            ["emergency access"] = ["Floodlight", "Wall"],
            ["entrance canopy"]  = ["Recessed Ceiling", "Ceiling"],
            ["access roads"]     = ["Floodlight", "Pole"],
            ["sports areas"]     = ["Floodlight"],
        };

    /// <summary>
    /// Area-specific query text that names the expected product type explicitly,
    /// giving the vector search a strong semantic signal beyond just the area name.
    /// </summary>
    private static readonly Dictionary<string, string> AreaQueryHints =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["entrance"]         = "architectural wall bollard accent luminaire hotel entrance",
            ["pathways"]         = "bollard pedestrian pathway walkway exterior luminaire",
            ["pathway"]          = "bollard pedestrian pathway walkway exterior luminaire",
            ["facade"]           = "floodlight facade wall wash architectural exterior luminaire",
            ["parking"]          = "parking area floodlight pole exterior luminaire",
            ["landscape"]        = "garden landscape accent bollard exterior luminaire",
            ["pool area"]        = "in-grade recessed wet area pool exterior luminaire",
            ["garden"]           = "garden path accent landscape bollard exterior luminaire",
            ["driveway"]         = "driveway bollard in-grade path luminaire",
            ["feature trees"]    = "tree uplight floodlight accent in-grade exterior luminaire",
            ["seating areas"]    = "seating area ambient bollard garden exterior luminaire",
            ["promenade"]        = "promenade walkway bollard garden exterior luminaire",
            ["feature lighting"] = "floodlight feature accent architectural luminaire",
            ["car park"]         = "car parking floodlight pole area luminaire",
            ["emergency access"] = "emergency access area wall floodlight luminaire",
            ["entrance canopy"]  = "recessed ceiling canopy entrance interior luminaire",
            ["access roads"]     = "road pole floodlight area luminaire",
            ["sports areas"]     = "sports area floodlight high output luminaire",
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
        var resolvedAreas = (areas is { Count: > 0 }
            ? (IEnumerable<string>)areas
            : InferAreas(projectType)).ToList();

        var styleHint = styleKeywords is { Count: > 0 }
            ? string.Join(", ", styleKeywords)
            : string.Empty;

        decimal? perAreaBudget = budgetUsd.HasValue && resolvedAreas.Count > 0
            ? budgetUsd.Value / resolvedAreas.Count
            : null;

        var tasks = resolvedAreas.Select(area =>
            RecommendForAreaAsync(area, projectType, styleHint, category, perAreaBudget, ct));

        var results = await Task.WhenAll(tasks);
        return [.. results];
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
        // Use area-specific query hint so the vector search targets the right product type
        AreaQueryHints.TryGetValue(area, out var queryHint);
        AreaGroupPriority.TryGetValue(area, out var groupPriority);

        var queryParts = new List<string>
        {
            queryHint ?? $"luminaire for {area}",
            projectType
        };
        if (!string.IsNullOrWhiteSpace(styleHint))
            queryParts.Add(styleHint);

        var query = string.Join(" ", queryParts);

        // Try each group in priority order until we get results
        var candidates = groupPriority ?? [];
        List<ProductSearchResult> products = [];

        foreach (var group in candidates)
        {
            try
            {
                var filters = new ProductSearchFilters
                {
                    Category = category,
                    Group = group,
                    MinLumenOutput = 1,
                    TopK = 3
                };
                products = await _productSearch.SearchByNaturalLanguageAsync(query, filters, ct);
                if (products.Count > 0) break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Search failed for area '{Area}' group '{Group}'", area, group);
            }
        }

        // Final fallback: unfiltered search (no group constraint)
        if (products.Count == 0)
        {
            try
            {
                var fallback = new ProductSearchFilters
                {
                    Category = category,
                    MinLumenOutput = 1,
                    TopK = 3
                };
                products = await _productSearch.SearchByNaturalLanguageAsync(query, fallback, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Fallback search failed for area '{Area}' project '{Project}'", area, projectType);
            }
        }

        if (perAreaBudget.HasValue && products.Count > 0)
        {
            var withinBudget = products
                .Where(p => p.DnpPrice is null || p.DnpPrice <= perAreaBudget.Value)
                .ToList();
            if (withinBudget.Count > 0)
                products = withinBudget;
        }

        var estimatedDnp = products
            .Where(p => p.DnpPrice.HasValue)
            .Sum(p => p.DnpPrice!.Value);

        return new ProjectAreaRecommendation
        {
            AreaName = area,
            RecommendedProducts = products,
            Rationale = BuildRationale(area, projectType, products, perAreaBudget),
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

        var top = products.First();
        var rationale = $"For the {area} of a {projectType}, the BEGA {top.FamilyName ?? top.CatalogNumber} ({top.CatalogNumber}) is recommended";

        if (top.CategoryName is not null)
            rationale += $" as an {top.CategoryName.ToLower()} luminaire";

        if (top.LumenOutputLm.HasValue)
            rationale += $" delivering {top.LumenOutputLm:0}lm";

        rationale += ".";

        if (perAreaBudget.HasValue &&
            products.Any(p => p.DnpPrice.HasValue && p.DnpPrice > perAreaBudget.Value))
            rationale += $" Note: some options exceed the per-area budget of ${perAreaBudget:0.00}.";

        return rationale;
    }

    private static string[] InferAreas(string projectType)
    {
        if (DefaultAreasByProjectType.TryGetValue(projectType, out var exact))
            return exact;

        foreach (var (key, value) in DefaultAreasByProjectType)
        {
            if (projectType.Contains(key, StringComparison.OrdinalIgnoreCase) ||
                key.Contains(projectType, StringComparison.OrdinalIgnoreCase))
                return value;
        }

        return ["entrance", "pathways", "landscape", "parking"];
    }
}
