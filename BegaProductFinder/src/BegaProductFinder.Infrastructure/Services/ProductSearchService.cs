using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Hybrid product search combining pgvector semantic similarity with SQL Server structured filtering.
/// The search flow for <see cref="SearchByNaturalLanguageAsync"/>:
/// <list type="number">
/// <item><description>Embed the query via <see cref="IEmbeddingService"/></description></item>
/// <item><description>Run ANN search via <see cref="IVectorSearchService"/> to get candidate ProductIds</description></item>
/// <item><description>Fetch full product rows from SQL Server for those IDs, applying any structured filters</description></item>
/// <item><description>Merge vector scores back in and return ranked results</description></item>
/// </list>
/// Furniture products (identified by <c>GroupSlug</c> in <c>furniture_group_slugs</c>) are excluded.
/// </summary>
public sealed class ProductSearchService : IProductSearchService
{
    private readonly IEmbeddingService _embedding;
    private readonly IVectorSearchService _vectorSearch;
    private readonly string _connectionString;
    private readonly ILogger<ProductSearchService> _logger;

    // Furniture group slugs from specsMapping.json — excluded from luminaire search
    private static readonly HashSet<string> FurnitureGroupSlugs = new(StringComparer.OrdinalIgnoreCase)
    {
        "bench", "seating", "litter-bin", "planter", "bollard-furniture",
        "modular-furniture", "urban-elements", "cycle-stand"
    };

    public ProductSearchService(
        IEmbeddingService embedding,
        IVectorSearchService vectorSearch,
        IConfiguration config,
        ILogger<ProductSearchService> logger)
    {
        _embedding = embedding;
        _vectorSearch = vectorSearch;
        _connectionString = config.GetConnectionString("SqlServer")
            ?? throw new InvalidOperationException("ConnectionStrings:SqlServer is required.");
        _logger = logger;
    }

    /// <inheritdoc/>
    public Task<List<ProductSearchResult>> SearchByNaturalLanguageAsync(
        string query,
        ProductSearchFilters? filters = null,
        CancellationToken ct = default)
        => SearchByNaturalLanguageAsync(query, [], filters, ct);

    /// <inheritdoc/>
    public async Task<List<ProductSearchResult>> SearchByNaturalLanguageAsync(
        string query,
        IReadOnlyList<string> expandedQueries,
        ProductSearchFilters? filters = null,
        CancellationToken ct = default)
    {
        filters ??= new ProductSearchFilters();
        var topK = Math.Max(filters.TopK, 6);
        var (products, _) = await SearchCoreAsync(query, expandedQueries, filters, topK, ct);
        return products;
    }

    /// <inheritdoc/>
    public async Task<List<GroupSearchOutcome>> SearchMultiGroupAsync(
        List<GroupSearchRequest> requests,
        ProductSearchFilters sharedFilters,
        int totalTopK,
        CancellationToken ct = default)
    {
        if (requests.Count == 0) return [];

        // Each group searches for up to the FULL combined budget, not just its eventual share —
        // group-scoped searches are cheap (candidateK is capped to that group's own size, see
        // SearchCoreAsync), and over-fetching here gives the allocation pass below a real pool
        // to backfill from when one group comes up short.
        var tasks = requests.Select(r =>
            SearchCoreAsync(r.Query, [], sharedFilters with { Group = r.Group }, totalTopK, ct));
        var coreResults = await Task.WhenAll(tasks);

        // Cross-group de-duplication — first group to claim a catalog number keeps it. In
        // practice groups never share catalog numbers, but this is a cheap defensive guarantee.
        var seenCatalogNumbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var pools = coreResults
            .Select(r => r.Products.Where(p => seenCatalogNumbers.Add(p.CatalogNumber)).ToList())
            .ToList();

        // Even split of the total budget across groups, then backfill: any group that came up
        // short hands its unused slots to groups with surplus pool, round-robin, until the
        // budget is exhausted or no group has anything left to give.
        var shares = ComputeEvenShares(totalTopK, requests.Count);
        var taken = new int[requests.Count];
        for (var i = 0; i < requests.Count; i++)
            taken[i] = Math.Min(shares[i], pools[i].Count);

        var shortfall = totalTopK - taken.Sum();
        while (shortfall > 0)
        {
            var gaveAny = false;
            for (var i = 0; i < requests.Count && shortfall > 0; i++)
            {
                if (taken[i] >= pools[i].Count) continue;
                taken[i]++;
                shortfall--;
                gaveAny = true;
            }
            if (!gaveAny) break; // no group has any more to give
        }

        var outcomes = new List<GroupSearchOutcome>(requests.Count);
        for (var i = 0; i < requests.Count; i++)
        {
            var groupProducts = pools[i].Take(taken[i]).ToList();
            // Re-derive relaxed filters against the FINAL allocated subset — the backfill/take
            // above can drop the very products that triggered relaxation in SearchCoreAsync, or
            // (more commonly) keep them, so this is computed fresh rather than trusted as-is.
            var relaxedFilters = DetectRelaxedFilters(sharedFilters, groupProducts);
            string? note = groupProducts.Count == 0
                ? $"No {requests[i].Group} products matched the given criteria."
                : relaxedFilters.Count > 0
                    ? $"To find {requests[i].Group} matches, these had to be relaxed: {string.Join(", ", relaxedFilters)}."
                    : null;
            outcomes.Add(new GroupSearchOutcome(requests[i].Group, groupProducts, relaxedFilters, note));
        }

        var allocatedIds = outcomes.SelectMany(o => o.Products).Select(p => p.ProductId).ToArray();
        if (allocatedIds.Length == 0) return outcomes;

        await using var conn = new SqlConnection(_connectionString);
        var projectMap = await FetchProjectsAsync(conn, allocatedIds, ct);
        return outcomes
            .Select(o => o with { Products = o.Products.Select(p => p with { Projects = ProjectsFor(projectMap, p.ProductId) }).ToList() })
            .ToList();
    }

    private static int[] ComputeEvenShares(int total, int groupCount)
    {
        var baseShare = total / groupCount;
        var remainder = total % groupCount;
        var shares = new int[groupCount];
        for (var i = 0; i < groupCount; i++)
            shares[i] = baseShare + (i < remainder ? 1 : 0);
        return shares;
    }

