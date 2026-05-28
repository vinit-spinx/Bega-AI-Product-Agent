namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Abstraction over the text embedding model.
/// Local implementation: <c>OllamaEmbeddingService</c> using <c>nomic-embed-text</c> (768 dimensions).
/// Azure implementation: <c>AzureOpenAiEmbeddingService</c> using <c>text-embedding-3-small</c> (1536 dimensions).
/// Switch by changing <c>Embeddings:Provider</c> in configuration — no code changes required.
/// </summary>
public interface IEmbeddingService
{
    /// <summary>Generates a dense embedding vector for a single text string.</summary>
    /// <param name="text">The text to embed. Typically a chunk of product content or a user query.</param>
    /// <returns>Float array of length <see cref="Dimensions"/>.</returns>
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);

    /// <summary>
    /// Generates embedding vectors for a batch of texts in a single call.
    /// Implementations should send texts in batches that respect the model's token limits.
    /// </summary>
    /// <param name="texts">List of texts to embed.</param>
    /// <returns>Parallel list of float arrays — same order and count as <paramref name="texts"/>.</returns>
    Task<List<float[]>> EmbedBatchAsync(List<string> texts, CancellationToken ct = default);

    /// <summary>
    /// Dimensionality of the embedding vectors produced by this service.
    /// Must match the <c>vector(N)</c> column in the pgvector schema.
    /// Configurable via <c>Embeddings:Dimensions</c>.
    /// </summary>
    int Dimensions { get; }
}
