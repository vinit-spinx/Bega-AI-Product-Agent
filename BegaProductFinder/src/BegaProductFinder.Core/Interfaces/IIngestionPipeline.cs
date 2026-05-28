using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Orchestrates the six-stage BEGA product ingestion pipeline:
/// (1) Parse JSON → (2) Upsert SQL Server → (3) Download PDFs → (4) Chunk text →
/// (5) Generate embeddings → (6) Index in pgvector.
/// The pipeline is idempotent: existing records are updated, not duplicated.
/// </summary>
public interface IIngestionPipeline
{
    /// <summary>
    /// Runs the full ingestion pipeline for the products JSON file at <paramref name="productJsonPath"/>.
    /// Progress is written to the configured logger at Information level.
    /// Failures (e.g. PDF download errors) are logged and collected — they do not abort the run.
    /// </summary>
    /// <param name="productJsonPath">Absolute path to the BEGA products.json file.</param>
    Task RunAsync(string productJsonPath, CancellationToken ct = default);

    /// <summary>
    /// Returns the summary report from the most recently completed pipeline run.
    /// Returns a zeroed report if no run has completed yet in this application lifetime.
    /// </summary>
    Task<IngestionReport> GetLastReportAsync(CancellationToken ct = default);
}