    /// <summary>
    /// The shared single-group search engine behind both <see cref="SearchByNaturalLanguageAsync(string,System.Collections.Generic.IReadOnlyList{string},ProductSearchFilters,System.Threading.CancellationToken)"/>
    /// and <see cref="SearchMultiGroupAsync"/>. Embeds the query, runs a group-constrained pgvector
    /// ANN search (with a candidate pool floor equal to the ENTIRE group's size, so a real match
    /// is never missed to candidate-pool truncation), fetches matching SQL rows, and — critically —
    /// relaxes filters in two tiers WITHOUT EVER dropping the Group constraint:
    /// <list type="bullet">
    /// <item><description>Tier 1: drop Category/FamilyName (inferred/cosmetic filters).</description></item>
    /// <item><description>Tier 2: ALSO drop Application, price, CCT, voltage, control protocol,
    /// distribution, dynamic light, compliance, ADA, and express-delivery (explicit user-stated
    /// preferences). The returned <c>RelaxedFilters</c> list is computed by inspecting the ACTUAL
    /// final products against the ORIGINAL filters (not just "was tier 2 needed") — so it names
    /// exactly which constraint(s) are violated, e.g. ["maximum price"], rather than a vague
    /// "something was relaxed" the caller would have to guess at.</description></item>
    /// </list>
    /// If Tier 2 still returns zero, the group genuinely has no match for this query at all and
    /// an empty list is returned — this is correct, not a bug, and must never be papered over by
    /// substituting a different group's products.
    /// </summary>
    private async Task<(List<ProductSearchResult> Products, List<string> RelaxedFilters)> SearchCoreAsync(
        string query,
        IReadOnlyList<string> expandedQueries,
        ProductSearchFilters filters,
        int topK,
        CancellationToken ct)
    {
        var exclusionCount = filters.ExcludedCatalogNumbers?.Length ?? 0;
        // Widen the vector candidate pool well beyond topK so the diversity pass below has a
        // real pool of distinct families to choose from. A narrow pool (e.g. 8x) frequently
        // returns 60-80 nearest neighbours that are ALL the same generically-named family (e.g.
        // FamilyName="Wall luminaire" covering many physically different SKUs) — the diversity
        // pass then finds only one distinct family and silently backfills the rest with more
        // of that same family, defeating the point of asking for variety.
        var candidateK = Math.Max(topK * 25, 150) + exclusionCount * topK;

        // Build full query list: primary + expanded (capped at 4 expanded to control latency)
        var allQueries = new List<string>(1 + Math.Min(expandedQueries.Count, 4)) { query };
        foreach (var eq in expandedQueries.Take(4))
            if (!string.IsNullOrWhiteSpace(eq) && eq != query)
                allQueries.Add(eq);

        // Embed all queries in parallel
        float[][] embeddings;
        try
        {
            var embeddingTasks = allQueries.Select(q => _embedding.EmbedAsync(q, ct));
            embeddings = await Task.WhenAll(embeddingTasks);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Embedding failed for query '{Query}' — falling back to SQL-only search", query);
            return (await FallbackSqlSearchAsync(query, filters, topK, ct), []);
        }

        // When a group filter is present, pre-fetch its product IDs so the vector search
        // only retrieves candidates from that group. Without this, the ANN search returns
        // the globally nearest embeddings (often dominated by a single popular group like
        // Recessed Wall), the SQL group filter then eliminates all of them, and the
        // safety fallback would silently drop the constraint.
        int[]? groupFilterIds = null;
        if (filters.Group is not null)
        {
            groupFilterIds = await GetProductIdsByGroupAsync(filters.Group, ct);
            if (groupFilterIds.Length == 0)
            {
                _logger.LogInformation("Group '{Group}' has no products — ignoring group filter", filters.Group);
                groupFilterIds = null;
            }
            else
            {
                // Never truncate a group's own candidate pool below its full size — real BEGA
                // groups are small enough (tens to a few hundred products) that an exhaustive
                // ANN scan of the WHOLE group is cheap, and it guarantees a real match can never
                // be missed just because it ranked outside an arbitrary top-N cut.
                candidateK = Math.Max(candidateK, groupFilterIds.Length);
            }
        }

        // Run vector search for every embedding in parallel, constrained to the group when set
        List<VectorSearchResult>[] allHits;
        try
        {
            var searchTasks = embeddings.Select(vec =>
                _vectorSearch.SearchAsync(vec, topK: candidateK, filterProductIds: groupFilterIds, ct: ct));
            allHits = await Task.WhenAll(searchTasks);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Vector search failed — falling back to SQL-only search");
            return (await FallbackSqlSearchAsync(query, filters, topK, ct), []);
        }

        // Merge all hits — keep the highest score per product across all query passes
        var scoreByProductId = allHits
            .SelectMany(hits => hits)
            .GroupBy(h => h.ProductId)
            .ToDictionary(g => g.Key, g => g.Max(h => h.Score));

        if (scoreByProductId.Count == 0)
        {
            _logger.LogInformation(
                "All {Count} vector searches returned no results for '{Query}' — falling back to SQL keyword search",
                allQueries.Count, query);
            return (await FallbackSqlSearchAsync(query, filters, topK, ct), []);
        }

        var candidateIds = scoreByProductId.Keys.ToArray();

        // Fetch from SQL Server with the full filter set applied
        var products = await FetchProductsFromSqlAsync(candidateIds, filters, ct);

        // Tier 1: cosmetic/inferred filters (Category, FamilyName) — relax first, no need to flag.
        if (products.Count == 0 && (filters.Category is not null || filters.FamilyName is not null))
        {
            _logger.LogInformation(
                "SQL category/family filter returned 0 for '{Query}' — retrying without those filters", query);
            products = await FetchProductsFromSqlAsync(
                candidateIds, filters with { Category = null, FamilyName = null }, ct);
        }

        // Tier 2: explicit user-stated preferences (price, CCT, voltage, control, application,
        // distribution, dynamic light, compliance, ADA, express). Group is NEVER included here —
        // candidateIds are already scoped to the group (or to the full catalog when no group was
        // requested), so relaxing these never lets a different group's products leak in.
        if (products.Count == 0)
        {
            _logger.LogInformation(
                "SQL filters still returned 0 for '{Query}' after tier 1 — relaxing price/CCT/voltage/control/application", query);
            products = await FetchProductsFromSqlAsync(
                candidateIds,
                filters with
                {
                    Category = null, FamilyName = null, Application = null,
                    MinDnpPrice = null, MaxDnpPrice = null, ColorTemperatureK = null,
                    Voltage = null, ControlProtocol = null, Distribution = null,
                    DynamicLight = null, Compliance = null, AdaCompliant = null, ExpressDelivery = null,
                },
                ct);
        }

        // If a group was requested and STILL nothing matched even fully relaxed, that group
        // genuinely has zero candidates similar enough to the query to be worth showing — return
        // empty rather than falling through to a catalog-wide keyword search that could surface
        // a completely different, unrequested group (the exact bug this refactor fixes).
        if (products.Count == 0)
        {
            if (filters.Group is not null)
            {
                _logger.LogInformation("Group '{Group}' has zero matches for '{Query}' even fully relaxed — reporting empty", filters.Group, query);
                return ([], []);
            }

            _logger.LogInformation(
                "SQL returned 0 rows for vector candidates on '{Query}' — falling back to keyword search", query);
            return (await FallbackSqlSearchAsync(query, filters, topK, ct), []);
        }

        // Exclude furniture from luminaire search results
        var luminaires = products
            .Where(p => p.GroupSlug is null || !FurnitureGroupSlugs.Contains(p.GroupSlug))
            .ToList();

        // Merge vector scores
        var scored = luminaires
            .Select(p =>
            {
                var score = scoreByProductId.TryGetValue(p.ProductId, out var s) ? s : 0;
                return p with { MatchScore = score };
            })
            .OrderByDescending(p => p.MatchScore)
            .ToList();

        // Diversity filter — two levels:
        // 1. When no explicit group filter is set: enforce one product per group first,
        //    so results are drawn from different luminaire families (Bollard, Wall, In-grade…)
        //    rather than all from the single group whose embeddings dominate the vector space.
        // 2. Within each group: one product per FAMILY SLUG (not FamilyName!) so size/wattage
        //    variants of the same visual design don't crowd out other options. FamilyName is a
        //    broad catalog text label — e.g. 195 of 335 "Wall" products all share the literal
        //    text "Wall luminaire" — while FamilySlug is the actual per-product-line identifier
        //    that distinguishes them. Deduping on FamilyName alone collapses the majority of the
        //    catalog into one indistinguishable bucket, which is why diversity silently failed
        //    before this fix even with a wide candidate pool.
        var seenGroups  = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenFamilies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenIds      = new HashSet<int>();
        var diverse      = new List<ProductSearchResult>(topK);

        bool groupDiversityEnabled = filters.Group is null;

        // Pass 1: one product per group (only when group diversity is enabled)
        if (groupDiversityEnabled)
        {
            foreach (var p in scored)
            {
                var groupKey  = p.GroupsName ?? p.GroupSlug ?? "unknown";
                var familyKey = p.FamilySlug ?? p.FamilyName ?? p.CatalogNumber;
                if (seenGroups.Add(groupKey) && seenFamilies.Add(familyKey) && seenIds.Add(p.ProductId))
                    diverse.Add(p);
                if (diverse.Count >= topK) break;
            }
        }

        // Pass 2: fill remaining slots with family-diverse products from any group. Each
        // distinct family's BEST-scoring representative is collected first; if more distinct
        // families are available than slots remaining, pick among the strongest candidates
        // with mild randomisation (rather than always the literal top-N by score) so repeat
        // searches for the same query don't show the identical 6 products every time, while
        // still anchoring to genuinely well-matching families.
        var slotsRemaining = topK - diverse.Count;
        if (slotsRemaining > 0)
        {
            var familyRepresentatives = new List<ProductSearchResult>();
            var repFamilyKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var p in scored)
            {
                if (seenIds.Contains(p.ProductId)) continue;
                var familyKey = p.FamilySlug ?? p.FamilyName ?? p.CatalogNumber;
                if (repFamilyKeys.Add(familyKey))
                    familyRepresentatives.Add(p); // scored is already ordered best-first per family
            }

            if (familyRepresentatives.Count <= slotsRemaining)
            {
                foreach (var p in familyRepresentatives)
                    if (seenFamilies.Add(p.FamilySlug ?? p.FamilyName ?? p.CatalogNumber) && seenIds.Add(p.ProductId))
                        diverse.Add(p);
            }
            else
            {
                // A generous quality-anchored pool (avoids randomly surfacing a weak match from
                // deep in the candidate list), shuffled, then take what's needed.
                var pool = familyRepresentatives.Take(Math.Min(familyRepresentatives.Count, slotsRemaining * 4)).ToArray();
                Random.Shared.Shuffle(pool);
                foreach (var p in pool.Take(slotsRemaining))
                    if (seenFamilies.Add(p.FamilySlug ?? p.FamilyName ?? p.CatalogNumber) && seenIds.Add(p.ProductId))
                        diverse.Add(p);
            }
        }

