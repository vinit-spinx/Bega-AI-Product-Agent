using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Searches the BEGA outdoor furniture and urban design catalog.
/// Furniture products share the Products table with luminaires but are identified by their
/// <c>GroupSlug</c> values. Uses hybrid vector + SQL search restricted to furniture group slugs.
/// </summary>
public sealed class FurnitureSearchService : IFurnitureSearchService
{
    private readonly IEmbeddingService _embedding;
    private readonly IVectorSearchService _vectorSearch;
    private readonly string _connectionString;
    private readonly ILogger<FurnitureSearchService> _logger;

    // Furniture group slugs per specsMapping.json — keep in sync with furniture_group_slugs there
    private static readonly string[] FurnitureGroupSlugs =
    [
        // original slugs
        "bench", "seating", "litter-bin", "planter", "bollard-furniture",
        "modular-furniture", "urban-elements", "cycle-stand",
        // added groups
        "table-set", "table", "chair", "waste-management",
        "bike-rack", "stake", "partition", "accessories"
    ];

    public FurnitureSearchService(
        IEmbeddingService embedding,
        IVectorSearchService vectorSearch,
        IConfiguration config,
        ILogger<FurnitureSearchService> logger)
    {
        _embedding = embedding;
        _vectorSearch = vectorSearch;
        _connectionString = config.GetConnectionString("SqlServer")
            ?? throw new InvalidOperationException("ConnectionStrings:SqlServer is required.");
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<List<FurnitureSearchResult>> SearchAsync(
        string query,
        string? furnitureType = null,
        string? application = null,
        string? material = null,
        bool? illuminated = null,
        int topK = 5,
        string[]? excludedCatalogNumbers = null,
        CancellationToken ct = default)
    {
        // Step 1: Fetch all furniture product IDs from SQL, scoped to known furniture GroupSlugs.
        // This prevents vector search from returning luminaire products that then fail the GroupSlug filter.
        int[] furnitureProductIds = [];
        try
        {
            await using var idConn = new SqlConnection(_connectionString);
            var idResults = await idConn.QueryAsync<int>(
                "SELECT ProductId FROM Products WHERE GroupSlug IN @FurnitureSlugs",
                new { FurnitureSlugs = FurnitureGroupSlugs });
            furnitureProductIds = idResults.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch furniture product IDs for vector scoping");
        }

        // Step 2: Vector search restricted to furniture product IDs only.
        // If application context is provided, append it to improve semantic matching
        // (application values in the DB are luminaire-specific e.g. "Accent/Facade/Pathway"
        // and do not represent space descriptions like "public plaza").
        var enrichedQuery = application is not null ? $"{query} {application}" : query;
        int[] candidateIds = [];
        if (furnitureProductIds.Length > 0)
        {
            try
            {
                var queryVector = await _embedding.EmbedAsync(enrichedQuery, ct);
                var hits = await _vectorSearch.SearchAsync(
                    queryVector, topK: topK * 4,
                    filterProductIds: furnitureProductIds, ct: ct);
                candidateIds = hits.Select(h => h.ProductId).Distinct().ToArray();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Vector search failed for furniture query — using SQL fallback");
            }
        }

        // Step 3: Build SQL query scoped to furniture group slugs
        var conditions = new List<string> { "GroupSlug IN @FurnitureSlugs" };
        var parameters = new DynamicParameters();
        parameters.Add("FurnitureSlugs", FurnitureGroupSlugs);
        parameters.Add("TopK", topK);

        if (candidateIds.Length > 0)
        {
            conditions.Add("ProductId IN @CandidateIds");
            parameters.Add("CandidateIds", candidateIds);
        }
        else if (!string.IsNullOrWhiteSpace(query))
        {
            // SQL keyword fallback scoped to furniture products — search name and description only
            conditions.Add("(FamilyName LIKE @Query OR SubFamilyName LIKE @Query OR ExtraInfo LIKE @Query)");
            parameters.Add("Query", $"%{query}%");
        }
        // When neither vector nor keyword matched, the GroupSlug condition alone still returns
        // all furniture products so the user sees something relevant.

        if (furnitureType is not null)
        {
            conditions.Add("GroupsName LIKE @FurnitureType");
            parameters.Add("FurnitureType", $"%{furnitureType}%");
        }

        if (material is not null)
        {
            conditions.Add("(Finish LIKE @Material OR ExtraInfo LIKE @Material)");
            parameters.Add("Material", $"%{material}%");
        }

        if (illuminated == true)
        {
            // Illuminated furniture has LED wattage > 0
            conditions.Add("WattageW IS NOT NULL AND WattageW > 0");
        }
        else if (illuminated == false)
        {
            conditions.Add("(WattageW IS NULL OR WattageW = 0)");
        }

        if (excludedCatalogNumbers is { Length: > 0 })
        {
            conditions.Add("CatalogNumber NOT IN @ExcludedCatalogNumbers");
            parameters.Add("ExcludedCatalogNumbers", excludedCatalogNumbers);
        }

        var sql = $"""
            SELECT TOP (@TopK)
                ProductId, CatalogNumber, FamilyName, SubFamilyName, GroupsName, CategoryName,
                FamilyListPageImage, Application, Finish, LeadTime,
                DimensionA, DimensionAFraction, DimensionB, DimensionBFraction,
                DimensionC, DimensionCFraction, DimensionD, DimensionDFraction,
                DimensionE, DimensionEFraction,
                SpecDocumentUrl, TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products
            WHERE {string.Join(" AND ", conditions)}
            ORDER BY FamilyName, CatalogNumber
            """;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            var results = await conn.QueryAsync<FurnitureSearchResult>(
                new CommandDefinition(sql, parameters, cancellationToken: ct));
            return results.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FurnitureSearchService.SearchAsync failed for query '{Query}'", query);
            throw;
        }
    }
}
