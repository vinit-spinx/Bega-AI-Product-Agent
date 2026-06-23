using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Looks up BEGA sales representatives using Dapper against SQL Server.
/// All queries use raw SQL — no EF Core tracking.
/// </summary>
public sealed class RepresentativeService : IRepresentativeService
{
    private readonly string _connectionString;
    private readonly ILogger<RepresentativeService> _logger;

    public RepresentativeService(IConfiguration config, ILogger<RepresentativeService> logger)
    {
        _connectionString = config.GetConnectionString("SqlServer")
            ?? throw new InvalidOperationException("ConnectionStrings:SqlServer is required.");
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<List<CountryDto>> GetCountriesAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT DISTINCT co.Id, co.Name, co.ShortCode
            FROM Countries co
            INNER JOIN Representatives r ON r.CountryId = co.Id AND r.IsActive = 1
            WHERE co.IsActive = 1
            ORDER BY co.Name
            """;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            var results = await conn.QueryAsync<CountryDto>(
                new CommandDefinition(sql, cancellationToken: ct));
            return results.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve representative countries");
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<List<StateDto>> GetStatesAsync(int? countryId = null, CancellationToken ct = default)
    {
        const string sql = """
            SELECT s.Id, s.Name, s.CountryId
            FROM States s
            WHERE s.IsActive = 1
              AND (@CountryId IS NULL OR s.CountryId = @CountryId)
            ORDER BY s.Name
            """;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            var results = await conn.QueryAsync<StateDto>(
                new CommandDefinition(sql, new { CountryId = countryId }, cancellationToken: ct));
            return results.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve states for country {CountryId}", countryId);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<List<RepresentativeSearchResult>> SearchAsync(
        RepresentativeSearchFilters filters,
        CancellationToken ct = default)
    {
        // Each filter is "match if blank/null" — an unset filter never excludes a row,
        // mirroring the legacy representative-finder behaviour.        

        try
        {
            await using var conn = new SqlConnection(_connectionString);

            if (filters.StateId.HasValue && filters.StateId.Value > 0)
            {
                var stateName = await conn.QueryFirstOrDefaultAsync<string>(
                    "SELECT Name FROM States WHERE Id=@Id",
                    new { Id = filters.StateId });

                if (!string.IsNullOrEmpty(stateName))
                    filters = filters with { StateText = stateName };
            }

            if (!string.IsNullOrWhiteSpace(filters.StateText))
            {
                var stateId = await conn.QueryFirstOrDefaultAsync<int?>(
                    "SELECT Id FROM States WHERE Name=@Name",
                    new { Name = filters.StateText });

                if (stateId.HasValue)
                    filters = filters with { StateId = stateId };
            }

            const string sql = """
                    SELECT DISTINCT
                        RT.Id,
                        RT.AgencyName,
                        RT.[Address],
                        RT.Phone,
                        RT.Fax,
                        RT.Email,
                        RT.Website,
                        RT.Latitude,
                        RT.Longitude,
                        RT.CountryId,
                        RT.StateId,
                        RT.StateText,
                        RT.SortOrder
                    FROM Representatives RT
                    INNER JOIN Countries CO
                        ON CO.Id = RT.CountryId
                    LEFT JOIN States S
                        ON S.Id = RT.StateId
                    INNER JOIN RepresentativeDetails RD
                        ON RD.RepresentativeId = RT.Id
                       AND RD.IsActive = 1
                    WHERE RT.IsActive = 1
                        AND (RT.CountryId = @CountryId OR @CountryId IS NULL)

                        AND (
                                RT.StateId = @StateId
                                OR (
                                        RT.StateText = @StateText
                                        OR ISNULL(@StateText,'') = ''
                                   )
                            )

                        AND (RD.City = @City OR ISNULL(@City,'') = '')
                        AND (RD.Zip = @Zip OR ISNULL(@Zip,'') = '')
                        AND (RT.Provinces = @Provinces OR ISNULL(@Provinces,'') = '')
                    ORDER BY RT.AgencyName
                    """;

            var results = await conn.QueryAsync<RepresentativeSearchResult>(
                new CommandDefinition(
                    sql,
                    new
                    {
                        CountryId = filters.CountryId,
                        StateId = filters.StateId,
                        StateText = filters.StateText ?? "",
                        City = filters.City ?? "",
                        Zip = filters.Zip ?? "",
                        Provinces = filters.Provinces ?? ""
                    },
                    cancellationToken: ct));
            return results.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search representatives with filters {@Filters}", filters);
            throw;
        }
    }
}
