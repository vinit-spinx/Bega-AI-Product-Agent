using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Dapper;
using Npgsql;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Assembles a priced bill of materials by looking up DNP and MSRP for each catalog number
/// directly from the SQL Server Products table.
/// Prices are never estimated — all values come from the ingested catalog data.
/// </summary>
public sealed class BillOfMaterialsService : IBillOfMaterialsService
{
    private readonly string _connectionString;
    private readonly ILogger<BillOfMaterialsService> _logger;

    public BillOfMaterialsService(IConfiguration config, ILogger<BillOfMaterialsService> logger)
    {
        _connectionString = config.GetConnectionString("Database")
            ?? throw new InvalidOperationException("ConnectionStrings:Database is required.");
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<BomReport> GenerateAsync(
        List<BomLineRequest> items,
        string? projectName = null,
        CancellationToken ct = default)
    {
        if (items.Count == 0)
        {
            return new BomReport
            {
                ProjectName = projectName,
                LineItems = [],
                SubtotalDnp = 0,
                SubtotalMsrp = 0,
                Currency = "USD",
                ItemCount = 0,
                NotFoundItems = []
            };
        }

        var catalogNumbers = items.Select(i => i.CatalogNumber).Distinct().ToArray();

        const string sql = """
            SELECT
                CatalogNumber,
                FamilyName,
                SubFamilyName,
                LeadTime,
                DnpPrice,
                MsrpPrice,
                SystemWattageW
            FROM Products
            WHERE CatalogNumber = ANY(@CatalogNumbers)
            """;

        Dictionary<string, ProductPricingRow> pricing;
        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            var rows = await conn.QueryAsync<ProductPricingRow>(
                new CommandDefinition(sql, new { CatalogNumbers = catalogNumbers }, cancellationToken: ct));
            pricing = rows.ToDictionary(r => r.CatalogNumber, StringComparer.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BillOfMaterialsService: failed to look up pricing for {Count} catalog numbers", catalogNumbers.Length);
            throw;
        }

        var lineItems = new List<BomLineItem>();
        var notFound = new List<string>();
        decimal totalDnp = 0m;
        decimal totalMsrp = 0m;
        decimal totalWattage = 0m;

        foreach (var request in items)
        {
            if (!pricing.TryGetValue(request.CatalogNumber, out var row))
            {
                notFound.Add(request.CatalogNumber);
                lineItems.Add(new BomLineItem
                {
                    CatalogNumber = request.CatalogNumber,
                    Description = "NOT FOUND IN CATALOG",
                    AreaLabel = request.AreaLabel,
                    Quantity = request.Quantity
                });
                continue;
            }

            var lineDnp = (row.DnpPrice ?? 0m) * request.Quantity;
            var lineMsrp = (row.MsrpPrice ?? 0m) * request.Quantity;
            totalDnp += lineDnp;
            totalMsrp += lineMsrp;

            // Accumulate wattage only for products that carry electrical data (lighting, not furniture)
            if (row.SystemWattageW is > 0m)
                totalWattage += row.SystemWattageW.Value * request.Quantity;

            lineItems.Add(new BomLineItem
            {
                CatalogNumber = request.CatalogNumber,
                Description = row.SubFamilyName ?? row.FamilyName,
                FamilyName = row.FamilyName,
                AreaLabel = request.AreaLabel,
                Quantity = request.Quantity,
                UnitDnp = row.DnpPrice,
                LineTotalDnp = lineDnp > 0 ? lineDnp : null,
                UnitMsrp = row.MsrpPrice,
                LineTotalMsrp = lineMsrp > 0 ? lineMsrp : null,
                LeadTime = row.LeadTime,
                SystemWattageW = row.SystemWattageW is > 0m ? row.SystemWattageW : null
            });
        }

        return new BomReport
        {
            ProjectName = projectName,
            LineItems = lineItems,
            SubtotalDnp = totalDnp,
            SubtotalMsrp = totalMsrp,
            Currency = "USD",
            ItemCount = lineItems.Count,
            NotFoundItems = notFound,
            TotalSystemWattageW = totalWattage
        };
    }

    // Internal projection for the pricing lookup query
    private sealed record ProductPricingRow(
        string CatalogNumber,
        string? FamilyName,
        string? SubFamilyName,
        string? LeadTime,
        decimal? DnpPrice,
        decimal? MsrpPrice,
        decimal? SystemWattageW);
}
