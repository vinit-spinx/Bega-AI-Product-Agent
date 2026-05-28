namespace BegaProductFinder.Core.Models;

/// <summary>
/// Optional structured filters applied alongside a natural language query.
/// Maps directly to the input parameters of the <c>search_products</c> Claude tool.
/// All properties are nullable — only non-null values are applied to the query.
/// </summary>
public record ProductSearchFilters
{
    /// <summary>Filter to "Exterior" or "Interior".</summary>
    public string? Category { get; init; }

    /// <summary>Filter to a specific group slug e.g. "in-grade".</summary>
    public string? Group { get; init; }

    /// <summary>Filter to a specific family name e.g. "In-grade luminaire".</summary>
    public string? FamilyName { get; init; }

    /// <summary>Minimum LED wattage in watts (inclusive).</summary>
    public decimal? MinWattageW { get; init; }

    /// <summary>Maximum LED wattage in watts (inclusive).</summary>
    public decimal? MaxWattageW { get; init; }

    /// <summary>Minimum lumen output in lumens (inclusive).</summary>
    public decimal? MinLumenOutput { get; init; }

    /// <summary>Exact beam angle in degrees to match.</summary>
    public decimal? BeamAngleDeg { get; init; }

    /// <summary>Color temperature in Kelvin e.g. 2700, 3000, 3500, 4000.</summary>
    public int? ColorTemperatureK { get; init; }

    /// <summary>Voltage spec substring match e.g. "24V DC".</summary>
    public string? Voltage { get; init; }

    /// <summary>Control protocol match e.g. "DALI", "0-10V", "Non-Dimming".</summary>
    public string? ControlProtocol { get; init; }

    /// <summary>Filter to ADA-compliant products only.</summary>
    public bool? AdaCompliant { get; init; }

    /// <summary>Filter to express-delivery products only.</summary>
    public bool? ExpressDelivery { get; init; }

    /// <summary>Maximum number of results to return. Defaults to 5.</summary>
    public int TopK { get; init; } = 5;
}
