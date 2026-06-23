using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Proxies location lookups to OpenStreetMap Nominatim so the "Request a Quote" form can
/// offer real address autocomplete and capture lat/lng without requiring an API key.
/// Calls are proxied server-side because Nominatim's usage policy requires a descriptive
/// User-Agent header and discourages direct browser calls.
/// </summary>
public static class GeocodeEndpoints
{
    public static void Map(WebApplication app)
    {
        app.MapGroup("/api/geocode")
            .WithTags("Geocode")
            .MapGet("/search", SearchAsync)
            .WithName("GeocodeSearch")
            .WithSummary("Search for a location by free text via OpenStreetMap Nominatim.");
    }

    private static async Task<IResult> SearchAsync(
        [FromQuery] string q,
        IHttpClientFactory httpClientFactory,
        ILoggerFactory loggerFactory,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Results.Ok(Array.Empty<object>());

        var logger = loggerFactory.CreateLogger("GeocodeEndpoints");
        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd("BegaProductFinder/1.0 (admin geocoding lookup)");

        var url = $"https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q={Uri.EscapeDataString(q.Trim())}";

        try
        {
            var response = await client.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
                return Results.Ok(Array.Empty<object>());

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);

            var results = new List<object>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                var address = item.TryGetProperty("address", out var addr) ? addr : default;

                string? City(JsonElement a) =>
                    TryGetString(a, "city") ?? TryGetString(a, "town") ?? TryGetString(a, "village") ?? TryGetString(a, "county");

                results.Add(new
                {
                    displayName = item.GetProperty("display_name").GetString(),
                    lat = double.Parse(item.GetProperty("lat").GetString()!),
                    lon = double.Parse(item.GetProperty("lon").GetString()!),
                    city = address.ValueKind == JsonValueKind.Object ? City(address) : null,
                    country = address.ValueKind == JsonValueKind.Object ? TryGetString(address, "country") : null,
                    countryCode = address.ValueKind == JsonValueKind.Object ? TryGetString(address, "country_code") : null,
                });
            }

            return Results.Ok(results);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Geocode search failed for query {Query}", q);
            return Results.Ok(Array.Empty<object>());
        }
    }

    private static string? TryGetString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) ? value.GetString() : null;
}
