namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Derives a Florence-2-friendly area label (e.g. "staircase, stairs, steps") from a user's
/// free-text vision query using a deterministic keyword lookup — mirrors the BEGA group
/// keyword mapping already used for tool dispatch, so no extra model call (and therefore no
/// extra cost or latency) is needed before calling the Florence-2 + SAM2 area-marking sidecar.
/// </summary>
public static class AreaQueryExtractor
{
    private static readonly (string[] Keywords, string Labels)[] Rules =
    {
        (new[] { "stair", "stairs", "steps", "staircase", "stairway", "stair tread", "stair nosing" },
            "staircase, stairs, steps"),
        (new[] { "facade", "cladding", "exterior wall", "building wall" },
            "facade, wall"),
        (new[] { "driveway", "pathway", "path", "walkway", "courtyard", "plaza", "paving", "ground" },
            "driveway, pathway, walkway"),
        (new[] { "pillar", "piller", "pillers", "column", "columns", "post", "gate" },
            "pillar, column, gate"),
        (new[] { "garden", "garden bed", "planting bed", "tree", "trees", "plant", "plants", "shrub", "hedge", "lawn", "landscape" },
            "garden, tree, plant, shrub"),
        (new[] { "roof", "soffit", "canopy", "eave", "overhang", "pergola" },
            "roof, canopy"),
        (new[] { "entrance", "entry", "door", "doorway" },
            "entrance, door"),
        (new[] { "balcony", "railing" },
            "railing, balcony"),
        (new[] { "window" },
            "window"),
        (new[] { "planter" },
            "planter"),
        (new[] { "bench", "seating" },
            "bench"),
        (new[] { "accent", "uplight", "wall light" },
            "wall"),
    };

    /// <summary>
    /// Returns a comma-separated list of Florence-2-friendly object labels matching keywords
    /// found in <paramref name="userMessage"/>, or <c>null</c> if no known surface keyword is
    /// present (in which case the caller should skip the area-marking call entirely).
    /// </summary>
    public static string? Extract(string userMessage)
    {
        if (string.IsNullOrWhiteSpace(userMessage)) return null;

        var lower = userMessage.ToLowerInvariant();
        var matched = new List<string>();

        foreach (var (keywords, labels) in Rules)
        {
            if (Array.Exists(keywords, k => lower.Contains(k)))
                matched.Add(labels);
        }

        return matched.Count == 0 ? null : string.Join(", ", new HashSet<string>(matched));
    }
}
