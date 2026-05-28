using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace BegaProductFinder.Infrastructure.Ingestion;

/// <summary>
/// Downloads BEGA spec sheet PDFs and extracts page text using PdfPig.
/// Applies an exponential-backoff retry policy for transient HTTP failures.
/// <para>
/// Only the <c>SpecDocument</c> URL (a PDF) is processed.
/// The <c>TechnicalDocument</c> URL is a ZIP file and is intentionally skipped.
/// </para>
/// </summary>
public sealed class PdfTextExtractor
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IngestionOptions _options;
    private readonly ILogger<PdfTextExtractor> _logger;
    private readonly ResiliencePipeline<HttpResponseMessage> _retryPipeline;

    private const int MinPageTextLength = 50;

    public PdfTextExtractor(
        IHttpClientFactory httpClientFactory,
        IngestionOptions options,
        ILogger<PdfTextExtractor> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options;
        _logger = logger;
        _retryPipeline = BuildRetryPipeline();
    }

    /// <summary>
    /// Downloads the PDF at <paramref name="specDocumentUrl"/> (if not already cached),
    /// then extracts the text of each page with sufficient content.
    /// Returns an empty list if the URL is empty, the download fails, or no usable pages are found.
    /// </summary>
    public async Task<List<(int PageNumber, string Text)>> ExtractAsync(
        string catalogNumber,
        string specDocumentUrl,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(specDocumentUrl))
            return [];

        var localPath = GetCachedPath(catalogNumber);

        byte[]? pdfBytes = null;

        if (File.Exists(localPath))
        {
            _logger.LogDebug("Using cached PDF for {CatalogNumber} from {Path}", catalogNumber, localPath);
            pdfBytes = await File.ReadAllBytesAsync(localPath, ct);
        }
        else if (_options.PdfDownloadEnabled)
        {
            pdfBytes = await DownloadAsync(catalogNumber, specDocumentUrl, localPath, ct);
        }

        if (pdfBytes is null or { Length: 0 })
            return [];

        return ExtractPagesFromBytes(catalogNumber, pdfBytes);
    }

    // ── Download ─────────────────────────────────────────────────────────────

    private async Task<byte[]?> DownloadAsync(
        string catalogNumber,
        string url,
        string localPath,
        CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient("PdfDownload");
            client.Timeout = TimeSpan.FromSeconds(_options.PdfDownloadTimeoutSeconds);

            var outcome = await _retryPipeline.ExecuteAsync(
                async innerCt =>
                {
                    var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, innerCt);
                    response.EnsureSuccessStatusCode();
                    return response;
                },
                ct);

            var bytes = await outcome.Content.ReadAsByteArrayAsync(ct);
            outcome.Dispose();

            Directory.CreateDirectory(Path.GetDirectoryName(localPath)!);
            await File.WriteAllBytesAsync(localPath, bytes, ct);
            _logger.LogDebug("Downloaded PDF for {CatalogNumber} ({Bytes} bytes)", catalogNumber, bytes.Length);
            return bytes;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to download spec PDF for catalog {CatalogNumber} from {Url}", catalogNumber, url);
            return null;
        }
    }

    // ── Extraction ───────────────────────────────────────────────────────────

    private List<(int PageNumber, string Text)> ExtractPagesFromBytes(string catalogNumber, byte[] bytes)
    {
        var pages = new List<(int, string)>();

        try
        {
            using var doc = PdfDocument.Open(bytes);

            foreach (var page in doc.GetPages())
            {
                var text = ContentOrderTextExtractor.GetText(page);
                if (string.IsNullOrWhiteSpace(text) || text.Length < MinPageTextLength)
                    continue;

                pages.Add((page.Number, text.Trim()));
            }

            _logger.LogDebug("Extracted {PageCount} usable pages from PDF for {CatalogNumber}",
                pages.Count, catalogNumber);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PDF extraction failed for catalog {CatalogNumber}", catalogNumber);
        }

        return pages;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private string GetCachedPath(string catalogNumber)
        => Path.Combine(_options.PdfDownloadPath, $"{catalogNumber}_BEGA_Spec.pdf");

    private ResiliencePipeline<HttpResponseMessage> BuildRetryPipeline()
    {
        return new ResiliencePipelineBuilder<HttpResponseMessage>()
            .AddRetry(new RetryStrategyOptions<HttpResponseMessage>
            {
                MaxRetryAttempts = _options.PdfDownloadMaxRetries,
                BackoffType = DelayBackoffType.Exponential,
                Delay = TimeSpan.FromSeconds(2),
                UseJitter = false,
                ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
                    .Handle<HttpRequestException>()
                    .Handle<TaskCanceledException>()
                    .HandleResult(r => (int)r.StatusCode >= 500),
                OnRetry = args =>
                {
                    _logger.LogWarning(
                        "Retrying PDF download (attempt {Attempt}) after {Delay}",
                        args.AttemptNumber + 1, args.RetryDelay);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }
}
