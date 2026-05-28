using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using Pgvector;

namespace BegaProductFinder.Infrastructure.Search;

/// <summary>
/// Implements <see cref="IVectorSearchService"/> using PostgreSQL with the pgvector extension.
/// Uses HNSW cosine-similarity search on the <c>product_chunks</c> table.
/// Registered when <c>VectorSearch:Provider = "pgvector"</c> in configuration.
/// </summary>
public sealed class PgVectorSearchService : IVectorSearchService
{
    private readonly VectorDbContext _vectorDb;
    private readonly ILogger<PgVectorSearchService> _logger;

    public PgVectorSearchService(VectorDbContext vectorDb, ILogger<PgVectorSearchService> logger)
    {
        _vectorDb = vectorDb;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task EnsureIndexExistsAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Ensuring pgvector schema exists (dimension={Dimensions})", _vectorDb.Dimensions);
        await _vectorDb.EnsureSchemaAsync(ct);
    }

    /// <inheritdoc/>
    public async Task IndexChunkAsync(
        int productId,
        string catalogNumber,
        string chunkSource,
        string chunkText,
        float[] embedding,
        int? pageNumber,
        int chunkIndex,
        CancellationToken ct = default)
    {
        await using var conn = _vectorDb.CreateConnection();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO product_chunks
                (product_id, catalog_number, chunk_source, chunk_text, embedding, page_number, chunk_index)
            VALUES
                (@product_id, @catalog_number, @chunk_source, @chunk_text, @embedding, @page_number, @chunk_index)
            """;

        cmd.Parameters.AddWithValue("@product_id", productId);
        cmd.Parameters.AddWithValue("@catalog_number", catalogNumber);
        cmd.Parameters.AddWithValue("@chunk_source", chunkSource);
        cmd.Parameters.AddWithValue("@chunk_text", chunkText);
        cmd.Parameters.Add(new NpgsqlParameter("@embedding", NpgsqlDbType.Unknown)
        {
            Value = new Vector(embedding)
        });
        cmd.Parameters.AddWithValue("@page_number", pageNumber.HasValue ? (object)pageNumber.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@chunk_index", chunkIndex);

        await cmd.ExecuteNonQueryAsync(ct);
    }

    /// <inheritdoc/>
    public async Task<List<VectorSearchResult>> SearchAsync(
        float[] queryVector,
        int topK = 10,
        int[]? filterProductIds = null,
        CancellationToken ct = default)
    {
        await using var conn = _vectorDb.CreateConnection();
        await conn.OpenAsync(ct);

        // Cosine distance operator: <=> — lower is closer; score = 1 - distance
        var sql = filterProductIds is { Length: > 0 }
            ? """
              SELECT product_id, catalog_number, chunk_source, chunk_text,
                     1 - (embedding <=> @query_vector) AS score
              FROM product_chunks
              WHERE product_id = ANY(@filter_ids)
              ORDER BY embedding <=> @query_vector
              LIMIT @top_k
              """
            : """
              SELECT product_id, catalog_number, chunk_source, chunk_text,
                     1 - (embedding <=> @query_vector) AS score
              FROM product_chunks
              ORDER BY embedding <=> @query_vector
              LIMIT @top_k
              """;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;

        cmd.Parameters.Add(new NpgsqlParameter("@query_vector", NpgsqlDbType.Unknown)
        {
            Value = new Vector(queryVector)
        });
        cmd.Parameters.AddWithValue("@top_k", topK);

        if (filterProductIds is { Length: > 0 })
            cmd.Parameters.AddWithValue("@filter_ids", filterProductIds);

        var results = new List<VectorSearchResult>();

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            results.Add(new VectorSearchResult(
                ProductId: reader.GetInt32(0),
                CatalogNumber: reader.GetString(1),
                ChunkSource: reader.GetString(2),
                ChunkText: reader.GetString(3),
                Score: reader.GetDouble(4)
            ));
        }

        _logger.LogDebug("pgvector search returned {Count} results (topK={TopK})", results.Count, topK);
        return results;
    }

    /// <inheritdoc/>
    public async Task DeleteByProductIdAsync(int productId, CancellationToken ct = default)
    {
        await using var conn = _vectorDb.CreateConnection();
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM product_chunks WHERE product_id = @product_id";
        cmd.Parameters.AddWithValue("@product_id", productId);

        var deleted = await cmd.ExecuteNonQueryAsync(ct);
        _logger.LogDebug("Deleted {Count} pgvector chunks for product_id={ProductId}", deleted, productId);
    }

    /// <inheritdoc/>
    public async Task<bool> HealthCheckAsync(CancellationToken ct = default)
        => await _vectorDb.HealthCheckAsync(ct);
}
