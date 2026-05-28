using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Abstraction over the vector store used for semantic product search.
/// Local implementation: <c>PgVectorSearchService</c> (pgvector on PostgreSQL).
/// Azure implementation: <c>AzureAiSearchService</c> (Azure AI Search).
/// Switch by changing <c>VectorSearch:Provider</c> in configuration — no code changes required.
/// </summary>
public interface IVectorSearchService
{
    /// <summary>
    /// Creates the vector index / table if it does not already exist.
    /// Called once on application startup and at the start of each ingestion run.
    /// </summary>
    Task EnsureIndexExistsAsync(CancellationToken ct = default);

    /// <summary>
    /// Indexes a single text chunk and its embedding vector.
    /// </summary>
    /// <param name="productId">SQL Server ProductId of the parent product.</param>
    /// <param name="catalogNumber">BEGA catalog number e.g. "77127".</param>
    /// <param name="chunkSource">"json_summary" | "specpdf" | "extrainfo".</param>
    /// <param name="chunkText">Raw text content of the chunk.</param>
    /// <param name="embedding">Dense embedding vector from <see cref="IEmbeddingService"/>.</param>
    /// <param name="pageNumber">Source PDF page — null for non-PDF chunks.</param>
    /// <param name="chunkIndex">Zero-based chunk index within its source.</param>
    Task IndexChunkAsync(
        int productId,
        string catalogNumber,
        string chunkSource,
        string chunkText,
        float[] embedding,
        int? pageNumber,
        int chunkIndex,
        CancellationToken ct = default);

    /// <summary>
    /// Performs approximate nearest-neighbour search using cosine similarity.
    /// </summary>
    /// <param name="queryVector">Embedding of the user query — same dimension as indexed chunks.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <param name="filterProductIds">Optional whitelist of ProductIds — restricts search to these products only.</param>
    Task<List<VectorSearchResult>> SearchAsync(
        float[] queryVector,
        int topK = 10,
        int[]? filterProductIds = null,
        CancellationToken ct = default);

    /// <summary>Removes all indexed chunks for the specified product — called before re-ingestion.</summary>
    Task DeleteByProductIdAsync(int productId, CancellationToken ct = default);

    /// <summary>Returns true if the vector store is reachable and the index exists.</summary>
    Task<bool> HealthCheckAsync(CancellationToken ct = default);
}
