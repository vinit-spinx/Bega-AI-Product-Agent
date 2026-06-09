namespace BegaProductFinder.Core.Models;

/// <summary>
/// Flattened product DTO returned by search operations and emitted on the SSE "products" event.
/// Contains all fields needed to render a <c>ProductCard</c> component.
/// </summary>
public record ProductSearchResult
{
    public int ProductId { get; init; }
    public string CatalogNumber { get; init; } = string.Empty;
    public string? FamilyName { get; init; }
    public string? FamilySlug { get; init; }
    public string? SubFamilyName { get; init; }
    public string? CategoryName { get; init; }
    public string? GroupSlug { get; init; }
    public string? GroupsName { get; init; }
    public string? LuminaireType { get; init; }
    public string? FamilyListPageImage { get; init; }
    public string? FamilyTechImage { get; init; }

    /// <summary>Raw LED wattage string e.g. "0.6W".</summary>
    public string? LedWattage { get; init; }

    public decimal? WattageW { get; init; }
    public decimal? SystemWattageW { get; init; }
    public decimal? LumenOutputLm { get; init; }
    public decimal? BeamAngleDeg { get; init; }

    /// <summary>JSON array of <see cref="ColorTemperatureOption"/> — rendered as CCT pills by the frontend.</summary>
    public string? ColorTemperatureJson { get; init; }

    public string? Voltage { get; init; }
    public string? ControlProtocol { get; init; }
    public string? Application { get; init; }
    public string? Distribution { get; init; }
    public bool IsAdaCompliant { get; init; }
    public bool IsExpressDelivery { get; init; }
    public string? LeadTime { get; init; }

    // Primary dimensions (A–C) — raw strings, combined with fractions by the frontend
    public string? DimensionA { get; init; }
    public string? DimensionAFraction { get; init; }
    public string? DimensionB { get; init; }
    public string? DimensionBFraction { get; init; }
    public string? DimensionC { get; init; }
    public string? DimensionCFraction { get; init; }

    public decimal? DnpPrice { get; init; }
    public decimal? MsrpPrice { get; init; }
    public string? SpecDocumentUrl { get; init; }
    public string? TechnicalDocumentUrl { get; init; }

    /// <summary>Relevance score from the vector similarity search (0–1). 0 for SQL-only results.</summary>
    public double MatchScore { get; init; }
}

/// <summary>
/// Complete product detail record including all dimensions, IP ratings, accessories,
/// and supplementary fields not included in the summary <see cref="ProductSearchResult"/>.
/// Returned by <c>IProductSearchService.GetProductDetailAsync</c> and the <c>get_product_detail</c> tool.
/// </summary>
public record ProductDetail : ProductSearchResult
{
    public string? DynamicLight { get; init; }
    public string? Finish { get; init; }
    public string? RatingB { get; init; }
    public string? RatingU { get; init; }
    public string? RatingG { get; init; }
    public string? DimensionD { get; init; }
    public string? DimensionDFraction { get; init; }
    public string? DimensionE { get; init; }
    public string? DimensionEFraction { get; init; }
    public string? SocialEnviornmentalHealth { get; init; }
    public string? ReplacementCatalogNumber { get; init; }
    public string? ExtraInfo { get; init; }

    /// <summary>JSON array of product option strings e.g. "CUS - Custom finish".</summary>
    public string? ProductOptionsJson { get; init; }

    /// <summary>Combined technical spec text from the BEGA JSON ProductTechnicalSpec field.</summary>
    public string? ProductTechnicalSpec { get; init; }

    /// <summary>Family-level extra information from the BEGA JSON FamilyExtraInfo field.</summary>
    public string? FamilyExtraInfo { get; init; }

    /// <summary>Full AIEnrichment object as a JSON blob — includes SearchKeywords, LightingApplications, ProjectContexts, etc.</summary>
    public string? AIEnrichmentJson { get; init; }

    /// <summary>Accessory names e.g. "Remote driver box · Static white" — rendered as chips by <c>ProductCard</c>.</summary>
    public List<string> Accessories { get; init; } = [];
}

/// <summary>
/// Furniture product DTO returned by <c>IFurnitureSearchService</c> and emitted on the SSE "furniture" event.
/// Furniture products share the Products table but have no electrical specs (no wattage, lumens, CCT).
/// </summary>
public record FurnitureSearchResult
{
    public int ProductId { get; init; }
    public string CatalogNumber { get; init; } = string.Empty;
    public string? FamilyName { get; init; }
    public string? SubFamilyName { get; init; }

    /// <summary>Furniture type label e.g. "Bench", "Bollard", "Planter".</summary>
    public string? GroupsName { get; init; }

    public string? CategoryName { get; init; }
    public string? FamilyListPageImage { get; init; }
    public string? Application { get; init; }
    public string? Finish { get; init; }
    public string? LeadTime { get; init; }

    // All five dimension pairs — furniture typically uses more dimensions than luminaires
    public string? DimensionA { get; init; }
    public string? DimensionAFraction { get; init; }
    public string? DimensionB { get; init; }
    public string? DimensionBFraction { get; init; }
    public string? DimensionC { get; init; }
    public string? DimensionCFraction { get; init; }
    public string? DimensionD { get; init; }
    public string? DimensionDFraction { get; init; }
    public string? DimensionE { get; init; }
    public string? DimensionEFraction { get; init; }

    public string? SpecDocumentUrl { get; init; }
    public string? TechnicalDocumentUrl { get; init; }

    /// <summary>Relevance score from the vector similarity search (0–1).</summary>
    public double MatchScore { get; init; }
}

/// <summary>
/// A single hit returned by the pgvector cosine similarity search.
/// Internal to the search pipeline — not exposed directly over the API.
/// </summary>
public record VectorSearchResult(
    int ProductId,
    string CatalogNumber,
    string ChunkSource,
    string ChunkText,
    double Score
);

/// <summary>
/// One node in the BEGA product hierarchy tree — returned by <c>IFamilyBrowseService.GetFamiliesAsync</c>.
/// Represents a product family together with its category and group context.
/// </summary>
public record FamilyBrowseResult(
    string FamilyName,
    string FamilySlug,
    string? SubFamilyName,
    string CategoryName,
    string GroupSlug,
    string GroupsName,
    int ProductCount
);
