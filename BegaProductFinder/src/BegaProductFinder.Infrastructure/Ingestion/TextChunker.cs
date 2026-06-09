using System.Text.Json;
using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Infrastructure.Ingestion;

/// <summary>
/// Produces <see cref="ProductChunk"/> records from every field in the BEGA product JSON.
/// Five chunk sources are generated per product:
/// <list type="bullet">
/// <item><description><c>json_summary</c> — one chunk containing every non-null field from the JSON, including all AI enrichment properties.</description></item>
/// <item><description><c>extrainfo</c> — sliding-window chunks from the ExtraInfo free-text field.</description></item>
/// <item><description><c>technical_spec</c> — sliding-window chunks from ProductTechnicalSpec.</description></item>
/// <item><description><c>project_context</c> — one chunk per linked project (name + location + full description).</description></item>
/// <item><description><c>specpdf</c> — sliding-window chunks from extracted spec PDF pages.</description></item>
/// </list>
/// Token count is approximated as <c>text.Length / 4</c> (1 token ≈ 4 characters).
/// </summary>
public sealed class TextChunker
{
    private readonly int _chunkSize;
    private readonly int _chunkOverlap;

    private const int CharsPerToken = 4;

    public TextChunker(int chunkSize, int chunkOverlap)
    {
        _chunkSize = chunkSize;
        _chunkOverlap = chunkOverlap;
    }

    /// <summary>
    /// Generates all chunks for a product. Every field stored in the database — including
    /// accessories, AI enrichment, and project references — is captured in the chunks.
    /// </summary>
    public List<ProductChunk> ChunkProduct(
        Product product,
        List<ProductAccessory> accessories,
        List<(int PageNumber, string Text)> pdfPages)
    {
        var chunks = new List<ProductChunk>();
        int chunkIndex = 0;

        // ── json_summary — every field from the JSON ────────────────────────
        var summary = BuildJsonSummary(product, accessories);
        foreach (var window in Slide(summary))
        {
            chunks.Add(new ProductChunk
            {
                ProductId = product.ProductId,
                CatalogNumber = product.CatalogNumber,
                ChunkSource = "json_summary",
                ChunkText = window,
                PageNumber = null,
                ChunkIndex = chunkIndex++,
                IsEmbedded = false
            });
        }

        // ── extrainfo ───────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(product.ExtraInfo))
        {
            foreach (var window in Slide(product.ExtraInfo))
            {
                chunks.Add(new ProductChunk
                {
                    ProductId = product.ProductId,
                    CatalogNumber = product.CatalogNumber,
                    ChunkSource = "extrainfo",
                    ChunkText = window,
                    PageNumber = null,
                    ChunkIndex = chunkIndex++,
                    IsEmbedded = false
                });
            }
        }

        // ── technical_spec ─────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(product.ProductTechnicalSpec))
        {
            foreach (var window in Slide(product.ProductTechnicalSpec))
            {
                chunks.Add(new ProductChunk
                {
                    ProductId = product.ProductId,
                    CatalogNumber = product.CatalogNumber,
                    ChunkSource = "technical_spec",
                    ChunkText = window,
                    PageNumber = null,
                    ChunkIndex = chunkIndex++,
                    IsEmbedded = false
                });
            }
        }

        // ── project_context — one chunk per project with full description ───
        if (product.Projects is { Count: > 0 })
        {
            foreach (var proj in product.Projects)
            {
                if (string.IsNullOrWhiteSpace(proj.Name) && string.IsNullOrWhiteSpace(proj.Description))
                    continue;

                var sb = new System.Text.StringBuilder();
                sb.Append($"BEGA Catalog: {product.CatalogNumber} | Project: {proj.Name}");
                if (!string.IsNullOrWhiteSpace(proj.Location))
                    sb.Append($" | Location: {proj.Location}");
                if (!string.IsNullOrWhiteSpace(proj.Tags))
                    sb.Append($" | Tags: {proj.Tags}");
                if (!string.IsNullOrWhiteSpace(proj.Slug))
                    sb.Append($" | URL: {proj.Slug}");
                if (!string.IsNullOrWhiteSpace(proj.ListingImage))
                    sb.Append($" | Image: {proj.ListingImage}");
                if (!string.IsNullOrWhiteSpace(proj.Description))
                    sb.Append($" | Description: {proj.Description}");

                foreach (var window in Slide(sb.ToString()))
                {
                    chunks.Add(new ProductChunk
                    {
                        ProductId = product.ProductId,
                        CatalogNumber = product.CatalogNumber,
                        ChunkSource = "project_context",
                        ChunkText = window,
                        PageNumber = null,
                        ChunkIndex = chunkIndex++,
                        IsEmbedded = false
                    });
                }
            }
        }

        // ── specpdf ─────────────────────────────────────────────────────────
        foreach (var (pageNumber, pageText) in pdfPages)
        {
            foreach (var window in Slide(pageText))
            {
                chunks.Add(new ProductChunk
                {
                    ProductId = product.ProductId,
                    CatalogNumber = product.CatalogNumber,
                    ChunkSource = "specpdf",
                    ChunkText = window,
                    PageNumber = pageNumber,
                    ChunkIndex = chunkIndex++,
                    IsEmbedded = false
                });
            }
        }

        return chunks;
    }

