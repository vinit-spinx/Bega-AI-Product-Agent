namespace BegaProductFinder.Core.Models;

/// <summary>
/// A single numerical filter condition applied to a product specification field.
/// Maps to one element in the <c>filters</c> array of the <c>filter_by_specs</c> Claude tool.
/// </summary>
public record SpecFilter
{
    /// <summary>
    /// Canonical spec column name.
    /// Known values: "WattageW", "SystemWattageW", "LumenOutputLm", "BeamAngleDeg", "DnpPrice", "MsrpPrice".
    /// </summary>
    public required string SpecKey { get; init; }

    /// <summary>Comparison operator: "gte" | "lte" | "eq" | "between".</summary>
    public required string Operator { get; init; }

    /// <summary>Primary comparison value. For "between", this is the lower bound.</summary>
    public required decimal Value { get; init; }

    /// <summary>Upper bound — only used when <see cref="Operator"/> is "between".</summary>
    public decimal? ValueMax { get; init; }
}
