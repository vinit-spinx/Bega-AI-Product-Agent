namespace BegaProductFinder.Core.Models;

/// <summary>
/// Optional structured filters applied alongside a natural language query.
/// Maps directly to the input parameters of the <c>search_products</c> Claude tool.
/// All properties are nullable — only non-null values are applied to the SQL query.
/// Exact DB values for each field are documented in the property summary comments.
/// </summary>
public record ProductSearchFilters
{
    /// <summary>"Exterior" or "Interior".</summary>
    public string? Category { get; init; }

    /// <summary>Group slug e.g. "garden", "in-grade".</summary>
    public string? Group { get; init; }

    /// <summary>Family name e.g. "Garden bollard".</summary>
    public string? FamilyName { get; init; }

    // ── Wattage ──────────────────────────────────────────────────────────────

    /// <summary>Minimum LED wattage (WattageW column), inclusive.</summary>
    public decimal? MinWattageW { get; init; }

    /// <summary>Maximum LED wattage (WattageW column), inclusive.</summary>
    public decimal? MaxWattageW { get; init; }

    // ── Lumen output ─────────────────────────────────────────────────────────

    /// <summary>Minimum lumen output (LumenOutputLm column), inclusive.</summary>
    public decimal? MinLumenOutput { get; init; }

    /// <summary>Maximum lumen output (LumenOutputLm column), inclusive.</summary>
    public decimal? MaxLumenOutput { get; init; }

    // ── Beam angle range (replaces single exact-match field) ─────────────────
    // Bega site ranges: Spot 0-10° · Very Narrow 11-20° · Narrow 21-39°
    //                   Wide 40-69° · Very Wide 70-90°

    /// <summary>Minimum beam angle in degrees (inclusive).</summary>
    public decimal? MinBeamAngleDeg { get; init; }

    /// <summary>Maximum beam angle in degrees (inclusive).</summary>
    public decimal? MaxBeamAngleDeg { get; init; }

    // ── Color temperature ─────────────────────────────────────────────────────
    // DB values: 2200, 2700, 3000, 3500, 4000

    /// <summary>Color temperature in Kelvin. Matched against ColorTemperatureJson array.</summary>
    public int? ColorTemperatureK { get; init; }

    // ── Voltage ───────────────────────────────────────────────────────────────
    // Exact DB strings: "12V AC" · "24V DC" · "120V AC" · "120-277V AC" · "277V AC"

    /// <summary>Voltage substring match against Voltage column (LIKE %value%).</summary>
    public string? Voltage { get; init; }

    // ── Control protocol ──────────────────────────────────────────────────────
    // Exact DB strings: "0-10V" · "ELV/TRIAC" · "DALI-2" · "DMX"
    // LIKE match used so "DALI" matches "DALI-2".

    /// <summary>Control protocol substring match (LIKE %value%).</summary>
    public string? ControlProtocol { get; init; }

    // ── Application ───────────────────────────────────────────────────────────
    // Exact DB strings: "Accent" · "Emergency" · "Facade" · "Pathway"
    //                   "Roadway" · "Site & Area" · "Unshielded"

    /// <summary>Application substring match against Application column (LIKE %value%).</summary>
    public string? Application { get; init; }

    // ── Distribution ──────────────────────────────────────────────────────────
    // Exact DB strings: "Type I" · "Type II" · "Type III" · "Type IV" · "Type V"

    /// <summary>Light distribution substring match against Distribution column (LIKE %value%).</summary>
    public string? Distribution { get; init; }

    // ── Dynamic light ─────────────────────────────────────────────────────────
    // Exact DB strings: "RGBW" · "Tunable White"

    /// <summary>Dynamic light type substring match against DynamicLight column (LIKE %value%).</summary>
    public string? DynamicLight { get; init; }

    // ── Compliance / environmental ────────────────────────────────────────────
    // Exact DB strings (SocialEnviornmentalHealth column):
    // "International Dark Sky" · "Wildlife Friendly" · "EPD Available" · "FSC certified wood"

    /// <summary>Compliance substring match against SocialEnviornmentalHealth column (LIKE %value%).</summary>
    public string? Compliance { get; init; }

    // ── Boolean flags ─────────────────────────────────────────────────────────

    /// <summary>Filter to ADA-compliant products only (IsAdaCompliant = 1).</summary>
    public bool? AdaCompliant { get; init; }

    /// <summary>Filter to EXPRESS / quick-ship products only (IsExpressDelivery = 1).</summary>
    public bool? ExpressDelivery { get; init; }

    /// <summary>Maximum results to return. Hard-capped at 3 in the orchestrator.</summary>
    public int TopK { get; init; } = 3;
}
