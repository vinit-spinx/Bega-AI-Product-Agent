namespace BegaProductFinder.Core.Models;

/// <summary>One product line in a BOM generation request — catalog number, quantity, and optional area label.</summary>
public record BomLineRequest(
    string CatalogNumber,
    int Quantity,
    string? AreaLabel
);

/// <summary>A priced line item in a generated bill of materials.</summary>
public record BomLineItem
{
    public string CatalogNumber { get; init; } = string.Empty;

    /// <summary>Family + sub-family description used as the line description.</summary>
    public string? Description { get; init; }

    public string? FamilyName { get; init; }

    /// <summary>Area label provided in the <see cref="BomLineRequest"/> e.g. "Main entrance".</summary>
    public string? AreaLabel { get; init; }

    public int Quantity { get; init; }

    public decimal? UnitDnp { get; init; }
    public decimal? LineTotalDnp { get; init; }
    public decimal? UnitMsrp { get; init; }
    public decimal? LineTotalMsrp { get; init; }
    public string? LeadTime { get; init; }
}

/// <summary>
/// Complete bill of materials report returned by <c>IBillOfMaterialsService.GenerateAsync</c>
/// and emitted on the SSE "bom" event for rendering in <c>BomTable</c>.
/// </summary>
public record BomReport
{
    public string? ProjectName { get; init; }
    public List<BomLineItem> LineItems { get; init; } = [];

    /// <summary>Sum of all <see cref="BomLineItem.LineTotalDnp"/> values in USD.</summary>
    public decimal SubtotalDnp { get; init; }

    /// <summary>Sum of all <see cref="BomLineItem.LineTotalMsrp"/> values in USD (0 when MSRP data absent).</summary>
    public decimal SubtotalMsrp { get; init; }

    /// <summary>Always "USD".</summary>
    public string Currency { get; init; } = "USD";

    /// <summary>Total number of line items (including not-found items).</summary>
    public int ItemCount { get; init; }

    /// <summary>Catalog numbers from the request that were not found in the database.</summary>
    public List<string> NotFoundItems { get; init; } = [];
}

/// <summary>
/// Recommended product set for a single area within a project.
/// Returned by <c>IProjectRecommendationService.RecommendAsync</c>
/// and emitted on the SSE "project_recommendation" event.
/// </summary>
public record ProjectAreaRecommendation
{
    /// <summary>Area name e.g. "Main entrance", "Pathways", "Facade".</summary>
    public string AreaName { get; init; } = string.Empty;

    public List<ProductSearchResult> RecommendedProducts { get; init; } = [];

    /// <summary>1–2 sentence explanation of why these products suit the area.</summary>
    public string Rationale { get; init; } = string.Empty;

    /// <summary>Sum of <see cref="ProductSearchResult.DnpPrice"/> × implied quantity for this area.</summary>
    public decimal EstimatedTotalDnp { get; init; }
}

/// <summary>Summary report produced at the end of a full ingestion pipeline run.</summary>
public record IngestionReport
{
    public int TotalProducts { get; init; }
    public int ProcessedProducts { get; init; }
    public int TotalChunks { get; init; }
    public int EmbeddedChunks { get; init; }
    public int PdfDownloaded { get; init; }
    public int PdfFailed { get; init; }
    public TimeSpan Duration { get; init; }
    public DateTime CompletedAt { get; init; }
    public List<string> FailureMessages { get; init; } = [];
}
