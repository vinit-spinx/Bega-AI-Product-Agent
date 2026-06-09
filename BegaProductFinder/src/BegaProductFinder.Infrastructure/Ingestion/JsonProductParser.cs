using System.Text.Json;
using System.Text.Json.Serialization;
using BegaProductFinder.Core.Models;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Ingestion;

/// <summary>
/// Deserializes the raw BEGA products JSON array and maps each element to
/// <see cref="Product"/> + <see cref="ProductAccessory"/> + <see cref="ProductProject"/> entities ready for upsert.
/// </summary>
public sealed class JsonProductParser
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly SpecNormalizer _specNormalizer;
    private readonly ILogger<JsonProductParser> _logger;

    public JsonProductParser(SpecNormalizer specNormalizer, ILogger<JsonProductParser> logger)
    {
        _specNormalizer = specNormalizer;
        _logger = logger;
    }

    /// <summary>
    /// Parses the BEGA product JSON file (a bare array, no root wrapper key)
    /// and returns a list of fully-mapped <see cref="ParsedProduct"/> records.
    /// Malformed individual records are skipped with a warning rather than
    /// aborting the entire run.
    /// </summary>
    public async Task<List<ParsedProduct>> ParseAsync(string filePath, CancellationToken ct = default)
    {
        _logger.LogInformation("Parsing product JSON from {FilePath}", filePath);

        await using var stream = File.OpenRead(filePath);
        var rawProducts = await JsonSerializer.DeserializeAsync<List<BegaProductJson>>(stream, _jsonOptions, ct)
            ?? throw new InvalidOperationException("Product JSON deserialized to null — ensure the file is a valid JSON array.");

        _logger.LogInformation("Deserialized {Count} raw product records", rawProducts.Count);

        var results = new List<ParsedProduct>(rawProducts.Count);

        foreach (var raw in rawProducts)
        {
            try
            {
                results.Add(Map(raw));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Skipping malformed product record with Id={Id}, CatalogNumber={CatalogNumber}",
                    raw.Id, raw.CatalogNumber);
            }
        }

        _logger.LogInformation("Successfully mapped {Count}/{Total} products", results.Count, rawProducts.Count);
        return results;
    }

    private ParsedProduct Map(BegaProductJson raw)
    {
        if (string.IsNullOrWhiteSpace(raw.Id))
            throw new InvalidDataException("Product record is missing required field 'Id'.");
        if (string.IsNullOrWhiteSpace(raw.CatalogNumber))
            throw new InvalidDataException($"Product with Id={raw.Id} is missing required field 'CatalogNumber'.");

        var product = new Product
        {
            // Core identifiers
            BegaId = raw.Id,
            CatalogNumber = raw.CatalogNumber,

            // Hierarchy
            FamilyName = raw.FamilyName,
            FamilySlug = raw.FamilySlug,
            SubFamilyName = raw.SubFamilyName,
            LuminaireType = raw.LuminaireType,
            GroupSlug = raw.GroupSlug,
            GroupsName = raw.GroupsName,
            CategoryName = raw.CategoryName,

            // Image URLs
            FamilyListPageImage = raw.FamilyListPageImage,
            FamilyListPageImageOrientation = raw.FamilyListPageImageOrientation,
            FamilyTechImage = raw.FamilyTechImage,

            // Dimensions — stored exactly as received from JSON, no arithmetic
            DimensionA = raw.A,
            DimensionAFraction = raw.AFraction,
            DimensionB = raw.B,
            DimensionBFraction = raw.BFraction,
            DimensionC = raw.C,
            DimensionCFraction = raw.CFraction,
            DimensionD = raw.D,
            DimensionDFraction = raw.DFraction,
            DimensionE = raw.E,
            DimensionEFraction = raw.EFraction,

            // IP ratings
            RatingB = raw.RatingB,
            RatingU = raw.RatingU,
            RatingG = raw.RatingG,

            // Free text
            ExtraInfo = raw.ExtraInfo ?? string.Empty,
            SocialEnviornmentalHealth = raw.SocialEnviornmentalHealth,
            ReplacementCatalogNumber = raw.ReplacementCatalogNumber,

            // Document URLs
            TechnicalDocumentUrl = raw.TechnicalDocument ?? string.Empty,
            SpecDocumentUrl = raw.SpecDocument ?? string.Empty,

            // Product options serialized as JSON if present
            ProductOptionsJson = raw.ProductOptions is { Count: > 0 }
                ? JsonSerializer.Serialize(raw.ProductOptions)
                : null,

            // New fields
            ProductTechnicalSpec = raw.ProductTechnicalSpec,
            FamilyExtraInfo = raw.FamilyExtraInfo,
            AIEnrichmentJson = raw.AIEnrichment is not null
                ? JsonSerializer.Serialize(raw.AIEnrichment)
                : null,

            LastUpdated = DateTime.UtcNow
        };

        // Apply all spec normalizations from specsMapping.json
        _specNormalizer.Normalize(product, raw);

        // Map accessories as child entities
        var accessories = new List<ProductAccessory>();
        if (raw.ProductAccessories is { Count: > 0 })
        {
            for (int i = 0; i < raw.ProductAccessories.Count; i++)
            {
                accessories.Add(new ProductAccessory
                {
                    AccessoryName = raw.ProductAccessories[i],
                    SortOrder = i
                });
            }
        }

        // Map project references as child entities
        var projects = new List<ProductProject>();
        if (raw.Projects is { Count: > 0 })
        {
            for (int i = 0; i < raw.Projects.Count; i++)
            {
                var rawProject = raw.Projects[i];
                projects.Add(new ProductProject
                {
                    Name = rawProject.Name ?? string.Empty,
                    Description = rawProject.Description,
                    Tags = rawProject.Tags,
                    Slug = rawProject.Slug,
                    Location = rawProject.Location,
                    ListingImage = rawProject.ListingImage,
                    SortOrder = i
                });
            }
        }

        return new ParsedProduct(product, accessories, projects);
    }
}

