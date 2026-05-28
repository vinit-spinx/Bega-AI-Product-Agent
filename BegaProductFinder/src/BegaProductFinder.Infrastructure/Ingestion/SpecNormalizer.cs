using System.Text.Json;
using System.Text.RegularExpressions;
using BegaProductFinder.Core.Models;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Ingestion;

/// <summary>
/// Maps raw BEGA JSON field values to typed canonical properties on a <see cref="Product"/>.
/// Mapping rules are loaded from <c>specsMapping.json</c> so new fields can be added
/// without code changes.
/// </summary>
public sealed partial class SpecNormalizer
{
    private readonly IReadOnlyList<SpecMappingEntry> _mappings;
    private readonly IReadOnlyList<string> _furnitureGroupSlugs;
    private readonly ILogger<SpecNormalizer> _logger;

    [GeneratedRegex(@"(\d+)K\s*\(([^)]+)\)", RegexOptions.Compiled)]
    private static partial Regex CctRegex();

    [GeneratedRegex(@"[\d.]+", RegexOptions.Compiled)]
    private static partial Regex NumericRegex();

    public SpecNormalizer(string specsMappingPath, ILogger<SpecNormalizer> logger)
    {
        _logger = logger;
        var json = File.ReadAllText(specsMappingPath);
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        _mappings = root.GetProperty("mappings")
            .Deserialize<List<SpecMappingEntry>>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? [];

        _furnitureGroupSlugs = root.TryGetProperty("furniture_group_slugs", out var slugsEl)
            ? slugsEl.Deserialize<List<string>>() ?? []
            : [];
    }

    /// <summary>Returns true when a product's GroupSlug identifies it as furniture rather than a luminaire.</summary>
    public bool IsFurniture(string? groupSlug)
        => groupSlug is not null && _furnitureGroupSlugs.Contains(groupSlug, StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Applies all spec mapping rules from <c>specsMapping.json</c> to populate
    /// the computed columns on the given product from its raw JSON source values.
    /// </summary>
    internal void Normalize(Product product, BegaProductJson raw)
    {
        foreach (var mapping in _mappings)
        {
            try
            {
                Apply(product, raw, mapping);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Spec normalization failed for field '{Field}' on catalog {CatalogNumber}",
                    mapping.Field, product.CatalogNumber);
            }
        }
    }

    private void Apply(Product product, BegaProductJson raw, SpecMappingEntry mapping)
    {
        switch (mapping.ParseMode)
        {
            case "numeric_strip_unit":
                // "0.6W" -> 0.6m, "4W" -> 4.0 — used for Led -> WattageW
                product.WattageW = mapping.Field == "Led"
                    ? ParseNumericStripUnit(raw.Led)
                    : null;
                product.LedWattage = raw.Led;
                break;

            case "decimal":
                if (mapping.CanonicalKey == "SystemWattageW")
                    product.SystemWattageW = ParseDecimal(raw.SystemWattageDouble);
                else if (mapping.CanonicalKey == "LumenOutputLm")
                    product.LumenOutputLm = ParseDecimal(raw.LumenOutputDouble);
                break;

            case "decimal_nullable":
                if (mapping.CanonicalKey == "BeamAngleDeg")
                    product.BeamAngleDeg = ParseDecimalNullable(raw.BeamAngle);
                else if (mapping.CanonicalKey == "DistributorNetPrice")
                    product.DnpPrice = ParsePriceNullable(raw.Dnp);
                else if (mapping.CanonicalKey == "Msrp")
                    product.MsrpPrice = ParsePriceNullable(raw.Msrp);
                break;

            case "cct_list":
                product.ColorTemperatureJson = ParseCctListToJson(raw.ColorTemperature);
                break;

            case "bool_from_int":
                if (mapping.CanonicalKey == "AdaCompliant")
                    product.IsAdaCompliant = ParseBoolFromInt(raw.Ada);
                else if (mapping.CanonicalKey == "ExpressDelivery")
                    product.IsExpressDelivery = ParseBoolFromInt(raw.Express);
                break;

            case "string":
                if (mapping.CanonicalKey == "VoltageSpec")
                    product.Voltage = raw.Voltage;
                else if (mapping.CanonicalKey == "ControlProtocol")
                    product.ControlProtocol = raw.ControlProtocol;
                else if (mapping.CanonicalKey == "Application")
                    product.Application = raw.Application;
                else if (mapping.CanonicalKey == "LeadTime")
                    product.LeadTime = raw.LeadTime;
                break;

            case "string_nullable":
                if (mapping.CanonicalKey == "LightDistribution")
                    product.Distribution = raw.Distribution;
                else if (mapping.CanonicalKey == "DynamicLight")
                    product.DynamicLight = raw.DynamicLight;
                else if (mapping.CanonicalKey == "Finish")
                    product.Finish = raw.Finish;
                break;
        }
    }

    // ── Static parse helpers ─────────────────────────────────────────────────

    internal static decimal? ParseNumericStripUnit(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var match = NumericRegex().Match(value);
        return match.Success && decimal.TryParse(match.Value, out var result) ? result : null;
    }

    internal static decimal? ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return decimal.TryParse(value, out var result) ? result : null;
    }

    internal static decimal? ParseDecimalNullable(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        // Strip degree symbol e.g. "74°"
        var cleaned = value.TrimEnd('°', ' ');
        return decimal.TryParse(cleaned, out var result) ? result : null;
    }

    internal static decimal? ParsePriceNullable(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (!decimal.TryParse(value, out var result)) return null;
        return result == 0m ? null : result;
    }

    internal static bool ParseBoolFromInt(string? value)
        => value == "1";

    /// <summary>
    /// Parses a semicolon-delimited CCT string into a JSON array of
    /// <c>[{ "kelvin": 2700, "code": "K27" }, ...]</c>.
    /// Returns null if the input is empty.
    /// </summary>
    internal static string? ParseCctListToJson(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        var options = new List<ColorTemperatureOption>();
        foreach (Match m in CctRegex().Matches(value))
        {
            if (int.TryParse(m.Groups[1].Value, out var kelvin))
                options.Add(new ColorTemperatureOption(kelvin, m.Groups[2].Value));
        }

        return options.Count == 0 ? null
            : JsonSerializer.Serialize(options, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }
}

/// <summary>A single entry from the <c>mappings</c> array in <c>specsMapping.json</c>.</summary>
internal sealed record SpecMappingEntry(string Field, string CanonicalKey, string ParseMode);
