namespace BegaProductFinder.Core.Models;

/// <summary>One fixture-group search request within a single multi-group search_products call.</summary>
public sealed record GroupSearchRequest(string Group, string Query);

/// <summary>
/// Result of one group's search within a multi-group request. <see cref="RelaxedFilters"/> lists
/// the SPECIFIC user-stated constraints (e.g. "maximum price", "color temperature") that had to
/// be dropped to find any match — verified by inspecting the actual returned products against the
/// original filters, not just inferred — so the agent can report exactly what was relaxed instead
/// of guessing (or silently substituting/fabricating when it can't find any match at all).
/// </summary>
public sealed record GroupSearchOutcome(
    string Group,
    List<ProductSearchResult> Products,
    List<string> RelaxedFilters,
    string? Note);
