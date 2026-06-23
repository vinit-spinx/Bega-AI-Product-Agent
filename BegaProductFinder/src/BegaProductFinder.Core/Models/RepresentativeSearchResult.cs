namespace BegaProductFinder.Core.Models;

/// <summary>Lightweight country projection for the frontend country dropdown.</summary>
public sealed record CountryDto(int Id, string Name, string? ShortCode);

/// <summary>Lightweight state projection for the frontend state dropdown.</summary>
public sealed record StateDto(int Id, string Name, int CountryId);

/// <summary>
/// Optional filters for <c>IRepresentativeService.SearchAsync</c>. All filters are
/// applied with OR-style "match if blank/null" semantics, matching the legacy
/// representative-finder behaviour: an unset filter never excludes a row.
/// </summary>
public sealed record RepresentativeSearchFilters
{
    public int? CountryId { get; init; }
    public int? StateId { get; init; }
    public string? StateText { get; init; }
    public string? City { get; init; }
    public string? Zip { get; init; }
    public string? Provinces { get; init; }
}

/// <summary>A single representative row returned by search, joined with country/state/city data.</summary>
public sealed record RepresentativeSearchResult(
    int Id,
    string AgencyName,
    string Address,
    string? Phone,
    string? Fax,
    string? Email,
    string? Website,
    string? Latitude,
    string? Longitude,
    int CountryId,
    int? StateId,
    string? StateText,
    int? SortOrder
);