        // Pass 3: absolute backfill — any product not yet seen (handles catalogs with few families)
        foreach (var p in scored)
        {
            if (diverse.Count >= topK) break;
            if (seenIds.Add(p.ProductId))
                diverse.Add(p);
        }

        var relaxedFilters = DetectRelaxedFilters(filters, diverse);

        if (diverse.Count > 0)
        {
            await using var projectConn = new SqlConnection(_connectionString);
            var projectMap = await FetchProjectsAsync(projectConn, diverse.Select(p => p.ProductId).ToArray(), ct);
            return (diverse.Select(p => p with { Projects = ProjectsFor(projectMap, p.ProductId) }).ToList(), relaxedFilters);
        }
        return (diverse, relaxedFilters);
    }

    /// <summary>
    /// Verifies the FINAL product set against the ORIGINAL (pre-relaxation) filters and returns
    /// the human-readable name of every explicit constraint that at least one returned product
    /// violates. This is computed from the actual data, not from "which relaxation tier ran" —
    /// so it's accurate even when only some products in the set fail a given constraint, and it
    /// never reports a constraint as relaxed when the real results genuinely satisfy it.
    /// </summary>
    private static List<string> DetectRelaxedFilters(ProductSearchFilters original, List<ProductSearchResult> products)
    {
        var relaxed = new List<string>();
        if (products.Count == 0) return relaxed;

        if (original.MaxDnpPrice.HasValue && products.Any(p => p.DnpPrice is null || p.DnpPrice > original.MaxDnpPrice))
            relaxed.Add("maximum price");
        if (original.MinDnpPrice.HasValue && products.Any(p => p.DnpPrice is null || p.DnpPrice < original.MinDnpPrice))
            relaxed.Add("minimum price");
        if (original.ColorTemperatureK.HasValue && products.Any(p =>
                p.ColorTemperatureJson?.Contains($"\"kelvin\":{original.ColorTemperatureK}") != true))
            relaxed.Add("color temperature");
        if (original.Voltage is not null && products.Any(p =>
                p.Voltage?.Contains(original.Voltage, StringComparison.OrdinalIgnoreCase) != true))
            relaxed.Add("voltage");
        if (original.ControlProtocol is not null && products.Any(p =>
                p.ControlProtocol?.Contains(original.ControlProtocol, StringComparison.OrdinalIgnoreCase) != true))
            relaxed.Add("control protocol");
        if (original.Application is not null && products.Any(p =>
                p.Application?.Contains(original.Application, StringComparison.OrdinalIgnoreCase) != true))
            relaxed.Add("application");
        if (original.Distribution is not null && products.Any(p =>
                p.Distribution?.Contains(original.Distribution, StringComparison.OrdinalIgnoreCase) != true))
            relaxed.Add("light distribution");
        if (original.AdaCompliant == true && products.Any(p => !p.IsAdaCompliant))
            relaxed.Add("ADA compliance");
        if (original.ExpressDelivery == true && products.Any(p => !p.IsExpressDelivery))
            relaxed.Add("express delivery");

        return relaxed;
    }

    /// <inheritdoc/>
    public async Task<List<ProductSearchResult>> FilterBySpecsAsync(
        List<SpecFilter> filters,
        CancellationToken ct = default)
    {
        if (filters.Count == 0) return [];

        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        // Exclude furniture
        conditions.Add(BuildFurnitureExclusionClause());

        foreach (var (filter, idx) in filters.Select((f, i) => (f, i)))
        {
            var col = MapSpecKeyToColumn(filter.SpecKey);
            if (col is null)
            {
                _logger.LogWarning("Unknown spec_key '{SpecKey}' — skipping filter", filter.SpecKey);
                continue;
            }

            var paramName = $"@v{idx}";
            var paramMax = $"@vmax{idx}";

            switch (filter.Operator.ToLowerInvariant())
            {
                case "gte":
                    conditions.Add($"{col} >= {paramName}");
                    parameters.Add(paramName, filter.Value);
                    break;
                case "lte":
                    conditions.Add($"{col} <= {paramName}");
                    parameters.Add(paramName, filter.Value);
                    break;
                case "eq":
                    conditions.Add($"{col} = {paramName}");
                    parameters.Add(paramName, filter.Value);
                    break;
                case "between" when filter.ValueMax.HasValue:
                    conditions.Add($"{col} BETWEEN {paramName} AND {paramMax}");
                    parameters.Add(paramName, filter.Value);
                    parameters.Add(paramMax, filter.ValueMax.Value);
                    break;
            }
        }

        if (conditions.Count == 1) return []; // Only the furniture exclusion, no real filters

        var sql = $"""
            SELECT
                ProductId, CatalogNumber, FamilyName, FamilySlug, SubFamilyName,
                CategoryName, GroupSlug, GroupsName, LuminaireType,
                FamilyListPageImage, FamilyTechImage,
                LedWattage, WattageW, SystemWattageW, LumenOutputLm, BeamAngleDeg,
                ColorTemperatureJson, Voltage, ControlProtocol, Application, Distribution,
                IsAdaCompliant, IsExpressDelivery, LeadTime,
                DimensionA, DimensionAFraction, DimensionB, DimensionBFraction,
                DimensionC, DimensionCFraction,
                DnpPrice, MsrpPrice,
                SpecDocumentUrl, TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products
            WHERE {string.Join(" AND ", conditions)}
            ORDER BY LumenOutputLm DESC, WattageW ASC
            """;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            var results = (await conn.QueryAsync<ProductSearchResult>(
                new CommandDefinition(sql, parameters, cancellationToken: ct))).ToList();
            if (results.Count > 0)
            {
                var projectMap = await FetchProjectsAsync(conn, results.Select(r => r.ProductId).ToArray(), ct);
                return results.Select(r => r with { Projects = ProjectsFor(projectMap, r.ProductId) }).ToList();
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FilterBySpecsAsync failed");
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<ProductDetail?> GetProductDetailAsync(
        string catalogNumber,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT
                p.ProductId, p.CatalogNumber, p.FamilyName, p.FamilySlug, p.SubFamilyName,
                p.CategoryName, p.GroupSlug, p.GroupsName, p.LuminaireType,
                p.FamilyListPageImage, p.FamilyTechImage,
                p.LedWattage, p.WattageW, p.SystemWattageW, p.LumenOutputLm, p.BeamAngleDeg,
                p.ColorTemperatureJson, p.Voltage, p.ControlProtocol, p.Application, p.Distribution,
                p.DynamicLight, p.Finish,
                p.IsAdaCompliant, p.IsExpressDelivery, p.LeadTime,
                p.DimensionA, p.DimensionAFraction, p.DimensionB, p.DimensionBFraction,
                p.DimensionC, p.DimensionCFraction, p.DimensionD, p.DimensionDFraction,
                p.DimensionE, p.DimensionEFraction,
                p.RatingB, p.RatingU, p.RatingG,
                p.DnpPrice, p.MsrpPrice,
                p.SocialEnviornmentalHealth, p.ReplacementCatalogNumber,
                p.ExtraInfo, p.ProductOptionsJson,
                p.ProductTechnicalSpec, p.FamilyExtraInfo, p.AIEnrichmentJson,
                p.SpecDocumentUrl, p.TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products p
            WHERE p.CatalogNumber = @CatalogNumber
            """;

        const string accessoriesSql = """
            SELECT AccessoryName
            FROM ProductAccessories
            WHERE ProductId = @ProductId
            ORDER BY SortOrder
            """;

        try
        {
            await using var conn = new SqlConnection(_connectionString);
            var detail = await conn.QueryFirstOrDefaultAsync<ProductDetail>(
                new CommandDefinition(sql, new { CatalogNumber = catalogNumber }, cancellationToken: ct));

            if (detail is null) return null;

            var accessories = await conn.QueryAsync<string>(
                new CommandDefinition(accessoriesSql, new { detail.ProductId }, cancellationToken: ct));

            var projectRows = await conn.QueryAsync<ProjectRow>(
                new CommandDefinition(
                    "SELECT ProductId, Name, Location, ListingImage, Slug FROM ProductProjects WHERE ProductId = @ProductId ORDER BY SortOrder",
                    new { detail.ProductId },
                    cancellationToken: ct));

            return detail with
            {
                Accessories = accessories.ToList(),
                Projects = projectRows.Select(r => new ProductProjectDto(r.Name, r.Location, r.ListingImage, r.Slug)).ToList(),
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetProductDetailAsync failed for catalog number '{CatalogNumber}'", catalogNumber);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<List<ProductSearchResult>> GetAlternativesAsync(
        string catalogNumber,
        int topK = 3,
        IReadOnlyList<string>? excludeCatalogNumbers = null,
        CancellationToken ct = default)
    {
        const string sourceSql = """
            SELECT ProductId, FamilySlug, SubFamilyName, GroupsName, CategoryName, LumenOutputLm
            FROM Products
            WHERE CatalogNumber = @CatalogNumber
            """;

        await using var conn = new SqlConnection(_connectionString);
        var source = await conn.QueryFirstOrDefaultAsync<SourceRow>(
            new CommandDefinition(sourceSql, new { CatalogNumber = catalogNumber }, cancellationToken: ct));
        if (source is null) return [];

        // Catalog numbers already on screen (the source plus anything the caller has already
        // shown earlier in the conversation) so repeated "View Alternatives" clicks surface new
        // products instead of recycling ones the user has already seen.
        var excluded = (excludeCatalogNumbers ?? [])
            .Append(catalogNumber)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        const string selectColumns = """
            ProductId, CatalogNumber, FamilyName, FamilySlug, SubFamilyName,
            CategoryName, GroupSlug, GroupsName, LuminaireType,
            FamilyListPageImage, FamilyTechImage,
            LedWattage, WattageW, SystemWattageW, LumenOutputLm, BeamAngleDeg,
            ColorTemperatureJson, Voltage, ControlProtocol, Application, Distribution,
            IsAdaCompliant, IsExpressDelivery, LeadTime,
            DimensionA, DimensionAFraction, DimensionB, DimensionBFraction,
            DimensionC, DimensionCFraction,
            DnpPrice, MsrpPrice,
            SpecDocumentUrl, TechnicalDocumentUrl,
            0.0 AS MatchScore
            """;

        var alternatives = new List<ProductSearchResult>(topK);
        var seenIds = new HashSet<int> { source.ProductId };

        // Tier 1: same family — prefer matching sub-family, then closest lumen output.
        if (!string.IsNullOrWhiteSpace(source.FamilySlug))
        {
            var familySql = $"""
                SELECT TOP (@TopK) {selectColumns}
                FROM Products
                WHERE FamilySlug = @FamilySlug
                  AND ProductId <> @SourceId
                  AND CatalogNumber NOT IN @Excluded
                  AND {BuildFurnitureExclusionClause()}
                ORDER BY
                    CASE WHEN SubFamilyName = @SubFamilyName THEN 0 ELSE 1 END,
                    ABS(ISNULL(LumenOutputLm, 0) - @SourceLumens)
                """;

            var familyResults = await conn.QueryAsync<ProductSearchResult>(
                new CommandDefinition(familySql, new
                {
                    TopK = topK,
                    source.FamilySlug,
                    SourceId = source.ProductId,
                    Excluded = excluded,
                    source.SubFamilyName,
                    SourceLumens = source.LumenOutputLm ?? 0
                }, cancellationToken: ct));

            foreach (var p in familyResults)
            {
                if (alternatives.Count >= topK) break;
                if (seenIds.Add(p.ProductId)) alternatives.Add(p);
            }
        }

        // Tier 2: same group + category — top up if the family alone didn't yield enough.
        if (alternatives.Count < topK && !string.IsNullOrWhiteSpace(source.GroupsName))
        {
            var groupSql = $"""
                SELECT TOP (@TopK) {selectColumns}
                FROM Products
                WHERE GroupsName = @GroupsName
                  AND CategoryName = @CategoryName
                  AND ProductId <> @SourceId
                  AND CatalogNumber NOT IN @Excluded
                  AND {BuildFurnitureExclusionClause()}
                ORDER BY ABS(ISNULL(LumenOutputLm, 0) - @SourceLumens)
                """;

            var groupResults = await conn.QueryAsync<ProductSearchResult>(
                new CommandDefinition(groupSql, new
                {
                    // Over-fetch since rows already picked in tier 1 get filtered out by seenIds below.
                    TopK = topK + alternatives.Count,
                    source.GroupsName,
                    source.CategoryName,
                    SourceId = source.ProductId,
                    Excluded = excluded,
                    SourceLumens = source.LumenOutputLm ?? 0
                }, cancellationToken: ct));

            foreach (var p in groupResults)
            {
                if (alternatives.Count >= topK) break;
                if (seenIds.Add(p.ProductId)) alternatives.Add(p);
            }
        }

        if (alternatives.Count == 0) return alternatives;

        var projectMap = await FetchProjectsAsync(conn, alternatives.Select(p => p.ProductId).ToArray(), ct);
        return alternatives.Select(p => p with { Projects = ProjectsFor(projectMap, p.ProductId) }).ToList();
    }

    private record SourceRow(int ProductId, string? FamilySlug, string? SubFamilyName, string? GroupsName, string? CategoryName, decimal? LumenOutputLm);

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<List<ProductSearchResult>> FetchProductsFromSqlAsync(
        int[] productIds,
        ProductSearchFilters filters,
        CancellationToken ct)
    {
        var conditions = new List<string> { "p.ProductId IN @Ids" };
        var parameters = new DynamicParameters();
        parameters.Add("Ids", productIds);

        if (filters.Category is not null)
        {
            conditions.Add("p.CategoryName = @Category");
            parameters.Add("Category", filters.Category);
        }
        if (filters.Group is not null)
        {
            conditions.Add("p.GroupsName = @Group");
            parameters.Add("Group", filters.Group);
        }
        if (filters.FamilyName is not null)
        {
            conditions.Add("p.FamilyName = @FamilyName");
            parameters.Add("FamilyName", filters.FamilyName);
        }
        if (filters.MinWattageW.HasValue)
        {
            conditions.Add("p.WattageW >= @MinWattageW");
            parameters.Add("MinWattageW", filters.MinWattageW.Value);
        }
        if (filters.MaxWattageW.HasValue)
        {
            conditions.Add("p.WattageW <= @MaxWattageW");
            parameters.Add("MaxWattageW", filters.MaxWattageW.Value);
        }
        if (filters.MinLumenOutput.HasValue)
        {
            conditions.Add("p.LumenOutputLm >= @MinLumenOutput");
            parameters.Add("MinLumenOutput", filters.MinLumenOutput.Value);
        }
        if (filters.MaxLumenOutput.HasValue)
        {
            conditions.Add("p.LumenOutputLm <= @MaxLumenOutput");
            parameters.Add("MaxLumenOutput", filters.MaxLumenOutput.Value);
        }
        if (filters.MinBeamAngleDeg.HasValue)
        {
            conditions.Add("p.BeamAngleDeg >= @MinBeamAngleDeg");
            parameters.Add("MinBeamAngleDeg", filters.MinBeamAngleDeg.Value);
        }
        if (filters.MaxBeamAngleDeg.HasValue)
        {
            conditions.Add("p.BeamAngleDeg <= @MaxBeamAngleDeg");
            parameters.Add("MaxBeamAngleDeg", filters.MaxBeamAngleDeg.Value);
        }
        if (filters.ColorTemperatureK.HasValue)
        {
            conditions.Add("p.ColorTemperatureJson LIKE @CctPattern");
            parameters.Add("CctPattern", $"%\"kelvin\":{filters.ColorTemperatureK.Value}%");
        }
        if (filters.Voltage is not null)
        {
            conditions.Add("p.Voltage LIKE @Voltage");
            parameters.Add("Voltage", $"%{filters.Voltage}%");
        }
        if (filters.ControlProtocol is not null)
        {
            // LIKE so "DALI" matches "DALI-2"; "0-10V" matches exactly; etc.
            conditions.Add("p.ControlProtocol LIKE @ControlProtocol");
            parameters.Add("ControlProtocol", $"%{filters.ControlProtocol}%");
        }
        if (filters.Application is not null)
        {
            // DB values: Accent · Emergency · Facade · Pathway · Roadway · Site & Area · Unshielded
            conditions.Add("p.Application LIKE @Application");
            parameters.Add("Application", $"%{filters.Application}%");
        }
        if (filters.Distribution is not null)
        {
            // DB values: Type I · Type II · Type III · Type IV · Type V
            conditions.Add("p.Distribution LIKE @Distribution");
            parameters.Add("Distribution", $"%{filters.Distribution}%");
        }
        if (filters.DynamicLight is not null)
        {
            // DB values: RGBW · Tunable White
            conditions.Add("p.DynamicLight LIKE @DynamicLight");
            parameters.Add("DynamicLight", $"%{filters.DynamicLight}%");
        }
        if (filters.Compliance is not null)
        {
            // Maps to SocialEnviornmentalHealth column
            // DB values: International Dark Sky · Wildlife Friendly · EPD Available · FSC certified wood
            conditions.Add("p.SocialEnviornmentalHealth LIKE @Compliance");
            parameters.Add("Compliance", $"%{filters.Compliance}%");
        }
        if (filters.AdaCompliant == true)
            conditions.Add("p.IsAdaCompliant = 1");
        if (filters.ExpressDelivery == true)
            conditions.Add("p.IsExpressDelivery = 1");
        if (filters.MinDnpPrice.HasValue)
        {
            conditions.Add("p.DnpPrice IS NOT NULL AND p.DnpPrice >= @MinDnpPrice");
            parameters.Add("MinDnpPrice", filters.MinDnpPrice.Value);
        }
        if (filters.MaxDnpPrice.HasValue)
        {
            // Null-priced products are excluded — their actual price is unknown
            conditions.Add("p.DnpPrice IS NOT NULL AND p.DnpPrice <= @MaxDnpPrice");
            parameters.Add("MaxDnpPrice", filters.MaxDnpPrice.Value);
        }
        if (filters.ExcludedCatalogNumbers is { Length: > 0 })
        {
            conditions.Add("p.CatalogNumber NOT IN @ExcludedCatalogNumbers");
            parameters.Add("ExcludedCatalogNumbers", filters.ExcludedCatalogNumbers);
        }

        var sql = $"""
            SELECT
                p.ProductId, p.CatalogNumber, p.FamilyName, p.FamilySlug, p.SubFamilyName,
                p.CategoryName, p.GroupSlug, p.GroupsName, p.LuminaireType,
                p.FamilyListPageImage, p.FamilyTechImage,
                p.LedWattage, p.WattageW, p.SystemWattageW, p.LumenOutputLm, p.BeamAngleDeg,
                p.ColorTemperatureJson, p.Voltage, p.ControlProtocol, p.Application, p.Distribution,
                p.IsAdaCompliant, p.IsExpressDelivery, p.LeadTime,
                p.DimensionA, p.DimensionAFraction, p.DimensionB, p.DimensionBFraction,
                p.DimensionC, p.DimensionCFraction,
                p.DnpPrice, p.MsrpPrice,
                p.SpecDocumentUrl, p.TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products p
            WHERE {string.Join(" AND ", conditions)}
            """;

        await using var conn = new SqlConnection(_connectionString);
        var results = await conn.QueryAsync<ProductSearchResult>(
            new CommandDefinition(sql, parameters, cancellationToken: ct));
        return results.ToList();
    }

    private async Task<int[]> GetProductIdsByGroupAsync(string groupName, CancellationToken ct)
    {
        await using var conn = new SqlConnection(_connectionString);
        var ids = await conn.QueryAsync<int>(
            new CommandDefinition(
                "SELECT ProductId FROM Products WHERE GroupsName = @GroupName",
                new { GroupName = groupName },
                cancellationToken: ct));
        return ids.ToArray();
    }

    private async Task<List<ProductSearchResult>> FallbackSqlSearchAsync(
        string query,
        ProductSearchFilters filters,
        int topK,
        CancellationToken ct)
    {
        await using var conn = new SqlConnection(_connectionString);

        // Structured filter conditions carried from the original request.
        // These MUST be preserved in the fallback — dropping them causes wrong products
        // (e.g. returning non-DALI products when DALI was explicitly requested). Group and
        // FamilyName are included here too — this method is normally only reached for ungrouped
        // queries or genuine embedding/vector infra failures (SearchCoreAsync now reports
        // empty rather than reaching here for an ordinary group+filter zero-match), but if a
        // group filter ever DOES arrive here, it must never be silently dropped in favour of a
        // catalog-wide keyword match.
        var structuredConditions = new List<string>();
        var structuredParams = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(filters.Group))
        {
            structuredConditions.Add("GroupsName = @Group");
            structuredParams.Add("Group", filters.Group);
        }
        if (!string.IsNullOrWhiteSpace(filters.FamilyName))
        {
            structuredConditions.Add("FamilyName = @FamilyName");
            structuredParams.Add("FamilyName", filters.FamilyName);
        }
        if (!string.IsNullOrWhiteSpace(filters.Category))
        {
            structuredConditions.Add("CategoryName = @Category");
            structuredParams.Add("Category", filters.Category);
        }
        if (!string.IsNullOrWhiteSpace(filters.ControlProtocol))
        {
            structuredConditions.Add("ControlProtocol LIKE @ControlProtocol");
            structuredParams.Add("ControlProtocol", $"%{filters.ControlProtocol}%");
        }
        if (!string.IsNullOrWhiteSpace(filters.Voltage))
        {
            structuredConditions.Add("Voltage LIKE @Voltage");
            structuredParams.Add("Voltage", $"%{filters.Voltage}%");
        }
        if (!string.IsNullOrWhiteSpace(filters.Application))
        {
            structuredConditions.Add("Application LIKE @Application");
            structuredParams.Add("Application", $"%{filters.Application}%");
        }
        if (!string.IsNullOrWhiteSpace(filters.Distribution))
        {
            structuredConditions.Add("Distribution LIKE @Distribution");
            structuredParams.Add("Distribution", $"%{filters.Distribution}%");
        }
        if (!string.IsNullOrWhiteSpace(filters.DynamicLight))
        {
            structuredConditions.Add("DynamicLight LIKE @DynamicLight");
            structuredParams.Add("DynamicLight", $"%{filters.DynamicLight}%");
        }
        if (!string.IsNullOrWhiteSpace(filters.Compliance))
        {
            structuredConditions.Add("SocialEnviornmentalHealth LIKE @Compliance");
            structuredParams.Add("Compliance", $"%{filters.Compliance}%");
        }
        if (filters.ColorTemperatureK.HasValue)
        {
            structuredConditions.Add("ColorTemperatureJson LIKE @CctPattern");
            structuredParams.Add("CctPattern", $"%\"kelvin\":{filters.ColorTemperatureK.Value}%");
        }
        if (filters.MinLumenOutput.HasValue)
        {
            structuredConditions.Add("LumenOutputLm >= @MinLumenOutput");
            structuredParams.Add("MinLumenOutput", filters.MinLumenOutput.Value);
        }
        if (filters.MaxLumenOutput.HasValue)
        {
            structuredConditions.Add("LumenOutputLm <= @MaxLumenOutput");
            structuredParams.Add("MaxLumenOutput", filters.MaxLumenOutput.Value);
        }
        if (filters.MinWattageW.HasValue)
        {
            structuredConditions.Add("WattageW >= @MinWattageW");
            structuredParams.Add("MinWattageW", filters.MinWattageW.Value);
        }
        if (filters.MaxWattageW.HasValue)
        {
            structuredConditions.Add("WattageW <= @MaxWattageW");
            structuredParams.Add("MaxWattageW", filters.MaxWattageW.Value);
        }
        if (filters.MinBeamAngleDeg.HasValue)
        {
            structuredConditions.Add("BeamAngleDeg >= @MinBeamAngleDeg");
            structuredParams.Add("MinBeamAngleDeg", filters.MinBeamAngleDeg.Value);
        }
        if (filters.MaxBeamAngleDeg.HasValue)
        {
            structuredConditions.Add("BeamAngleDeg <= @MaxBeamAngleDeg");
            structuredParams.Add("MaxBeamAngleDeg", filters.MaxBeamAngleDeg.Value);
        }
        if (filters.AdaCompliant == true)
            structuredConditions.Add("IsAdaCompliant = 1");
        if (filters.ExpressDelivery == true)
            structuredConditions.Add("IsExpressDelivery = 1");
        if (filters.MinDnpPrice.HasValue)
        {
            structuredConditions.Add("DnpPrice IS NOT NULL AND DnpPrice >= @MinDnpPrice");
            structuredParams.Add("MinDnpPrice", filters.MinDnpPrice.Value);
        }
        if (filters.MaxDnpPrice.HasValue)
        {
            structuredConditions.Add("DnpPrice IS NOT NULL AND DnpPrice <= @MaxDnpPrice");
            structuredParams.Add("MaxDnpPrice", filters.MaxDnpPrice.Value);
        }
        if (filters.ExcludedCatalogNumbers is { Length: > 0 })
        {
            structuredConditions.Add("CatalogNumber NOT IN @ExcludedCatalogNumbers");
            structuredParams.Add("ExcludedCatalogNumbers", filters.ExcludedCatalogNumbers);
        }

        var structuredClause = structuredConditions.Count > 0
            ? "AND " + string.Join(" AND ", structuredConditions)
            : string.Empty;

        // Word-level keyword match across descriptive columns
        var words = query
            .Split([' ', '-', ',', '.', '/', '\\'], StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length >= 3)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .ToList();

        if (words.Count > 0)
        {
            var wordConditions = words
                .Select((_, i) => $"(FamilyName LIKE @w{i} OR SubFamilyName LIKE @w{i} OR GroupsName LIKE @w{i} OR LuminaireType LIKE @w{i} OR Application LIKE @w{i} OR ExtraInfo LIKE @w{i} OR ProductTechnicalSpec LIKE @w{i} OR FamilyExtraInfo LIKE @w{i} OR AIEnrichmentJson LIKE @w{i})")
                .ToList();

            var wordSql = $"""
                SELECT TOP (@TopK)
                    ProductId, CatalogNumber, FamilyName, FamilySlug, SubFamilyName,
                    CategoryName, GroupSlug, GroupsName, LuminaireType,
                    FamilyListPageImage, FamilyTechImage,
                    LedWattage, WattageW, SystemWattageW, LumenOutputLm, BeamAngleDeg,
                    ColorTemperatureJson, Voltage, ControlProtocol, Application, Distribution,
                    IsAdaCompliant, IsExpressDelivery, LeadTime,
                    DimensionA, DimensionAFraction, DimensionB, DimensionBFraction,
                    DimensionC, DimensionCFraction,
                    DnpPrice, MsrpPrice,
                    SpecDocumentUrl, TechnicalDocumentUrl,
                    0.0 AS MatchScore
                FROM Products
                WHERE ({string.Join(" OR ", wordConditions)})
                  AND (GroupSlug NOT IN @FurnitureSlugs OR GroupSlug IS NULL)
                  {structuredClause}
                ORDER BY CatalogNumber
                """;

            structuredParams.Add("TopK", topK);
            structuredParams.Add("FurnitureSlugs", FurnitureGroupSlugs.ToArray());
            for (int i = 0; i < words.Count; i++)
                structuredParams.Add($"w{i}", $"%{words[i]}%");

            var wordResults = (await conn.QueryAsync<ProductSearchResult>(
                new CommandDefinition(wordSql, structuredParams, cancellationToken: ct))).ToList();

            if (wordResults.Count > 0)
            {
                var pm = await FetchProjectsAsync(conn, wordResults.Select(r => r.ProductId).ToArray(), ct);
                return wordResults.Select(r => r with { Projects = ProjectsFor(pm, r.ProductId) }).ToList();
            }
        }

        // If structured filters are active (e.g. ControlProtocol=DALI) and nothing matched,
        // return empty rather than dropping the filter and showing wrong products.
        // Claude will then correctly report that no matching products were found.
        if (structuredConditions.Count > 0)
        {
            _logger.LogInformation(
                "Fallback found no products matching structured filters for '{Query}' — returning empty so Claude reports no results",
                query);
            return [];
        }

        // No structured filters active — safe to do a broad keyword-only search
        var broadParams = new DynamicParameters();
        broadParams.Add("TopK", topK);
        broadParams.Add("FurnitureSlugs", FurnitureGroupSlugs.ToArray());

        var words2 = words.Count > 0 ? words : [query];
        var broadConditions = words2
            .Select((_, i) => $"(FamilyName LIKE @b{i} OR GroupsName LIKE @b{i} OR LuminaireType LIKE @b{i} OR ProductTechnicalSpec LIKE @b{i} OR FamilyExtraInfo LIKE @b{i} OR AIEnrichmentJson LIKE @b{i})")
            .ToList();
        for (int i = 0; i < words2.Count; i++)
            broadParams.Add($"b{i}", $"%{words2[i]}%");

        var broadExclusionClause = string.Empty;
        if (filters.ExcludedCatalogNumbers is { Length: > 0 })
        {
            broadExclusionClause = "AND CatalogNumber NOT IN @ExcludedCatalogNumbers";
            broadParams.Add("ExcludedCatalogNumbers", filters.ExcludedCatalogNumbers);
        }

        var broadSql = $"""
            SELECT TOP (@TopK)
                ProductId, CatalogNumber, FamilyName, FamilySlug, SubFamilyName,
                CategoryName, GroupSlug, GroupsName, LuminaireType,
                FamilyListPageImage, FamilyTechImage,
                LedWattage, WattageW, SystemWattageW, LumenOutputLm, BeamAngleDeg,
                ColorTemperatureJson, Voltage, ControlProtocol, Application, Distribution,
                IsAdaCompliant, IsExpressDelivery, LeadTime,
                DimensionA, DimensionAFraction, DimensionB, DimensionBFraction,
                DimensionC, DimensionCFraction,
                DnpPrice, MsrpPrice,
                SpecDocumentUrl, TechnicalDocumentUrl,
                0.0 AS MatchScore
            FROM Products
            WHERE ({string.Join(" OR ", broadConditions)})
              AND (GroupSlug NOT IN @FurnitureSlugs OR GroupSlug IS NULL)
              {broadExclusionClause}
            ORDER BY CatalogNumber
            """;

        var broadResults = (await conn.QueryAsync<ProductSearchResult>(
            new CommandDefinition(broadSql, broadParams, cancellationToken: ct))).ToList();
        if (broadResults.Count > 0)
        {
            var pm = await FetchProjectsAsync(conn, broadResults.Select(r => r.ProductId).ToArray(), ct);
            return broadResults.Select(r => r with { Projects = ProjectsFor(pm, r.ProductId) }).ToList();
        }
        return broadResults;
    }

    // Used to map Dapper result rows to ProductProjectDto — record avoids anonymous-type limitations
    private record ProjectRow(int ProductId, string? Name, string? Location, string? ListingImage, string? Slug);

    /// <summary>
    /// Batch-fetches up to <paramref name="maxPerProduct"/> projects per product ID in a single query.
    /// Uses ROW_NUMBER() so the database does the per-product limiting rather than client-side filtering.
    /// </summary>
    private static async Task<Dictionary<int, List<ProductProjectDto>>> FetchProjectsAsync(
        SqlConnection conn, int[] productIds, CancellationToken ct, int maxPerProduct = 5)
    {
        if (productIds.Length == 0) return [];
        const string sql = """
            SELECT ProductId, Name, Location, ListingImage, Slug
            FROM (
                SELECT ProductId, Name, Location, ListingImage, Slug,
                       ROW_NUMBER() OVER (PARTITION BY ProductId ORDER BY SortOrder) AS rn
                FROM ProductProjects
                WHERE ProductId IN @Ids
            ) t
            WHERE rn <= @Max
            """;
        var rows = await conn.QueryAsync<ProjectRow>(
            new CommandDefinition(sql, new { Ids = productIds, Max = maxPerProduct }, cancellationToken: ct));
        return rows
            .GroupBy(r => r.ProductId)
            .ToDictionary(g => g.Key, g => g.Select(r => new ProductProjectDto(r.Name, r.Location, r.ListingImage, r.Slug)).ToList());
    }

    private static IReadOnlyList<ProductProjectDto> ProjectsFor(Dictionary<int, List<ProductProjectDto>> map, int id)
        => map.TryGetValue(id, out var list) ? list : [];

    private static string? MapSpecKeyToColumn(string specKey) => specKey switch
    {
        "WattageW" => "WattageW",
        "SystemWattageW" => "SystemWattageW",
        "LumenOutputLm" => "LumenOutputLm",
        "BeamAngleDeg" => "BeamAngleDeg",
        "DnpPrice" => "DnpPrice",
        "MsrpPrice" => "MsrpPrice",
        _ => null
    };

    private static string BuildFurnitureExclusionClause()
    {
        var slugList = string.Join(",", FurnitureGroupSlugs.Select(s => $"'{s}'"));
        return $"(GroupSlug IS NULL OR GroupSlug NOT IN ({slugList}))";
    }
}
