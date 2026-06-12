using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Dapper;
using Npgsql;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Searches the BEGA outdoor furniture and urban design catalog using pure SQL.
/// Furniture products share the Products table with luminaires but are identified by their
/// <c>GroupSlug</c> values. The furniture set is small enough (~50–200 products) that
/// multi-word keyword search across key text columns is accurate without vector search.
/// This service has no dependency on the embedding service or vector store.
/// </summary>
public sealed class FurnitureSearchService : IFurnitureSearchService
{
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

    // Common stopwords excluded from keyword splitting to avoid noisy LIKE conditions
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "for", "the", "and", "with", "from", "that", "this", "are", "was", "has",
        "have", "had", "not", "but", "all", "can", "may", "will", "would", "could",
        "should", "its", "our", "your", "their", "there", "here", "how", "what",
        "when", "where", "who", "why", "into", "onto", "upon", "over", "under",
        "between", "among", "through", "about", "around", "during", "before", "after"
    };

    public FurnitureSearchService(
        IConfiguration config,
        ILogger<FurnitureSearchService> logger)
    {
        _connectionString = config.GetConnectionString("Database")
            ?? throw new InvalidOperationException("ConnectionStrings:Database is required.");
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
        // Split the combined query + application context into meaningful keywords.
        // application is appended for richer matching (e.g. "plaza" surfaces relevant products)
        // even though it is not a DB filter column for furniture.
        var combined = application is not null ? $"{query} {application}" : query;
        var words = combined
            .Split([' ', '-', ',', '.', '/', '\\', '(', ')', '?', '!'],
                   StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length >= 3 && !StopWords.Contains(w))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .ToList();

        var results = await RunQueryAsync(query, words, furnitureType, material,
                                          illuminated, excludedCatalogNumbers, topK, ct);

        // If keyword search produced nothing, retry with structural filters only
        // so the user always sees relevant furniture rather than an empty card.
        if (results.Count == 0 && words.Count > 0)
        {
            _logger.LogDebug(
                "Furniture keyword search returned 0 for '{Query}' — retrying without keyword filter", query);
            results = await RunQueryAsync(string.Empty, [], furnitureType, material,
                                          illuminated, excludedCatalogNumbers, topK, ct);
        }

        return results;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<List<FurnitureSearchResult>> RunQueryAsync(
        string query,
        List<string> words,
        string? furnitureType,
        string? material,
        bool? illuminated,
        string[]? excludedCatalogNumbers,
        int topK,
        CancellationToken ct)
    {
        var conditions = new List<string> { "GroupSlug = ANY(@FurnitureSlugs)" };
        var parameters = new DynamicParameters();
        parameters.Add("FurnitureSlugs", FurnitureGroupSlugs);
        parameters.Add("TopK", topK);

        if (words.Count > 0)
        {
            // Each word is searched across all descriptive columns (OR within word, AND across words)
            var wordConditions = words
                .Select((_, i) =>
                    $"(FamilyName ILIKE @w{i} OR SubFamilyName ILIKE @w{i} " +
                    $"OR GroupsName ILIKE @w{i} OR ExtraInfo ILIKE @w{i} " +
                    $"OR ProductTechnicalSpec ILIKE @w{i} OR FamilyExtraInfo ILIKE @w{i} OR AIEnrichmentJson ILIKE @w{i})")
                .ToList();
            conditions.Add($"({string.Join(" OR ", wordConditions)})");
            for (int i = 0; i < words.Count; i++)
                parameters.Add($"w{i}", $"%{words[i]}%");
        }
        else if (!string.IsNullOrWhiteSpace(query))
        {
            conditions.Add("(FamilyName ILIKE @Query OR SubFamilyName ILIKE @Query OR ExtraInfo ILIKE @Query OR ProductTechnicalSpec ILIKE @Query OR FamilyExtraInfo ILIKE @Query OR AIEnrichmentJson ILIKE @Query)");
            parameters.Add("Query", $"%{query}%");
        }

        if (furnitureType is not null)
        {
            conditions.Add("GroupsName ILIKE @FurnitureType");
            parameters.Add("FurnitureType", $"%{furnitureType}%");
        }

        if (material is not null)
        {
            conditions.Add("(Finish ILIKE @Material OR ExtraInfo ILIKE @Material OR ProductTechnicalSpec ILIKE @Material OR FamilyExtraInfo ILIKE @Material)");
            parameters.Add("Material", $"%{material}%");
        }

        if (illuminated == true)
            conditions.Add("WattageW IS NOT NULL AND WattageW > 0");
        else if (illuminated == false)
            conditions.Add("(WattageW IS NULL OR WattageW = 0)");

        if (excludedCatalogNumbers is { Length: > 0 })
        {
            conditions.Add("NOT (CatalogNumber = ANY(@ExcludedCatalogNumbers))");
            parameters.Add("ExcludedCatalogNumbers", excludedCatalogNumbers);
        }

        var sql = $"""
            SELECT
                ProductId, CatalogNumber, FamilyName, SubFamilyName, GroupsName, CategoryName,
                FamilyListPageImage, Application, Finish, LeadTime,
                DimensionA, DimensionAFraction, DimensionB, DimensionBFraction,
                DimensionC, DimensionCFraction, DimensionD, DimensionDFraction,
                DimensionE, DimensionEFraction,
                SpecDocumentUrl, TechnicalDocumentUrl,
                0.0::float8 AS MatchScore
            FROM Products
            WHERE {string.Join(" AND ", conditions)}
            ORDER BY FamilyName, CatalogNumber
            LIMIT @TopK
            """;

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            var results = (await conn.QueryAsync<FurnitureSearchResult>(
                new CommandDefinition(sql, parameters, cancellationToken: ct))).ToList();
            if (results.Count > 0)
            {
                var projectMap = await FetchProjectsAsync(conn, results.Select(r => r.ProductId).ToArray(), ct);
                return results.Select(r => r with { Projects = ProjectsFor(projectMap, r.ProductId) }).ToList();
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FurnitureSearchService SQL query failed for '{Query}'", query);
            throw;
        }
    }

    private record ProjectRow(int ProductId, string? Name, string? Location, string? ListingImage, string? Slug);

    private static async Task<Dictionary<int, List<ProductProjectDto>>> FetchProjectsAsync(
        NpgsqlConnection conn, int[] productIds, CancellationToken ct, int maxPerProduct = 5)
    {
        if (productIds.Length == 0) return [];
        const string sql = """
            SELECT ProductId, Name, Location, ListingImage, Slug
            FROM (
                SELECT ProductId, Name, Location, ListingImage, Slug,
                       ROW_NUMBER() OVER (PARTITION BY ProductId ORDER BY SortOrder) AS rn
                FROM ProductProjects
                WHERE ProductId = ANY(@Ids)
            ) t
            WHERE rn <= @Max
            """;
        var rows = await conn.QueryAsync<ProjectRow>(
            new CommandDefinition(sql, new { Ids = productIds, Max = maxPerProduct }, cancellationToken: ct));
        return rows
            .GroupBy(r => r.ProductId)
            .ToDictionary(g => g.Key, g => g.Select(r => new ProductProjectDto(r.Name, r.Location, r.ListingImage, r.Slug)).ToList());
    }

    private static IReadOnlyList<ProductProjectDto> ProjectsFor(Dictionary<int, List<ProductProjectDto>> map, int id)
        => map.TryGetValue(id, out var list) ? list : [];
}
