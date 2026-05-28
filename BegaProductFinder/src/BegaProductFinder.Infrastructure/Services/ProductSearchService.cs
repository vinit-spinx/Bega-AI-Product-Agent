using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Hybrid product search combining pgvector semantic similarity with SQL Server structured filtering.
/// The search flow for <see cref="SearchByNaturalLanguageAsync"/>:
/// <list type="number">
/// <item><description>Embed the query via <see cref="IEmbeddingService"/></description></item>
/// <item><description>Run ANN search via <see cref="IVectorSearchService"/> to get candidate ProductIds</description></item>
/// <item><description>Fetch full product rows from SQL Server for those IDs, applying any structured filters</description></item>
/// <item><description>Merge vector scores back in and return ranked results</description></item>
/// </list>
/// Furniture products (identified by <c>GroupSlug</c> in <c>furniture_group_slugs</c>) are excluded.
/// </summary>
public sealed class ProductSearchService : IProductSearchService
{
    private readonly IEmbeddingService _embedding;
    private readonly IVectorSearchService _vectorSearch;
    private readonly string _connectionString;
    private readonly ILogger<ProductSearchService> _logger;

    // Furniture group slugs from specsMapping.json — excluded from luminaire search
    private static readonly HashSet<string> FurnitureGroupSlugs = new(StringComparer.OrdinalIgnoreCase)
    {
        "bench", "seating", "litter-bin", "planter", "bollard-furniture",
        "modular-furniture", "urban-elements", "cycle-stand"
    };

