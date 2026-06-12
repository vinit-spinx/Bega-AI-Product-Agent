using Npgsql;
using Pgvector.Npgsql;

namespace BegaProductFinder.Infrastructure.Data;

/// <summary>
/// Manages the PostgreSQL pgvector connection pool and schema lifecycle.
/// This is NOT an EF Core DbContext — the pgvector schema is created imperatively by the ingestion pipeline,
/// not via EF migrations.
/// Registered as a singleton so the underlying <see cref="NpgsqlDataSource"/> connection pool is shared.
/// </summary>
public sealed class VectorDbContext : IDisposable
{
    private readonly NpgsqlDataSource _dataSource;

    /// <summary>
    /// Dimensionality of the embedding vectors stored in this index.
    /// Must match the model configured via <c>Embeddings:Dimensions</c> (768 for nomic-embed-text, 1536 for Azure OpenAI).
    /// </summary>
    public int Dimensions { get; }

    /// <summary>
    /// Initialises the Npgsql data source with pgvector type support registered.
    /// </summary>
    /// <param name="connectionString">PostgreSQL connection string from <c>ConnectionStrings:Database</c>.</param>
    /// <param name="dimensions">Embedding dimension count — must match the ingestion embedding model.</param>
    public VectorDbContext(string connectionString, int dimensions)
    {
        Dimensions = dimensions;
        var builder = new NpgsqlDataSourceBuilder(connectionString);
        builder.UseVector();
        _dataSource = builder.Build();
    }

    /// <summary>Opens and returns a new <see cref="NpgsqlConnection"/> from the pool.</summary>
    public NpgsqlConnection CreateConnection() => _dataSource.CreateConnection();

    /// <summary>
    /// Idempotently creates the <c>vector</c> extension, <c>product_chunks</c> table, and HNSW index
    /// if they do not already exist.
    /// Called once at the start of each ingestion run and on API startup health check.
    /// </summary>
    public async Task EnsureSchemaAsync(CancellationToken ct = default)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(ct);

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "CREATE EXTENSION IF NOT EXISTS vector;";
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = $"""
                CREATE TABLE IF NOT EXISTS product_chunks (
                    chunk_id       SERIAL PRIMARY KEY,
                    product_id     INTEGER NOT NULL,
                    catalog_number VARCHAR(50) NOT NULL,
                    chunk_source   VARCHAR(50) NOT NULL,
                    chunk_text     TEXT NOT NULL,
                    embedding      vector({Dimensions}),
                    page_number    INTEGER,
                    chunk_index    INTEGER,
                    created_at     TIMESTAMP DEFAULT NOW()
                );
                """;
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // HNSW index — fast approximate nearest-neighbour search with cosine similarity
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                CREATE INDEX IF NOT EXISTS idx_chunk_embedding
                    ON product_chunks USING hnsw (embedding vector_cosine_ops);
                """;
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    /// <summary>Returns true if PostgreSQL is reachable and responds to a simple query.</summary>
    public async Task<bool> HealthCheckAsync(CancellationToken ct = default)
    {
        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync(ct);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1;";
            await cmd.ExecuteScalarAsync(ct);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <inheritdoc/>
    public void Dispose() => _dataSource.Dispose();
}