    // ── Sliding window ───────────────────────────────────────────────────────

    private IEnumerable<string> Slide(string text)
    {
        int stepChars = (_chunkSize - _chunkOverlap) * CharsPerToken;
        int windowChars = _chunkSize * CharsPerToken;

        if (text.Length <= windowChars)
        {
            yield return text;
            yield break;
        }

        int start = 0;
        while (start < text.Length)
        {
            int length = Math.Min(windowChars, text.Length - start);
            yield return text.Substring(start, length);
            if (start + length >= text.Length) break;
            start += stepChars;
        }
    }

    // ── json_summary — every single field from the BEGA JSON ────────────────

    private static string BuildJsonSummary(Product p, List<ProductAccessory> accessories)
    {
        static string Dim(string? whole, string? fraction)
        {
            if (string.IsNullOrWhiteSpace(whole)) return "N/A";
            return string.IsNullOrWhiteSpace(fraction) ? whole : $"{whole}-{fraction}";
        }

        static void Append(System.Text.StringBuilder sb, string label, object? value)
        {
            if (value is null) return;
            var s = value.ToString();
            if (!string.IsNullOrWhiteSpace(s))
                sb.Append($" | {label}: {s}");
        }

        var sb = new System.Text.StringBuilder();

        // ── Identifiers ──────────────────────────────────────────────────────
        sb.Append($"BEGA Catalog: {p.CatalogNumber}");
        Append(sb, "BegaId", p.BegaId);
        Append(sb, "FamilySlug", p.FamilySlug);
        Append(sb, "GroupSlug", p.GroupSlug);

        // ── Classification ───────────────────────────────────────────────────
        Append(sb, "Family", p.FamilyName);
        Append(sb, "SubFamily", p.SubFamilyName);
        Append(sb, "Category", p.CategoryName);
        Append(sb, "Group", p.GroupsName);
        Append(sb, "Type", p.LuminaireType);

        // ── Images ───────────────────────────────────────────────────────────
        Append(sb, "FamilyImage", p.FamilyListPageImage);
        Append(sb, "ImageOrientation", p.FamilyListPageImageOrientation);
        Append(sb, "TechImage", p.FamilyTechImage);

        // ── Electrical / photometric ─────────────────────────────────────────
        Append(sb, "LED", p.LedWattage);
        Append(sb, "SystemWattage", p.SystemWattageW.HasValue ? $"{p.SystemWattageW}W" : null);
        Append(sb, "Lumens", p.LumenOutputLm.HasValue ? $"{p.LumenOutputLm}lm" : null);
        Append(sb, "BeamAngle", p.BeamAngleDeg.HasValue ? $"{p.BeamAngleDeg}deg" : null);
        Append(sb, "CCTOptions", p.ColorTemperatureJson);
        Append(sb, "Voltage", p.Voltage);
        Append(sb, "Control", p.ControlProtocol);
        Append(sb, "Application", p.Application);
        Append(sb, "Distribution", p.Distribution);
        Append(sb, "DynamicLight", p.DynamicLight);
        Append(sb, "Finish", p.Finish);

        // ── Ratings & compliance ─────────────────────────────────────────────
        Append(sb, "RatingB", p.RatingB);
        Append(sb, "RatingU", p.RatingU);
        Append(sb, "RatingG", p.RatingG);
        Append(sb, "ADA", p.IsAdaCompliant ? "Yes" : null);
        Append(sb, "Express", p.IsExpressDelivery ? "Yes" : null);

        // ── Dimensions ───────────────────────────────────────────────────────
        sb.Append($" | DimA: {Dim(p.DimensionA, p.DimensionAFraction)}");
        sb.Append($" | DimB: {Dim(p.DimensionB, p.DimensionBFraction)}");
        sb.Append($" | DimC: {Dim(p.DimensionC, p.DimensionCFraction)}");
        sb.Append($" | DimD: {Dim(p.DimensionD, p.DimensionDFraction)}");
        sb.Append($" | DimE: {Dim(p.DimensionE, p.DimensionEFraction)}");

        // ── Pricing & delivery ───────────────────────────────────────────────
        if (p.DnpPrice.HasValue && p.DnpPrice > 0) Append(sb, "DNP", $"${p.DnpPrice}");
        if (p.MsrpPrice.HasValue && p.MsrpPrice > 0) Append(sb, "MSRP", $"${p.MsrpPrice}");
        Append(sb, "LeadTime", p.LeadTime);

        // ── Misc ─────────────────────────────────────────────────────────────
        Append(sb, "SocialEnvironmental", p.SocialEnviornmentalHealth);
        Append(sb, "Replacement", p.ReplacementCatalogNumber);

        // ── Document URLs ─────────────────────────────────────────────────────
        Append(sb, "SpecDocument", p.SpecDocumentUrl);
        Append(sb, "TechnicalDocument", p.TechnicalDocumentUrl);

        // ── Product options ──────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(p.ProductOptionsJson))
        {
            try
            {
                var opts = JsonSerializer.Deserialize<List<string>>(p.ProductOptionsJson);
                if (opts is { Count: > 0 })
                    Append(sb, "ProductOptions", string.Join(", ", opts));
            }
            catch { /* malformed — skip */ }
        }

        // ── Accessories ──────────────────────────────────────────────────────
        if (accessories is { Count: > 0 })
        {
            var names = accessories
                .OrderBy(a => a.SortOrder)
                .Select(a => a.AccessoryName)
                .Where(n => !string.IsNullOrWhiteSpace(n));
            Append(sb, "Accessories", string.Join(", ", names));
        }

        // ── Free text ────────────────────────────────────────────────────────
        Append(sb, "ExtraInfo", p.ExtraInfo);
        Append(sb, "FamilyInfo", p.FamilyExtraInfo);
        Append(sb, "TechnicalSpec", p.ProductTechnicalSpec);

        // ── AIEnrichment — every non-empty property dynamically ──────────────
        if (!string.IsNullOrWhiteSpace(p.AIEnrichmentJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(p.AIEnrichmentJson);
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    var val = prop.Value;

                    if (val.ValueKind == JsonValueKind.Array)
                    {
                        var items = val.EnumerateArray()
                            .Where(e => e.ValueKind == JsonValueKind.String)
                            .Select(e => e.GetString())
                            .Where(s => !string.IsNullOrWhiteSpace(s))
                            .ToList();
                        if (items.Count > 0)
                            Append(sb, prop.Name, string.Join(", ", items));
                    }
                    else if (val.ValueKind == JsonValueKind.String)
                    {
                        Append(sb, prop.Name, val.GetString());
                    }
                }
            }
            catch { /* malformed AIEnrichmentJson — skip */ }
        }

        // ── Project names (descriptions get their own project_context chunks) ─
        if (p.Projects is { Count: > 0 })
        {
            var names = p.Projects
                .Where(pr => !string.IsNullOrWhiteSpace(pr.Name))
                .Select(pr => pr.Name);
            Append(sb, "Projects", string.Join("; ", names));
        }

        return sb.ToString();
    }
}
