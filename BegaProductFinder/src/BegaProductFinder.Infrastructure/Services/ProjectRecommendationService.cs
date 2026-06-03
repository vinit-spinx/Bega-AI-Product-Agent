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

    // Default areas inferred per project type when the caller provides none.
    // Organised by the eight sector categories:
    //   Civic & Cultural | Hospitality | Healthcare | Corporate Offices |
    //   Education & Research | Sports & Recreation | Residential | Transportation
    private static readonly Dictionary<string, string[]> DefaultAreasByProjectType =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // ── Civic & Cultural ──────────────────────────────────────────────
            ["museum"] = ["entrance", "outdoor sculpture garden", "pathways", "facade", "parking"],
            ["art gallery"] = ["entrance", "outdoor exhibition area", "facade", "pathways", "parking"],
            ["library"] = ["entrance", "outdoor reading areas", "pathways", "parking", "facade"],
            ["theater"] = ["entrance", "forecourt", "facade", "pathways", "parking"],
            ["concert hall"] = ["entrance", "forecourt", "facade", "pathways", "parking"],
            ["opera house"] = ["entrance", "forecourt", "facade", "outdoor plaza", "pathways"],
            ["cultural center"] = ["entrance", "outdoor plaza", "pathways", "facade", "parking"],
            ["community center"] = ["entrance", "outdoor plaza", "pathways", "sports courts", "parking"],
            ["government building"] = ["entrance", "forecourt", "pathways", "flag area", "parking"],
            ["courthouse"] = ["entrance", "forecourt", "pathways", "parking", "landscape"],
            ["city hall"] = ["entrance", "forecourt", "outdoor plaza", "pathways", "landscape"],
            ["place of worship"] = ["entrance", "garden", "pathways", "parking", "facade"],
            ["mosque"] = ["entrance", "courtyard", "garden", "pathways", "parking"],
            ["church"] = ["entrance", "garden", "pathways", "parking", "facade"],
            ["memorial"] = ["entrance", "feature lighting", "pathways", "landscape", "seating areas"],
            ["monument"] = ["feature lighting", "pathways", "landscape", "seating areas"],
            ["civic plaza"] = ["outdoor plaza", "seating areas", "pathways", "feature lighting", "landscape"],
            ["public square"] = ["outdoor plaza", "seating areas", "pathways", "feature lighting", "landscape"],

            // ── Hospitality ───────────────────────────────────────────────────
            ["hotel"] = ["entrance", "pathways", "facade", "parking", "landscape"],
            ["5-star hotel"] = ["entrance", "pathways", "facade", "pool area", "landscape"],
            ["luxury hotel"] = ["entrance", "pathways", "facade", "pool area", "landscape"],
            ["boutique hotel"] = ["entrance", "courtyard", "garden", "facade", "parking"],
            ["resort"] = ["entrance", "beach access", "pool area", "outdoor dining", "landscape"],
            ["beach resort"] = ["entrance", "beach access", "pool area", "outdoor dining", "promenade"],
            ["spa resort"] = ["entrance", "pool area", "relaxation garden", "pathways", "facade"],
            ["restaurant"] = ["entrance", "outdoor dining", "parking", "facade", "landscape"],
            ["fine dining restaurant"] = ["entrance", "outdoor terrace", "facade", "garden", "parking"],
            ["bar"] = ["entrance", "outdoor terrace", "facade", "pathways"],
            ["cafe"] = ["entrance", "outdoor seating", "facade", "pathways"],
            ["spa"] = ["entrance", "pool area", "relaxation garden", "pathways", "facade"],
            ["waterfront"] = ["promenade", "seating areas", "feature lighting", "pathways"],
            ["shopping mall"] = ["entrance", "car park", "pathways", "facade"],
            ["retail park"] = ["entrance", "car park", "pathways", "facade", "landscape"],

            // ── Healthcare ────────────────────────────────────────────────────
            ["hospital"] = ["entrance", "car park", "pathways", "emergency access"],
            ["medical center"] = ["entrance", "car park", "pathways", "ambulance bay", "landscape"],
            ["clinic"] = ["entrance", "parking", "pathways", "facade"],
            ["nursing home"] = ["entrance", "garden", "pathways", "parking", "seating areas"],
            ["care home"] = ["entrance", "garden", "pathways", "parking", "seating areas"],
            ["rehabilitation center"] = ["entrance", "therapy garden", "pathways", "parking", "seating areas"],
            ["mental health facility"] = ["entrance", "therapeutic garden", "pathways", "seating areas", "parking"],
            ["dental clinic"] = ["entrance", "parking", "pathways", "facade"],
            ["pharmacy"] = ["entrance", "parking", "pathways", "facade"],
            ["wellness center"] = ["entrance", "outdoor relaxation area", "pathways", "parking", "facade"],

            // ── Corporate Offices ─────────────────────────────────────────────
            ["office building"] = ["entrance", "outdoor plaza", "car park", "pathways", "facade"],
            ["corporate headquarters"] = ["entrance", "outdoor plaza", "car park", "pathways", "facade", "landscape"],
            ["business park"] = ["entrance", "pathways", "car park", "landscape", "outdoor seating"],
            ["tech campus"] = ["entrance", "outdoor collaboration areas", "pathways", "parking", "landscape"],
            ["co-working space"] = ["entrance", "outdoor terrace", "parking", "pathways", "facade"],
            ["data center"] = ["entrance", "perimeter security", "car park", "pathways", "facade"],
            ["mixed use development"] = ["entrance", "outdoor plaza", "pathways", "car park", "facade", "landscape"],

            // ── Education & Research ──────────────────────────────────────────
            ["university campus"] = ["pathways", "parking", "entrance", "landscape", "sports areas"],
            ["campus"] = ["pathways", "parking", "entrance", "landscape"],
            ["school"] = ["entrance", "playgrounds", "pathways", "parking", "sports fields"],
            ["primary school"] = ["entrance", "playgrounds", "pathways", "parking"],
            ["secondary school"] = ["entrance", "sports courts", "pathways", "parking", "landscape"],
            ["college"] = ["entrance", "pathways", "parking", "landscape", "outdoor study areas"],
            ["research center"] = ["entrance", "pathways", "parking", "outdoor labs", "landscape"],
            ["laboratory"] = ["entrance", "pathways", "parking", "service yard", "facade"],
            ["science park"] = ["entrance", "pathways", "parking", "landscape", "outdoor seating"],
            ["student accommodation"] = ["entrance", "pathways", "parking", "garden", "common areas"],

            // ── Sports & Recreation ───────────────────────────────────────────
            ["stadium"] = ["entrance", "concourse", "parking", "pathways", "facade"],
            ["football stadium"] = ["entrance", "concourse", "parking", "pathways", "perimeter"],
            ["sports center"] = ["entrance", "outdoor courts", "parking", "pathways", "facade"],
            ["sports complex"] = ["entrance", "outdoor courts", "parking", "pathways", "landscape"],
            ["swimming complex"] = ["entrance", "poolside", "pathways", "parking", "landscape"],
            ["aquatic center"] = ["entrance", "poolside", "pathways", "parking", "landscape"],
            ["golf course"] = ["entrance", "pathways", "parking", "clubhouse", "course lighting"],
            ["tennis club"] = ["entrance", "outdoor courts", "pathways", "parking", "clubhouse"],
            ["gym"] = ["entrance", "outdoor training area", "parking", "pathways"],
            ["fitness center"] = ["entrance", "outdoor training area", "parking", "pathways", "facade"],
            ["recreation center"] = ["entrance", "outdoor play areas", "pathways", "parking", "landscape"],
            ["cycling track"] = ["entrance", "track perimeter", "pathways", "parking", "seating areas"],
            ["park"] = ["pathways", "landscape", "entrance", "seating areas"],
            ["public park"] = ["pathways", "landscape", "feature trees", "seating areas"],
            ["botanical garden"] = ["entrance", "feature trees", "pathways", "seating areas", "water features"],
            ["playground"] = ["entrance", "play equipment area", "pathways", "parking"],
            ["marina"] = ["entrance", "dock walkways", "parking", "waterfront", "clubhouse"],

            // ── Residential ───────────────────────────────────────────────────
            ["villa"] = ["entrance", "driveway", "garden", "pool area", "facade"],
            ["luxury villa"] = ["entrance", "driveway", "garden", "pool area", "facade"],
            ["residential"] = ["entrance", "driveway", "garden", "pathways"],
            ["apartment complex"] = ["entrance", "pathways", "parking", "garden", "common areas"],
            ["residential complex"] = ["entrance", "pathways", "parking", "garden", "common areas"],
            ["housing estate"] = ["entrance", "pathways", "parking", "common garden", "play areas"],
            ["condo"] = ["entrance", "lobby", "pathways", "parking", "pool area"],
            ["condominium"] = ["entrance", "lobby", "pathways", "parking", "pool area"],
            ["townhouse"] = ["entrance", "driveway", "garden", "pathways"],
            ["penthouse"] = ["entrance", "terrace", "garden", "facade"],
            ["gated community"] = ["entrance gate", "pathways", "common garden", "parking", "sports areas"],

            // ── Transportation ────────────────────────────────────────────────
            ["airport"] = ["entrance canopy", "access roads", "parking", "landscape"],
            ["train station"] = ["entrance", "platforms", "pathways", "parking", "drop-off zone"],
            ["railway station"] = ["entrance", "platforms", "pathways", "parking", "drop-off zone"],
            ["bus terminal"] = ["entrance", "platforms", "pathways", "parking", "drop-off zone"],
            ["bus station"] = ["entrance", "platforms", "pathways", "parking"],
            ["metro station"] = ["entrance", "pathways", "parking", "drop-off zone"],
            ["subway station"] = ["entrance", "pathways", "drop-off zone", "landscape"],
            ["ferry terminal"] = ["entrance", "dock walkways", "parking", "waterfront", "pathways"],
            ["port"] = ["entrance", "dock walkways", "parking", "waterfront", "perimeter"],
            ["logistics hub"] = ["entrance", "loading bays", "perimeter security", "car park", "pathways"],
            ["parking structure"] = ["entrance", "ramps", "pedestrian pathways", "facade", "street level"],
            ["highway rest area"] = ["entrance", "parking", "pathways", "landscape", "seating areas"],
        };

    /// <summary>
    /// Maps each project area to the BEGA product groups most appropriate for that space.
    /// Groups match the exact GroupsName values from the BEGA US catalog
    /// (Lighting › Exterior, Lighting › Interior, Controls › Hardware,
    /// Furniture › Furniture). First entry is the primary group; subsequent entries are fallbacks
    /// tried in sequence until results are found.
    /// </summary>
    private static readonly Dictionary<string, string[]> AreaGroupPriority =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // ── Ground / path level ───────────────────────────────────────────
            ["entrance"] = ["Wall", "Bollard", "In-grade", "Recessed Wall"],
            ["entrance gate"] = ["Wall", "Bollard", "In-grade"],
            ["pathways"] = ["Bollard", "Garden", "In-grade"],
            ["pathway"] = ["Bollard", "Garden", "In-grade"],
            ["driveway"] = ["Bollard", "In-grade", "Garden"],
            ["promenade"] = ["Bollard", "Garden", "Pole-top"],
            ["pedestrian pathways"] = ["Bollard", "Garden", "In-grade"],
            ["dock walkways"] = ["Bollard", "Garden", "In-grade"],
            ["beach access"] = ["Bollard", "In-grade", "Floodlight"],
            ["platforms"] = ["Recessed Wall", "Wall", "Bollard", "Ceiling"],
            ["concourse"] = ["Floodlight", "Pole-top", "Bollard"],

            // ── Facade / architectural ────────────────────────────────────────
            ["facade"] = ["Floodlight", "Linear Facade", "Wall", "Building Element"],
            ["linear facade"] = ["Linear Facade", "Floodlight"],
            ["building element"] = ["Building Element", "Linear Facade"],
            ["feature lighting"] = ["Floodlight", "Linear Facade", "In-grade"],

            // ── Overhead canopy ───────────────────────────────────────────────
            ["entrance canopy"] = ["Recessed Ceiling", "Ceiling", "Pendant"],
            ["covered walkways"] = ["Recessed Ceiling", "Ceiling", "Catenary"],

            // ── Overhead span / catenary ──────────────────────────────────────
            ["outdoor dining"] = ["Catenary", "Pendant", "Wall", "Garden"],
            ["outdoor terrace"] = ["Catenary", "Wall", "Garden", "Bollard"],
            ["terrace"] = ["Wall", "Pendant", "Catenary", "Garden"],

            // ── Vehicle / parking ─────────────────────────────────────────────
            ["parking"] = ["Floodlight", "Pole-top", "Pole"],
            ["car park"] = ["Floodlight", "Pole-top", "Pole"],
            ["access roads"] = ["Pole", "Pole-top", "Floodlight"],
            ["drop-off zone"] = ["Floodlight", "Wall", "Pole-top"],
            ["ambulance bay"] = ["Floodlight", "Wall"],
            ["emergency access"] = ["Floodlight", "Wall", "Pole"],
            ["loading bays"] = ["Floodlight", "Wall", "Pole"],
            ["service yard"] = ["Floodlight", "Wall"],
            ["ramps"] = ["Recessed Wall", "Wall", "In-grade"],
            ["street level"] = ["Bollard", "Wall", "Floodlight"],

            // ── Perimeter / security ──────────────────────────────────────────
            ["perimeter"] = ["Floodlight", "Pole", "Wall"],
            ["perimeter security"] = ["Floodlight", "Wall", "Pole"],

            // ── Landscape / nature ────────────────────────────────────────────
            ["landscape"] = ["Garden", "Bollard", "Floodlight"],
            ["garden"] = ["Garden", "Bollard", "In-grade"],
            ["pool area"] = ["In-grade", "Recessed Wall", "Wall"],
            ["poolside"] = ["In-grade", "Recessed Wall", "Wall"],
            ["feature trees"] = ["Floodlight", "In-grade", "Garden"],
            ["water features"] = ["In-grade", "Floodlight"],
            ["outdoor sculpture garden"] = ["Floodlight", "In-grade", "Garden"],
            ["outdoor exhibition area"] = ["Floodlight", "In-grade", "Wall"],
            ["therapy garden"] = ["Garden", "Bollard", "Wall"],
            ["therapeutic garden"] = ["Garden", "Bollard", "Wall"],
            ["relaxation garden"] = ["Garden", "Bollard", "Wall"],
            ["common garden"] = ["Garden", "Bollard"],
            ["botanical garden"] = ["Floodlight", "In-grade", "Garden"],
            ["outdoor relaxation area"] = ["Garden", "Bollard", "Wall"],

            // ── Play & recreation ─────────────────────────────────────────────
            ["play areas"] = ["Bollard", "Garden", "Floodlight"],
            ["play equipment area"] = ["Bollard", "Floodlight", "Garden"],
            ["playgrounds"] = ["Bollard", "Garden", "Floodlight"],
            ["sports areas"] = ["Floodlight", "Pole"],
            ["sports courts"] = ["Floodlight", "Pole"],
            ["sports fields"] = ["Floodlight", "Pole"],
            ["outdoor courts"] = ["Floodlight", "Pole"],
            ["outdoor training area"] = ["Floodlight", "Bollard"],
            ["track perimeter"] = ["Floodlight", "Pole"],
            ["putting greens"] = ["In-grade", "Floodlight"],
            ["course lighting"] = ["Floodlight", "In-grade"],

            // ── Public / civic spaces ─────────────────────────────────────────
            ["outdoor plaza"] = ["Bollard", "Floodlight", "Pole-top", "Garden"],
            ["forecourt"] = ["Bollard", "Floodlight", "Wall", "In-grade"],
            ["courtyard"] = ["Wall", "Bollard", "Garden", "In-grade", "Pendant"],
            ["flag area"] = ["Floodlight"],
            ["waterfront"] = ["Bollard", "Floodlight", "In-grade"],
            ["memorial lighting"] = ["Floodlight", "In-grade", "Garden"],

            // ── Seating / social ──────────────────────────────────────────────
            ["seating areas"] = ["Bollard", "Garden", "Wall"],
            ["outdoor seating"] = ["Bollard", "Garden", "Wall"],
            ["outdoor reading areas"] = ["Bollard", "Garden", "Wall"],
            ["outdoor study areas"] = ["Bollard", "Garden", "Wall"],
            ["outdoor collaboration areas"] = ["Bollard", "Garden", "Catenary"],
            ["relaxation areas"] = ["Garden", "Bollard", "Wall"],
            ["common areas"] = ["Bollard", "Garden", "Wall"],

            // ── Work / research (exterior) ────────────────────────────────────
            ["outdoor labs"] = ["Floodlight", "Wall"],

            // ── Hospitality exterior ──────────────────────────────────────────
            ["clubhouse"] = ["Wall", "Pendant", "Recessed Ceiling"],

            // ── Interior ─────────────────────────────────────────────────────
            ["lobby"] = ["Recessed Ceiling", "Wall", "Pendant", "Suspended"],
            ["hotel lobby"] = ["Recessed Ceiling", "Wall", "Pendant", "Suspended"],
            ["student accommodation"] = ["Recessed Ceiling", "Wall", "Ceiling"],
        };

    /// <summary>
    /// Area-specific natural language query hints that give the vector search a strong
    /// semantic signal, naming the expected product type and typical application context.
    /// </summary>
    private static readonly Dictionary<string, string> AreaQueryHints =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // ── Ground / path level ───────────────────────────────────────────
            ["entrance"] = "architectural wall bollard accent luminaire entrance",
            ["entrance gate"] = "gate bollard wall luminaire gated entrance",
            ["pathways"] = "bollard pedestrian pathway walkway exterior luminaire",
            ["pathway"] = "bollard pedestrian pathway walkway exterior luminaire",
            ["driveway"] = "driveway bollard in-grade path luminaire",
            ["promenade"] = "promenade waterfront walkway bollard garden luminaire",
            ["pedestrian pathways"] = "bollard garden pedestrian path luminaire",
            ["dock walkways"] = "marina dock waterfront bollard path luminaire",
            ["beach access"] = "beach coastal bollard in-grade path luminaire",
            ["platforms"] = "platform recessed wall bollard ceiling luminaire",
            ["concourse"] = "concourse floodlight bollard pole-top luminaire",

            // ── Facade / architectural ────────────────────────────────────────
            ["facade"] = "floodlight linear facade wall wash architectural luminaire",
            ["linear facade"] = "linear facade LED strip architectural building luminaire",
            ["building element"] = "building element architectural integrated facade luminaire",
            ["feature lighting"] = "floodlight feature accent architectural wash luminaire",

            // ── Overhead canopy ───────────────────────────────────────────────
            ["entrance canopy"] = "recessed ceiling canopy pendant entrance luminaire",
            ["covered walkways"] = "recessed ceiling catenary covered walkway luminaire",

            // ── Overhead span / catenary ──────────────────────────────────────
            ["outdoor dining"] = "catenary pendant string outdoor dining restaurant luminaire",
            ["outdoor terrace"] = "catenary wall pendant outdoor terrace luminaire",
            ["terrace"] = "wall pendant catenary terrace garden luminaire",

            // ── Vehicle / parking ─────────────────────────────────────────────
            ["parking"] = "parking lot floodlight pole-top pole area luminaire",
            ["car park"] = "car park floodlight pole-top area luminaire",
            ["access roads"] = "road pole street floodlight area luminaire",
            ["drop-off zone"] = "drop-off floodlight wall pole entrance area luminaire",
            ["ambulance bay"] = "emergency ambulance bay floodlight wall luminaire",
            ["emergency access"] = "emergency access floodlight wall pole luminaire",
            ["loading bays"] = "loading bay floodlight wall industrial luminaire",
            ["service yard"] = "service yard floodlight wall luminaire",
            ["ramps"] = "ramp recessed wall in-grade step luminaire",
            ["street level"] = "street level bollard wall floodlight luminaire",

            // ── Perimeter / security ──────────────────────────────────────────
            ["perimeter"] = "perimeter floodlight pole wall security luminaire",
            ["perimeter security"] = "security perimeter floodlight wall pole luminaire",

            // ── Landscape / nature ────────────────────────────────────────────
            ["landscape"] = "garden landscape bollard accent exterior luminaire",
            ["garden"] = "garden path accent bollard low-level luminaire",
            ["pool area"] = "in-grade recessed wet area pool underwater luminaire",
            ["poolside"] = "poolside in-grade recessed wall wet area luminaire",
            ["feature trees"] = "tree uplight floodlight in-grade accent luminaire",
            ["water features"] = "water feature in-grade floodlight fountain luminaire",
            ["outdoor sculpture garden"] = "sculpture garden floodlight in-grade accent luminaire",
            ["outdoor exhibition area"] = "exhibition display floodlight in-grade wall luminaire",
            ["therapy garden"] = "therapy garden bollard garden soft ambient luminaire",
            ["therapeutic garden"] = "therapeutic garden soft bollard path luminaire",
            ["relaxation garden"] = "relaxation garden bollard garden ambient luminaire",
            ["common garden"] = "communal garden bollard path garden luminaire",
            ["botanical garden"] = "botanical garden in-grade floodlight accent luminaire",
            ["outdoor relaxation area"] = "relaxation outdoor garden bollard ambient luminaire",

            // ── Play & recreation ─────────────────────────────────────────────
            ["play areas"] = "playground bollard garden safe low luminaire",
            ["play equipment area"] = "playground bollard floodlight children luminaire",
            ["playgrounds"] = "playground bollard garden ambient luminaire",
            ["sports areas"] = "sports area floodlight high-output pole luminaire",
            ["sports courts"] = "sports court floodlight pole high-output luminaire",
            ["sports fields"] = "sports field floodlight pole high-output luminaire",
            ["outdoor courts"] = "outdoor court floodlight pole high-output luminaire",
            ["outdoor training area"] = "outdoor training fitness floodlight bollard luminaire",
            ["track perimeter"] = "athletics track perimeter floodlight pole luminaire",
            ["putting greens"] = "golf in-grade floodlight putting green luminaire",
            ["course lighting"] = "golf course floodlight in-grade luminaire",

            // ── Public / civic spaces ─────────────────────────────────────────
            ["outdoor plaza"] = "plaza bollard pole-top floodlight public luminaire",
            ["forecourt"] = "forecourt bollard floodlight wall in-grade luminaire",
            ["courtyard"] = "courtyard wall bollard pendant garden luminaire",
            ["flag area"] = "flagpole floodlight uplight luminaire",
            ["waterfront"] = "waterfront bollard in-grade promenade luminaire",
            ["memorial lighting"] = "memorial monument floodlight in-grade accent luminaire",

            // ── Seating / social ──────────────────────────────────────────────
            ["seating areas"] = "seating area bollard garden ambient luminaire",
            ["outdoor seating"] = "outdoor seating bollard garden ambient luminaire",
            ["outdoor reading areas"] = "reading area bollard garden soft luminaire",
            ["outdoor study areas"] = "study area bollard garden ambient luminaire",
            ["outdoor collaboration areas"] = "collaboration outdoor catenary bollard luminaire",
            ["relaxation areas"] = "relaxation garden bollard ambient soft luminaire",
            ["common areas"] = "common area bollard garden wall luminaire",

            // ── Work / research (exterior) ────────────────────────────────────
            ["outdoor labs"] = "outdoor laboratory floodlight wall luminaire",

            // ── Hospitality exterior ──────────────────────────────────────────
            ["clubhouse"] = "clubhouse wall pendant recessed ceiling luminaire",

            // ── Interior ─────────────────────────────────────────────────────
            ["lobby"] = "lobby recessed ceiling pendant wall suspended luminaire",
            ["student accommodation"] = "student hall recessed ceiling wall luminaire",
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

        // budgetUsd is a per-product price ceiling (e.g. "under $700" = each product ≤ $700).
        // It is NOT a total project budget — never divide it by area count.
        decimal? maxProductPrice = budgetUsd;

        var tasks = resolvedAreas.Select(area =>
            RecommendForAreaAsync(area, projectType, styleHint, category, maxProductPrice, ct));

        var results = await Task.WhenAll(tasks);
        return [.. results];
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<ProjectAreaRecommendation> RecommendForAreaAsync(
        string area,
        string projectType,
        string styleHint,
        string? category,
        decimal? maxProductPrice,
        CancellationToken ct)
    {
        AreaQueryHints.TryGetValue(area, out var queryHint);
        AreaGroupPriority.TryGetValue(area, out var groupPriority);
        var query = string.Join(" ", queryHint ?? $"luminaire for {area}", projectType);
        var candidates = groupPriority ?? [];

        // First pass: search with budget ceiling enforced at SQL level
        var products = await SearchAreaCandidatesAsync(query, candidates, category, maxProductPrice, ct);

        // Second pass: if budget filter returned nothing, retry without it so the user
        // always sees the nearest available options rather than a silent empty area card
        var exceededBudget = false;
        if (products.Count == 0 && maxProductPrice.HasValue)
        {
            products = await SearchAreaCandidatesAsync(query, candidates, category, null, ct);
            exceededBudget = products.Count > 0;
        }

        var estimatedDnp = products
            .Where(p => p.DnpPrice.HasValue)
            .Sum(p => p.DnpPrice!.Value);

        return new ProjectAreaRecommendation
        {
            AreaName = area,
            RecommendedProducts = products,
            Rationale = BuildRationale(area, projectType, products, maxProductPrice, exceededBudget),
            EstimatedTotalDnp = estimatedDnp
        };
    }

    /// <summary>
    /// Tries each area group in priority order, then falls back to an unfiltered search.
    /// The <paramref name="maxDnpPrice"/> ceiling is passed to SQL so only in-budget rows are returned.
    /// </summary>
    private async Task<List<ProductSearchResult>> SearchAreaCandidatesAsync(
        string query,
        string[] groupPriority,
        string? category,
        decimal? maxDnpPrice,
        CancellationToken ct)
    {
        foreach (var group in groupPriority)
        {
            try
            {
                var filters = new ProductSearchFilters
                {
                    Category = category,
                    Group = group,
                    MinLumenOutput = 1,
                    MaxDnpPrice = maxDnpPrice,
                    TopK = 3
                };
                var r = await _productSearch.SearchByNaturalLanguageAsync(query, filters, ct);
                if (r.Count > 0) return r;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Search failed for group '{Group}' query '{Query}'", group, query);
            }
        }

        // No group matched — try without group constraint
        try
        {
            var fallback = new ProductSearchFilters
            {
                Category = category,
                MinLumenOutput = 1,
                MaxDnpPrice = maxDnpPrice,
                TopK = 3
            };
            return await _productSearch.SearchByNaturalLanguageAsync(query, fallback, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unfiltered fallback failed for query '{Query}'", query);
            return [];
        }
    }

    private static string BuildRationale(
        string area,
        string projectType,
        List<ProductSearchResult> products,
        decimal? maxProductPrice,
        bool exceededBudget)
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

        if (exceededBudget && maxProductPrice.HasValue)
            rationale += $" No products were found under ${maxProductPrice:0} for this area — nearest available options are shown. Consider relaxing the budget or choosing a different product type.";

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
