using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Public, frontend-facing endpoints for looking up BEGA sales representatives by
/// country, state, city, or zip. Uses the default CORS policy — same access as
/// <see cref="ProductEndpoints"/> — never gated behind the admin API key.
/// </summary>
public static class RepresentativeEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/representatives").WithTags("Representatives");

        group.MapGet("/countries", GetCountriesAsync)
            .WithName("GetRepresentativeCountries")
            .WithSummary("List all active countries that have at least one BEGA representative.");

        group.MapGet("/states", GetStatesAsync)
            .WithName("GetRepresentativeStates")
            .WithSummary("List active states, optionally filtered by country.");

        group.MapGet("/search", SearchAsync)
            .WithName("SearchRepresentatives")
            .WithSummary("Find BEGA representatives by country, state, city, or zip.");
    }

    // ── GET /api/representatives/countries ────────────────────────────────────

    private static async Task<IResult> GetCountriesAsync(
        IRepresentativeService representatives,
        CancellationToken ct)
    {
        var countries = await representatives.GetCountriesAsync(ct);
        return Results.Ok(countries);
    }

    // ── GET /api/representatives/states ───────────────────────────────────────

    private static async Task<IResult> GetStatesAsync(
        [FromQuery] int? countryId,
        IRepresentativeService representatives,
        CancellationToken ct)
    {
        var states = await representatives.GetStatesAsync(countryId, ct);
        return Results.Ok(states);
    }

    // ── GET /api/representatives/search ───────────────────────────────────────

    private static async Task<IResult> SearchAsync(
        [FromQuery] int? countryId,
        [FromQuery] int? stateId,
        [FromQuery] string? stateText,
        [FromQuery] string? city,
        [FromQuery] string? zip,
        [FromQuery] string? provinces,
        IRepresentativeService representatives,
        CancellationToken ct)
    {
        var hasAnyFilter = countryId is not null
            || stateId is not null
            || !string.IsNullOrWhiteSpace(stateText)
            || !string.IsNullOrWhiteSpace(city)
            || !string.IsNullOrWhiteSpace(zip)
            || !string.IsNullOrWhiteSpace(provinces);

        if (!hasAnyFilter)
            return Results.BadRequest(new { error = "At least one search filter is required." });

        var filters = new RepresentativeSearchFilters
        {
            CountryId = countryId,
            StateId = stateId,
            StateText = stateText,
            City = city,
            Zip = zip,
            Provinces = provinces,
        };

        var results = await representatives.SearchAsync(filters, ct);
        return Results.Ok(results);
    }
}
