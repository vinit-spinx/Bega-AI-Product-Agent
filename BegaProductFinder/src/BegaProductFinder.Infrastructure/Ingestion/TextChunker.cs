using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Infrastructure.Ingestion;

/// <summary>
/// Produces <see cref="ProductChunk"/> records from a product's structured data and its extracted PDF pages.
/// Three chunk sources are generated:
/// <list type="bullet">
/// <item><description><c>json_summary</c> — one chunk per product, built from the fixed template in CLAUDE.md.</description></item>
/// <item><description><c>extrainfo</c> — one or more chunks from the product's free-text ExtraInfo field.</description></item>
/// <item><description><c>specpdf</c> — sliding-window chunks from extracted spec document page text.</description></item>
/// </list>
/// Token count is approximated as <c>text.Length / 4</c> (1 token ≈ 4 characters).
/// </summary>
public sealed class TextChunker
{
    private readonly int _chunkSize;
    private readonly int _chunkOverlap;

    // 1 token ≈ 4 characters
    private const int CharsPerToken = 4;

    public TextChunker(int chunkSize, int chunkOverlap)
    {
        _chunkSize = chunkSize;
        _chunkOverlap = chunkOverlap;
    }

    /// <summary>
    /// Generates all chunks for a product, given its entity and optional extracted PDF pages.
    /// </summary>
    public List<ProductChunk> ChunkProduct(
        Product product,
        List<(int PageNumber, string Text)> pdfPages)
    {
        var chunks = new List<ProductChunk>();
        int chunkIndex = 0;

        // ── json_summary ────────────────────────────────────────────────────
        var summary = BuildJsonSummary(product);
        chunks.Add(new ProductChunk
        {
            ProductId = product.ProductId,
            CatalogNumber = product.CatalogNumber,
            ChunkSource = "json_summary",
            ChunkText = summary,
            PageNumber = null,
            ChunkIndex = chunkIndex++,
            IsEmbedded = false
        });

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

    /// <summary>
    /// Splits <paramref name="text"/> into overlapping windows.
    /// Window size and overlap are configured in tokens; converted to characters.
    /// </summary>
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

    // ── json_summary template ────────────────────────────────────────────────

    private static string BuildJsonSummary(Product p)
    {
        // Format raw dimension fractions as the front-end would: "3-3/4" or just "3"
        static string Dim(string? whole, string? fraction)
        {
            if (string.IsNullOrWhiteSpace(whole)) return "N/A";
            return string.IsNullOrWhiteSpace(fraction) ? whole : $"{whole}-{fraction}";
        }

        return
            $"BEGA Catalog: {p.CatalogNumber} | Family: {p.FamilyName} | SubFamily: {p.SubFamilyName} | " +
            $"Category: {p.CategoryName} | Group: {p.GroupsName} | Type: {p.LuminaireType} | " +
            $"LED: {p.LedWattage} | System Wattage: {p.SystemWattageW}W | Lumens: {p.LumenOutputLm}lm | " +
            $"Beam Angle: {p.BeamAngleDeg}deg | CCT Options: {p.ColorTemperatureJson} | " +
            $"Voltage: {p.Voltage} | Control: {p.ControlProtocol} | Application: {p.Application} | " +
            $"ADA: {p.IsAdaCompliant} | Express: {p.IsExpressDelivery} | Lead Time: {p.LeadTime} | " +
            $"Dimensions: A={Dim(p.DimensionA, p.DimensionAFraction)} " +
            $"B={Dim(p.DimensionB, p.DimensionBFraction)} " +
            $"C={Dim(p.DimensionC, p.DimensionCFraction)} | " +
            $"ExtraInfo: {p.ExtraInfo}";
    }
}
