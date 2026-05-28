using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Ingestion;

/// <summary>
/// Six-stage ingestion pipeline orchestrator.
/// <list type="number">
/// <item><description>Parse product JSON</description></item>
/// <item><description>Upsert SQL Server product records</description></item>
/// <item><description>Download spec PDFs</description></item>
/// <item><description>Chunk text</description></item>
/// <item><description>Generate embeddings via <see cref="IEmbeddingService"/></description></item>
/// <item><description>Index vectors via <see cref="IVectorSearchService"/></description></item>
/// </list>
/// All stages are idempotent: existing records are detected and skipped unless
/// <see cref="IngestionRunOptions.Reset"/> is set.
/// </summary>
public sealed class IngestionPipeline : IIngestionPipeline
{
    private readonly AppDbContext _db;
    private readonly JsonProductParser _parser;
    private readonly PdfTextExtractor _pdfExtractor;
    private readonly TextChunker _chunker;
    private readonly IEmbeddingService _embedding;
    private readonly IVectorSearchService _vectorSearch;
    private readonly IngestionOptions _options;
    private readonly IngestionRunOptions _runOptions;
    private readonly ILogger<IngestionPipeline> _logger;

    private IngestionReport _lastReport = new();

    public IngestionPipeline(
        AppDbContext db,
        JsonProductParser parser,
        PdfTextExtractor pdfExtractor,
        TextChunker chunker,
        IEmbeddingService embedding,
        IVectorSearchService vectorSearch,
        IngestionOptions options,
        IngestionRunOptions runOptions,
        ILogger<IngestionPipeline> logger)
    {
        _db = db;
        _parser = parser;
        _pdfExtractor = pdfExtractor;
        _chunker = chunker;
        _embedding = embedding;
        _vectorSearch = vectorSearch;
        _options = options;
        _runOptions = runOptions;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<IngestionReport> GetLastReportAsync(CancellationToken ct = default)
        => await Task.FromResult(_lastReport);

    /// <inheritdoc/>
    public async Task RunAsync(string productJsonPath, CancellationToken ct = default)
    {
        var started = DateTime.UtcNow;
        var failures = new List<string>();
        int productsUpserted = 0, chunksCreated = 0, pdfsDownloaded = 0, pdfsFailed = 0,
            chunksEmbedded = 0, vectorsIndexed = 0;

        // ── Stage 1: Parse JSON ──────────────────────────────────────────────
        Console.WriteLine("[Stage 1/6] Parsing product JSON...");
        var parsedProducts = await _parser.ParseAsync(productJsonPath, ct);
        Console.WriteLine($"[Stage 1/6] Parsing product JSON...              {parsedProducts.Count} products found");

        // ── Optional reset ───────────────────────────────────────────────────
        if (_runOptions.Reset)
        {
            Console.WriteLine("  [Reset] Deleting existing records...");
            await _db.ProductChunks.ExecuteDeleteAsync(ct);
            await _db.ProductAccessories.ExecuteDeleteAsync(ct);
            await _db.Products.ExecuteDeleteAsync(ct);
            _logger.LogInformation("Reset complete — all product records deleted");
        }

        // Ensure pgvector schema exists
        await _vectorSearch.EnsureIndexExistsAsync(ct);

        // ── Stage 2: Upsert SQL Server ───────────────────────────────────────
        Console.Write("[Stage 2/6] Upserting SQL Server records...      ");

        var allBegaIds = parsedProducts.Select(p => p.Product.BegaId).ToHashSet();
        var existingMap = await _db.Products
            .AsNoTracking()
            .Where(p => allBegaIds.Contains(p.BegaId))
            .ToDictionaryAsync(p => p.BegaId, p => p.ProductId, ct);

        for (int i = 0; i < parsedProducts.Count; i++)
        {
            var parsed = parsedProducts[i];
            var product = parsed.Product;

            try
            {
                if (existingMap.TryGetValue(product.BegaId, out var existingId))
                {
                    product.ProductId = existingId;
                    product.LastUpdated = DateTime.UtcNow;
                    _db.Products.Update(product);

                    // Replace accessories in bulk
                    await _db.ProductAccessories
                        .Where(a => a.ProductId == existingId)
                        .ExecuteDeleteAsync(ct);
                }
                else
                {
                    await _db.Products.AddAsync(product, ct);
                }

                await _db.SaveChangesAsync(ct);
                _db.ChangeTracker.Clear();

                foreach (var acc in parsed.Accessories)
                {
                    acc.ProductId = product.ProductId;
                }

                if (parsed.Accessories.Count > 0)
                {
                    await _db.ProductAccessories.AddRangeAsync(parsed.Accessories, ct);
                    await _db.SaveChangesAsync(ct);
                    _db.ChangeTracker.Clear();
                }

                // Update the in-memory parsed product with the real ProductId for later stages
                parsedProducts[i] = parsed with { Product = product };
                productsUpserted++;
            }
            catch (Exception ex)
            {
                var msg = $"Upsert failed for {product.CatalogNumber}: {ex.Message}";
                _logger.LogError(ex, msg);
                failures.Add(msg);
            }

            if ((i + 1) % 100 == 0 || i + 1 == parsedProducts.Count)
                Console.Write($"\r[Stage 2/6] Upserting SQL Server records...      {i + 1} / {parsedProducts.Count}");
        }
        Console.WriteLine();

        // ── Stage 3: Download PDFs ───────────────────────────────────────────
        var pdfPagesByProduct = new Dictionary<int, List<(int, string)>>();

        if (_runOptions.SkipPdfs)
        {
            Console.WriteLine("[Stage 3/6] Downloading Spec PDFs...             (skipped via --skip-pdfs)");
        }
        else
        {
            Console.Write("[Stage 3/6] Downloading Spec PDFs...             ");
            int pdfsDone = 0;
            foreach (var parsed in parsedProducts)
            {
                var product = parsed.Product;
                try
                {
                    var pages = await _pdfExtractor.ExtractAsync(
                        product.CatalogNumber,
                        product.SpecDocumentUrl,
                        ct);

                    pdfPagesByProduct[product.ProductId] = pages;

                    if (pages.Count > 0) pdfsDownloaded++;
                    else if (!string.IsNullOrWhiteSpace(product.SpecDocumentUrl)) pdfsFailed++;
                }
                catch (Exception ex)
                {
                    var msg = $"PDF extraction failed for {product.CatalogNumber}: {ex.Message}";
                    _logger.LogWarning(ex, msg);
                    failures.Add(msg);
                    pdfsFailed++;
                }

                pdfsDone++;
                if (pdfsDone % 50 == 0 || pdfsDone == parsedProducts.Count)
                    Console.Write($"\r[Stage 3/6] Downloading Spec PDFs...             {pdfsDownloaded} / {parsedProducts.Count}  ({pdfsFailed} skipped/failed)");
            }
            Console.WriteLine();
        }

        // ── Stage 4: Chunk Text ──────────────────────────────────────────────
        Console.Write("[Stage 4/6] Chunking text...                     ");

        // Remove existing un-embedded chunks (embedded ones carry vector IDs — keep them unless reset)
        var productIdsToRechunk = parsedProducts.Select(p => p.Product.ProductId).ToList();
        await _db.ProductChunks
            .Where(c => productIdsToRechunk.Contains(c.ProductId) && !c.IsEmbedded)
            .ExecuteDeleteAsync(ct);

        var allNewChunks = new List<ProductChunk>();

        foreach (var parsed in parsedProducts)
        {
            var product = parsed.Product;
            var pages = pdfPagesByProduct.TryGetValue(product.ProductId, out var p) ? p : [];
            var chunks = _chunker.ChunkProduct(product, pages);
            allNewChunks.AddRange(chunks);
        }

        // Bulk insert in batches of 500
        for (int i = 0; i < allNewChunks.Count; i += 500)
        {
            var batch = allNewChunks.Skip(i).Take(500).ToList();
            await _db.ProductChunks.AddRangeAsync(batch, ct);
            await _db.SaveChangesAsync(ct);
            _db.ChangeTracker.Clear();
        }

        chunksCreated = allNewChunks.Count;
        Console.WriteLine($"\r[Stage 4/6] Chunking text...                     {chunksCreated} chunks created");

        // ── Stage 5 & 6: Embed + Index ───────────────────────────────────────
        // Reload the newly-inserted chunks to get their real ChunkIds
        var unembedded = await _db.ProductChunks
            .AsNoTracking()
            .Where(c => productIdsToRechunk.Contains(c.ProductId) && !c.IsEmbedded)
            .ToListAsync(ct);

        Console.Write($"[Stage 5/6] Generating embeddings (Ollama)...    ");

        int embeddingsDone = 0;
        foreach (var chunk in unembedded)
        {
            try
            {
                var vector = await _embedding.EmbedAsync(chunk.ChunkText, ct);

                Console.Write($"\r[Stage 5/6] Generating embeddings (Ollama)...    {++embeddingsDone} / {unembedded.Count}");

                // ── Stage 6 inline: index immediately after embedding ────────
                await _vectorSearch.IndexChunkAsync(
                    productId: chunk.ProductId,
                    catalogNumber: chunk.CatalogNumber,
                    chunkSource: chunk.ChunkSource,
                    chunkText: chunk.ChunkText,
                    embedding: vector,
                    pageNumber: chunk.PageNumber,
                    chunkIndex: chunk.ChunkIndex,
                    ct: ct);

                vectorsIndexed++;

                // Mark as embedded in SQL Server
                await _db.ProductChunks
                    .Where(c => c.ChunkId == chunk.ChunkId)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(c => c.IsEmbedded, true)
                        .SetProperty(c => c.VectorId, chunk.ChunkId.ToString()),
                    ct);

                chunksEmbedded++;
            }
            catch (Exception ex)
            {
                var msg = $"Embed/index failed for chunk {chunk.ChunkId} ({chunk.CatalogNumber}): {ex.Message}";
                _logger.LogError(ex, msg);
                failures.Add(msg);
            }
        }

        Console.WriteLine();
        Console.WriteLine($"[Stage 6/6] Indexing vectors (pgvector)...       {vectorsIndexed} / {unembedded.Count}");

        // ── Summary ──────────────────────────────────────────────────────────
        var elapsed = DateTime.UtcNow - started;
        Console.WriteLine();
        Console.WriteLine($"Ingestion complete in {elapsed.Minutes}m {elapsed.Seconds}s");
        Console.WriteLine($"Products: {productsUpserted} | Chunks: {chunksCreated} | PDFs: {pdfsDownloaded} | Failures: {failures.Count}");

        if (failures.Count > 0)
        {
            var failureLogPath = Path.Combine(_options.PdfDownloadPath, "ingestion_failures.log");
            await File.WriteAllLinesAsync(failureLogPath, failures, ct);
            Console.WriteLine($"Failure log: {failureLogPath}");
        }

        _lastReport = new IngestionReport
        {
            TotalProducts = parsedProducts.Count,
            ProcessedProducts = productsUpserted,
            TotalChunks = chunksCreated,
            EmbeddedChunks = chunksEmbedded,
            PdfDownloaded = pdfsDownloaded,
            PdfFailed = pdfsFailed,
            FailureMessages = failures,
            Duration = elapsed,
            CompletedAt = DateTime.UtcNow
        };
    }
}
