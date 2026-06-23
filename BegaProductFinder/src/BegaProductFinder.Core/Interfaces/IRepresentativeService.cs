using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Looks up BEGA sales representatives by country/state/city/zip.
/// All queries use Dapper against SQL Server — read-only, no EF Core tracking.
/// </summary>
public interface IRepresentativeService
{
    /// <summary>Returns all active countries that have at least one representative.</summary>
    Task<List<CountryDto>> GetCountriesAsync(CancellationToken ct = default);

    /// <summary>
    /// Returns all active states, optionally scoped to a single country.
    /// </summary>
    /// <param name="countryId">Optional country filter.</param>
    Task<List<StateDto>> GetStatesAsync(int? countryId = null, CancellationToken ct = default);

    /// <summary>
    /// Finds representatives matching the given filters. Any unset filter is ignored
    /// rather than excluding rows — mirrors the legacy representative-finder behaviour.
    /// </summary>
    Task<List<RepresentativeSearchResult>> SearchAsync(
        RepresentativeSearchFilters filters,
        CancellationToken ct = default);
}