    public ProductSearchService(
        IEmbeddingService embedding,
        IVectorSearchService vectorSearch,
        IConfiguration config,
        ILogger<ProductSearchService> logger)
    {
        _embedding = embedding;
        _vectorSearch = vectorSearch;
        _connectionString = config.GetConnectionString("SqlServer")
            ?? throw new InvalidOperationException("ConnectionStrings:SqlServer is required.");
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<List<ProductSearchResult>> SearchByNaturalLanguageAsync(
        string query,
        ProductSearchFilters? filters = null,
        CancellationToken ct = default)
    {
        filters ??= new ProductSearchFilters();
        var topK = Math.Max(filters.TopK, 5);

        // Retrieve a larger candidate pool from vector search to allow SQL filtering to narrow down
        var candidateK = Math.Max(topK * 4, 40);

        float[] queryVector;
        try
        {
            queryVector = await _embedding.EmbedAsync(query, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Embedding failed for query '{Query}' — falling back to SQL-only search", query);
            return await FallbackSqlSearchAsync(query, filters, topK, ct);
        }

        List<VectorSearchResult> vectorHits;
        try
        {
            vectorHits = await _vectorSearch.SearchAsync(queryVector, topK: candidateK, ct: ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Vector search failed — falling back to SQL-only search");
            return await FallbackSqlSearchAsync(query, filters, topK, ct);
        }

        if (vectorHits.Count == 0) return [];

        // Deduplicate: keep highest score per product
        var scoreByProductId = vectorHits
            .GroupBy(h => h.ProductId)
            .ToDictionary(g => g.Key, g => g.Max(h => h.Score));

        var candidateIds = scoreByProductId.Keys.ToArray();

        // Fetch from SQL Server with filters applied
        var products = await FetchProductsFromSqlAsync(candidateIds, filters, ct);

        // Exclude furniture from luminaire search results
        var luminaires = products
            .Where(p => p.GroupSlug is null || !FurnitureGroupSlugs.Contains(p.GroupSlug))
            .ToList();

        // Merge vector scores and return top K by score
        return luminaires
            .Select(p =>
            {
                var score = scoreByProductId.TryGetValue(p.ProductId, out var s) ? s : 0;
                return p with { MatchScore = score };
            })
            .OrderByDescending(p => p.MatchScore)
            .Take(topK)
            .ToList();
    }

    /// <inheritdoc/>
    public async Task<List<ProductSearchResult>> FilterBySpecsAsync(
        List<SpecFilter> filters,
        CancellationToken ct = default)
    {
        if (filters.Count == 0) return [];

        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        // Exclude furniture
        conditions.Add(BuildFurnitureExclusionClause());

        foreach (var (filter, idx) in filters.Select((f, i) => (f, i)))
        {
            var col = MapSpecKeyToColumn(filter.SpecKey);
            if (col is null)
            {
                _logger.LogWarning("Unknown spec_key '{SpecKey}' — skipping filter", filter.SpecKey);
                continue;
            }

            var paramName = $"@v{idx}";
            var paramMax = $"@vmax{idx}";

            switch (filter.Operator.ToLowerInvariant())
            {
                case "gte":
                    conditions.Add($"{col} >= {paramName}");
                    parameters.Add(paramName, filter.Value);
                    break;
                case "lte":
                    conditions.Add($"{col} <= {paramName}");
                    parameters.Add(paramName, filter.Value);
                    break;
                case "eq":
                    conditions.Add($"{col} = {paramName}");
                    parameters.Add(paramName, filter.Value);
                    break;
                case "between" when filter.ValueMax.HasValue:
                    conditions.Add($"{col} BETWEEN {paramName} AND {paramMax}");
                    parameters.Add(paramName, filter.Value);
                    parameters.Add(paramMax, filter.ValueMax.Value);
                    break;
            }
        }

        if (conditions.Count == 1) return []; // Only the furniture exclusion, no real filters

        var sql = $"""
            SELECT
                ProductId, CatalogNumber, FamilyName, FamilySlug, SubFamilyName,
                CategoryName, GroupSlug, GroupsName, LuminaireType,
                FamilyListPageImage, FamilyTechImage,
                LedWattage, WattageW, SystemWattageW, LumenOutputLm, BeamAngleDeg,
                ColorTemperatureJson, Voltage, ControlProtocol, Application, Distribution,
                IsAdaCompliant, IsExpressDelivery, LeadTime,
                DimensionA, DimensionAFraction, DimensionB, DimensionBFraction,
                DimensionC, DimensionCFraction,
                DnpPrice, MsrpPrice,
                SpecDocumentUrl, TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products
            WHERE {string.Join(" AND ", conditions)}
            ORDER BY LumenOutputLm DESC, WattageW ASC
            """;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            var results = await conn.QueryAsync<ProductSearchResult>(
                new CommandDefinition(sql, parameters, cancellationToken: ct));
            return results.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FilterBySpecsAsync failed");
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<ProductDetail?> GetProductDetailAsync(
        string catalogNumber,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT
                p.ProductId, p.CatalogNumber, p.FamilyName, p.FamilySlug, p.SubFamilyName,
                p.CategoryName, p.GroupSlug, p.GroupsName, p.LuminaireType,
                p.FamilyListPageImage, p.FamilyTechImage,
                p.LedWattage, p.WattageW, p.SystemWattageW, p.LumenOutputLm, p.BeamAngleDeg,
                p.ColorTemperatureJson, p.Voltage, p.ControlProtocol, p.Application, p.Distribution,
                p.DynamicLight, p.Finish,
                p.IsAdaCompliant, p.IsExpressDelivery, p.LeadTime,
                p.DimensionA, p.DimensionAFraction, p.DimensionB, p.DimensionBFraction,
                p.DimensionC, p.DimensionCFraction, p.DimensionD, p.DimensionDFraction,
                p.DimensionE, p.DimensionEFraction,
                p.RatingB, p.RatingU, p.RatingG,
                p.DnpPrice, p.MsrpPrice,
                p.SocialEnviornmentalHealth, p.ReplacementCatalogNumber,
                p.ExtraInfo, p.ProductOptionsJson,
                p.SpecDocumentUrl, p.TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products p
            WHERE p.CatalogNumber = @CatalogNumber
            """;

        const string accessoriesSql = """
            SELECT AccessoryName
            FROM ProductAccessories
            WHERE ProductId = @ProductId
            ORDER BY SortOrder
            """;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            var detail = await conn.QueryFirstOrDefaultAsync<ProductDetail>(
                new CommandDefinition(sql, new { CatalogNumber = catalogNumber }, cancellationToken: ct));

            if (detail is null) return null;

            var accessories = await conn.QueryAsync<string>(
                new CommandDefinition(accessoriesSql, new { detail.ProductId }, cancellationToken: ct));

            return detail with { Accessories = accessories.ToList() };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetProductDetailAsync failed for catalog number '{CatalogNumber}'", catalogNumber);
            throw;
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<List<ProductSearchResult>> FetchProductsFromSqlAsync(
        int[] productIds,
        ProductSearchFilters filters,
        CancellationToken ct)
    {
        var conditions = new List<string> { "p.ProductId IN @Ids" };
        var parameters = new DynamicParameters();
        parameters.Add("Ids", productIds);

        if (filters.Category is not null)
        {
            conditions.Add("p.CategoryName = @Category");
            parameters.Add("Category", filters.Category);
        }
        if (filters.Group is not null)
        {
            conditions.Add("p.GroupsName = @Group");
            parameters.Add("Group", filters.Group);
        }
        if (filters.FamilyName is not null)
        {
            conditions.Add("p.FamilyName = @FamilyName");
            parameters.Add("FamilyName", filters.FamilyName);
        }
        if (filters.MinWattageW.HasValue)
        {
            conditions.Add("p.WattageW >= @MinWattageW");
            parameters.Add("MinWattageW", filters.MinWattageW.Value);
        }
        if (filters.MaxWattageW.HasValue)
        {
            conditions.Add("p.WattageW <= @MaxWattageW");
            parameters.Add("MaxWattageW", filters.MaxWattageW.Value);
        }
        if (filters.MinLumenOutput.HasValue)
        {
            conditions.Add("p.LumenOutputLm >= @MinLumenOutput");
            parameters.Add("MinLumenOutput", filters.MinLumenOutput.Value);
        }
        if (filters.BeamAngleDeg.HasValue)
        {
            conditions.Add("p.BeamAngleDeg = @BeamAngleDeg");
            parameters.Add("BeamAngleDeg", filters.BeamAngleDeg.Value);
        }
        if (filters.Voltage is not null)
        {
            conditions.Add("p.Voltage LIKE @Voltage");
            parameters.Add("Voltage", $"%{filters.Voltage}%");
        }
        if (filters.ControlProtocol is not null)
        {
            conditions.Add("p.ControlProtocol = @ControlProtocol");
            parameters.Add("ControlProtocol", filters.ControlProtocol);
        }
        if (filters.AdaCompliant == true)
        {
            conditions.Add("p.IsAdaCompliant = 1");
        }
        if (filters.ExpressDelivery == true)
        {
            conditions.Add("p.IsExpressDelivery = 1");
        }
        if (filters.ColorTemperatureK.HasValue)
        {
            // ColorTemperatureJson is a JSON array; check if the requested Kelvin value is present
            conditions.Add("p.ColorTemperatureJson LIKE @CctPattern");
            parameters.Add("CctPattern", $"%\"kelvin\":{filters.ColorTemperatureK.Value}%");
        }

        var sql = $"""
            SELECT
                p.ProductId, p.CatalogNumber, p.FamilyName, p.FamilySlug, p.SubFamilyName,
                p.CategoryName, p.GroupSlug, p.GroupsName, p.LuminaireType,
                p.FamilyListPageImage, p.FamilyTechImage,
                p.LedWattage, p.WattageW, p.SystemWattageW, p.LumenOutputLm, p.BeamAngleDeg,
                p.ColorTemperatureJson, p.Voltage, p.ControlProtocol, p.Application, p.Distribution,
                p.IsAdaCompliant, p.IsExpressDelivery, p.LeadTime,
                p.DimensionA, p.DimensionAFraction, p.DimensionB, p.DimensionBFraction,
                p.DimensionC, p.DimensionCFraction,
                p.DnpPrice, p.MsrpPrice,
                p.SpecDocumentUrl, p.TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products p
            WHERE {string.Join(" AND ", conditions)}
            """;

        await using var conn = new SqlConnection(_connectionString);
        var results = await conn.QueryAsync<ProductSearchResult>(
            new CommandDefinition(sql, parameters, cancellationToken: ct));
        return results.ToList();
    }

    private async Task<List<ProductSearchResult>> FallbackSqlSearchAsync(
        string query,
        ProductSearchFilters filters,
        int topK,
        CancellationToken ct)
    {
        // Simple keyword fallback: search FamilyName, ExtraInfo, GroupsName
        const string sql = """
            SELECT TOP (@TopK)
                ProductId, CatalogNumber, FamilyName, FamilySlug, SubFamilyName,
                CategoryName, GroupSlug, GroupsName, LuminaireType,
                FamilyListPageImage, FamilyTechImage,
                LedWattage, WattageW, SystemWattageW, LumenOutputLm, BeamAngleDeg,
                ColorTemperatureJson, Voltage, ControlProtocol, Application, Distribution,
                IsAdaCompliant, IsExpressDelivery, LeadTime,
                DimensionA, DimensionAFraction, DimensionB, DimensionBFraction,
                DimensionC, DimensionCFraction,
                DnpPrice, MsrpPrice,
                SpecDocumentUrl, TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products
            WHERE (FamilyName LIKE @Query OR ExtraInfo LIKE @Query OR GroupsName LIKE @Query)
              AND (GroupSlug NOT IN @FurnitureSlugs OR GroupSlug IS NULL)
            ORDER BY CatalogNumber
            """;

        await using var conn = new SqlConnection(_connectionString);
        var results = await conn.QueryAsync<ProductSearchResult>(new CommandDefinition(
            sql,
            new
            {
                TopK = topK,
                Query = $"%{query}%",
                FurnitureSlugs = FurnitureGroupSlugs.ToArray()
            },
            cancellationToken: ct));
        return results.ToList();
    }

    private static string? MapSpecKeyToColumn(string specKey) => specKey switch
    {
        "WattageW" => "WattageW",
        "SystemWattageW" => "SystemWattageW",
        "LumenOutputLm" => "LumenOutputLm",
        "BeamAngleDeg" => "BeamAngleDeg",
        "DnpPrice" => "DnpPrice",
        "MsrpPrice" => "MsrpPrice",
        _ => null
    };

    private static string BuildFurnitureExclusionClause()
    {
        var slugList = string.Join(",", FurnitureGroupSlugs.Select(s => $"'{s}'"));
        return $"(GroupSlug IS NULL OR GroupSlug NOT IN ({slugList}))";
    }
}