/// <summary>A product entity together with its parsed accessories and project references, ready for upsert.</summary>
public sealed record ParsedProduct(Product Product, List<ProductAccessory> Accessories, List<ProductProject> Projects);

// ── Internal DTOs — mirror the raw BEGA JSON structure ─────────────────────────

/// <summary>
/// Internal deserialization target for a single element of the BEGA product JSON array.
/// Property names match the exact casing used in the BEGA catalog export.
/// </summary>
internal sealed class BegaProductJson
{
    public string? Id { get; set; }
    public string? CatalogNumber { get; set; }
    public string? FamilyName { get; set; }
    public string? FamilySlug { get; set; }
    public string? SubFamilyName { get; set; }
    public string? FamilyListPageImage { get; set; }

    [JsonPropertyName("FamilyListPageImageOrientation")]
    public string? FamilyListPageImageOrientation { get; set; }

    public string? FamilyTechImage { get; set; }
    public string? LuminaireType { get; set; }
    public string? GroupSlug { get; set; }
    public string? CategoryName { get; set; }
    public string? GroupsName { get; set; }

    // Electrical — raw string values; SpecNormalizer converts these
    public string? Led { get; set; }
    public string? Express { get; set; }

    [JsonPropertyName("LumenOutput_Double")]
    public string? LumenOutputDouble { get; set; }

    public string? BeamAngle { get; set; }
    public string? Ada { get; set; }

    // Dimensions — stored as raw strings; no decimal conversion ever performed
    public string? A { get; set; }
    public string? B { get; set; }
    public string? C { get; set; }
    public string? D { get; set; }
    public string? E { get; set; }

    [JsonPropertyName("AFraction")]
    public string? AFraction { get; set; }

    [JsonPropertyName("BFraction")]
    public string? BFraction { get; set; }

    [JsonPropertyName("CFraction")]
    public string? CFraction { get; set; }

    [JsonPropertyName("DFraction")]
    public string? DFraction { get; set; }

    [JsonPropertyName("EFraction")]
    public string? EFraction { get; set; }

    public string? LeadTime { get; set; }
    public string? ColorTemperature { get; set; }
    public string? DynamicLight { get; set; }
    public string? ExtraInfo { get; set; }
    public string? Dnp { get; set; }
    public string? Msrp { get; set; }
    public string? ReplacementCatalogNumber { get; set; }
    public string? Finish { get; set; }
    public string? Voltage { get; set; }
    public string? SystemWattage { get; set; }

    [JsonPropertyName("SystemWattage_Double")]
    public string? SystemWattageDouble { get; set; }

    public string? Application { get; set; }
    public string? SocialEnviornmentalHealth { get; set; }
    public string? ControlProtocol { get; set; }
    public string? Distribution { get; set; }
    public string? RatingB { get; set; }
    public string? RatingU { get; set; }
    public string? RatingG { get; set; }
    public string? TechnicalDocument { get; set; }
    public string? SpecDocument { get; set; }

    public List<string>? ProductOptions { get; set; }
    public List<string>? ProductAccessories { get; set; }

    // New fields
    public string? ProductTechnicalSpec { get; set; }
    public string? FamilyExtraInfo { get; set; }
    public BegaAIEnrichmentJson? AIEnrichment { get; set; }
    public List<BegaProjectJson>? Projects { get; set; }
}

/// <summary>Internal DTO for the AIEnrichment object in the BEGA product JSON.</summary>
internal sealed class BegaAIEnrichmentJson
{
    public List<string>? ProductIntent { get; set; }
    public List<string>? LightingApplications { get; set; }
    public List<string>? TargetObjects { get; set; }
    public List<string>? InstallationMethods { get; set; }
    public List<string>? EnvironmentSuitability { get; set; }
    public List<string>? ControlCapabilities { get; set; }
    public List<string>? OpticalCapabilities { get; set; }
    public List<string>? MountingCapabilities { get; set; }
    public List<string>? MaterialCapabilities { get; set; }
    public List<string>? MaintenanceCategories { get; set; }
    public List<string>? AccessoryCapabilities { get; set; }
    public List<string>? ProjectContexts { get; set; }
    public List<string>? ElectricalFeatures { get; set; }
    public List<string>? LightSourceFeatures { get; set; }
    public List<string>? FinishCapabilities { get; set; }
    public List<string>? SearchKeywords { get; set; }
    public string? SearchDescription { get; set; }
    public List<string>? AvailableColorTemperatures { get; set; }
    public List<string>? ColorTemperatureCategories { get; set; }
    public List<string>? BeamAngles { get; set; }
    public string? BeamType { get; set; }
    public string? BeamClassification { get; set; }
    public List<string>? FurnitureCategories { get; set; }
    public List<string>? FurnitureApplications { get; set; }
    public List<string>? FurnitureMaterials { get; set; }
    public List<string>? FurnitureFeatures { get; set; }
}

/// <summary>Internal DTO for a single entry in the BEGA product JSON Projects array.</summary>
internal sealed class BegaProjectJson
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Tags { get; set; }
    public string? Slug { get; set; }
    public string? Location { get; set; }
    public string? ListingImage { get; set; }
}
