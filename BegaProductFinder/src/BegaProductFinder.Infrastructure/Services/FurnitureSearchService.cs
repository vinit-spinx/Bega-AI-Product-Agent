using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Dapper;
using Microsoft.Data.SqlClient;
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
        var conditions = new List<string> { "GroupSlug IN @FurnitureSlugs" };
        var parameters = new DynamicParameters();
        parameters.Add("FurnitureSlugs", FurnitureGroupSlugs);
        parameters.Add("TopK", topK);

        if (words.Count > 0)
        {
            // Each word is searched across all descriptive columns (OR within word, AND across words)
            var wordConditions = words
                .Select((_, i) =>
                    $"(FamilyName LIKE @w{i} OR SubFamilyName LIKE @w{i} " +
                    $"OR GroupsName LIKE @w{i} OR ExtraInfo LIKE @w{i} " +
                    $"OR ProductTechnicalSpec LIKE @w{i} OR FamilyExtraInfo LIKE @w{i} OR AIEnrichmentJson LIKE @w{i})")
                .ToList();
            conditions.Add($"({string.Join(" OR ", wordConditions)})");
            for (int i = 0; i < words.Count; i++)
                parameters.Add($"w{i}", $"%{words[i]}%");
        }
        else if (!string.IsNullOrWhiteSpace(query))
        {
            conditions.Add("(FamilyName LIKE @Query OR SubFamilyName LIKE @Query OR ExtraInfo LIKE @Query OR ProductTechnicalSpec LIKE @Query OR FamilyExtraInfo LIKE @Query OR AIEnrichmentJson LIKE @Query)");
            parameters.Add("Query", $"%{query}%");
        }

        if (furnitureType is not null)
        {
            conditions.Add("GroupsName LIKE @FurnitureType");
            parameters.Add("FurnitureType", $"%{furnitureType}%");
        }

        if (material is not null)
        {
            conditions.Add("(Finish LIKE @Material OR ExtraInfo LIKE @Material OR ProductTechnicalSpec LIKE @Material OR FamilyExtraInfo LIKE @Material)");
            parameters.Add("Material", $"%{material}%");
        }

        if (illuminated == true)
            conditions.Add("WattageW IS NOT NULL AND WattageW > 0");
        else if (illuminated == false)
            conditions.Add("(WattageW IS NULL OR WattageW = 0)");

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
            _logger.LogError(ex, "FurnitureSearchService SQL query failed for '{Query}'", query);
            throw;
        }
    }
}
