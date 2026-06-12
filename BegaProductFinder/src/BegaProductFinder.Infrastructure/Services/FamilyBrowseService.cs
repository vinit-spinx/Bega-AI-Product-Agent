using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Dapper;
using Npgsql;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Navigates the BEGA product hierarchy using Dapper against SQL Server.
/// All queries use <c>AsNoTracking</c>-equivalent reads via raw SQL — no EF Core tracking.
/// </summary>
public sealed class FamilyBrowseService : IFamilyBrowseService
{
    private readonly string _connectionString;
    private readonly ILogger<FamilyBrowseService> _logger;

    public FamilyBrowseService(IConfiguration config, ILogger<FamilyBrowseService> logger)
    {
        _connectionString = config.GetConnectionString("Database")
            ?? throw new InvalidOperationException("ConnectionStrings:Database is required.");
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<List<string>> GetCategoriesAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT DISTINCT CategoryName
            FROM Products
            WHERE CategoryName IS NOT NULL
            ORDER BY CategoryName
            """;

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            var results = await conn.QueryAsync<string>(
                new CommandDefinition(sql, cancellationToken: ct));
            return results.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve categories");
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<List<string>> GetGroupsAsync(
        string? category = null,
        CancellationToken ct = default)
    {
        var sql = category is null
            ? """
              SELECT DISTINCT GroupsName
              FROM Products
              WHERE GroupsName IS NOT NULL
              ORDER BY GroupsName
              """
            : """
              SELECT DISTINCT GroupsName
              FROM Products
              WHERE GroupsName IS NOT NULL
                AND CategoryName = @Category
              ORDER BY GroupsName
              """;

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            var results = await conn.QueryAsync<string>(
                new CommandDefinition(sql, new { Category = category }, cancellationToken: ct));
            return results.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve groups for category '{Category}'", category);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<List<FamilyBrowseResult>> GetFamiliesAsync(
        string? category = null,
        string? group = null,
        CancellationToken ct = default)
    {
        var conditions = new List<string> { "FamilyName IS NOT NULL", "FamilySlug IS NOT NULL" };
        if (category is not null) conditions.Add("CategoryName = @Category");
        if (group is not null) conditions.Add("GroupsName = @Group");

        var sql = $"""
            SELECT
                FamilyName,
                FamilySlug,
                SubFamilyName,
                CategoryName,
                GroupSlug,
                GroupsName,
                COUNT(*) AS ProductCount
            FROM Products
            WHERE {string.Join(" AND ", conditions)}
            GROUP BY FamilyName, FamilySlug, SubFamilyName, CategoryName, GroupSlug, GroupsName
            ORDER BY FamilyName, SubFamilyName
            """;

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            var results = await conn.QueryAsync<FamilyBrowseResult>(
                new CommandDefinition(sql, new { Category = category, Group = group }, cancellationToken: ct));
            return results.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve families");
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<List<ProductSearchResult>> GetProductsByFamilyAsync(
        string familySlug,
        CancellationToken ct = default)
    {
        const string sql = """
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
                0.0::float8 AS MatchScore
            FROM Products p
            WHERE p.FamilySlug = @FamilySlug
            ORDER BY p.CatalogNumber
            """;

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            var results = (await conn.QueryAsync<ProductSearchResult>(
                new CommandDefinition(sql, new { FamilySlug = familySlug }, cancellationToken: ct))).ToList();
            if (results.Count > 0)
            {
                var projectMap = await FetchProjectsAsync(conn, results.Select(r => r.ProductId).ToArray(), ct);
                return results.Select(r => r with { Projects = ProjectsFor(projectMap, r.ProductId) }).ToList();
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve products for family slug '{FamilySlug}'", familySlug);
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
