namespace BegaProductFinder.Core.Models;

/// <summary>
/// EF Core entity representing a BEGA product in the SQL Server Products table.
/// Dimensions and fractions are stored as raw strings exactly as received from the BEGA JSON —
/// no arithmetic or decimal conversion is performed.
/// </summary>
public class Product
{
    /// <summary>SQL Server identity primary key.</summary>
    public int ProductId { get; set; }

    /// <summary>Raw BEGA 'Id' field — unique external identifier e.g. "5596".</summary>
    public string BegaId { get; set; } = string.Empty;

    /// <summary>Primary product identifier e.g. "77127".</summary>
    public string CatalogNumber { get; set; } = string.Empty;

    public string? FamilyName { get; set; }
    public string? FamilySlug { get; set; }
    public string? SubFamilyName { get; set; }
    public string? FamilyListPageImage { get; set; }
    public string? FamilyListPageImageOrientation { get; set; }
    public string? FamilyTechImage { get; set; }
    public string? LuminaireType { get; set; }
    public string? GroupSlug { get; set; }
    public string? GroupsName { get; set; }

    /// <summary>Top-level category: "Exterior" or "Interior".</summary>
    public string? CategoryName { get; set; }

    /// <summary>Raw LED wattage string as received from BEGA JSON e.g. "0.6W".</summary>
    public string? LedWattage { get; set; }

    /// <summary>Parsed numeric LED wattage in watts — stripped from <see cref="LedWattage"/>.</summary>
    public decimal? WattageW { get; set; }

    public decimal? SystemWattageW { get; set; }
    public decimal? LumenOutputLm { get; set; }
    public decimal? BeamAngleDeg { get; set; }

    /// <summary>JSON array of <see cref="ColorTemperatureOption"/> — parsed from the semicolon-delimited ColorTemperature field.</summary>
    public string? ColorTemperatureJson { get; set; }

    public string? Voltage { get; set; }
    public string? ControlProtocol { get; set; }
    public string? Application { get; set; }
    public string? Distribution { get; set; }
    public string? DynamicLight { get; set; }
    public string? Finish { get; set; }
    public string? LeadTime { get; set; }

    // Dimensions — stored as raw strings, no conversion
    public string? DimensionA { get; set; }
    public string? DimensionAFraction { get; set; }
    public string? DimensionB { get; set; }
    public string? DimensionBFraction { get; set; }
    public string? DimensionC { get; set; }
    public string? DimensionCFraction { get; set; }
    public string? DimensionD { get; set; }
    public string? DimensionDFraction { get; set; }
    public string? DimensionE { get; set; }
    public string? DimensionEFraction { get; set; }

    /// <summary>IP rating: Buried (e.g. "IP67").</summary>
    public string? RatingB { get; set; }

    /// <summary>IP rating: Upward-facing (e.g. "IP68").</summary>
    public string? RatingU { get; set; }

    /// <summary>IP rating: General (e.g. "IP65").</summary>
    public string? RatingG { get; set; }

    /// <summary>Distributor net price in USD — null when the raw value is "0".</summary>
    public decimal? DnpPrice { get; set; }

    /// <summary>MSRP in USD — null when the raw value is "0".</summary>
    public decimal? MsrpPrice { get; set; }

    public bool IsAdaCompliant { get; set; }
    public bool IsExpressDelivery { get; set; }

    public string ExtraInfo { get; set; } = string.Empty;
    public string? SocialEnviornmentalHealth { get; set; }
    public string? ReplacementCatalogNumber { get; set; }

    /// <summary>JSON array of product option strings e.g. "CUS - Custom finish".</summary>
    public string? ProductOptionsJson { get; set; }

    public string TechnicalDocumentUrl { get; set; } = string.Empty;
    public string SpecDocumentUrl { get; set; } = string.Empty;

    /// <summary>Combined technical spec text sourced from the BEGA JSON ProductTechnicalSpec field.</summary>
    public string? ProductTechnicalSpec { get; set; }

    /// <summary>Family-level extra information from the BEGA JSON FamilyExtraInfo field.</summary>
    public string? FamilyExtraInfo { get; set; }

    /// <summary>Full AIEnrichment object serialized as JSON — includes SearchKeywords, LightingApplications, ProjectContexts, etc.</summary>
    public string? AIEnrichmentJson { get; set; }

    public DateTime LastUpdated { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<ProductAccessory> Accessories { get; set; } = [];
    public ICollection<ProductChunk> Chunks { get; set; } = [];
    public ICollection<ProductProject> Projects { get; set; } = [];
}

/// <summary>A parsed color temperature option from the semicolon-delimited ColorTemperature field e.g. "2700K (K27)".</summary>
public record ColorTemperatureOption(int Kelvin, string Code);
