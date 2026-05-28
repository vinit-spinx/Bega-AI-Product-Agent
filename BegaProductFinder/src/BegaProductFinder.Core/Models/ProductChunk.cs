namespace BegaProductFinder.Core.Models;

/// <summary>
/// EF Core entity for the ProductChunks table (SQL Server).
/// Stores text chunk metadata only — the actual embedding vector lives in pgvector.
/// </summary>
public class ProductChunk
{
    /// <summary>SQL Server identity primary key.</summary>
    public int ChunkId { get; set; }

    /// <summary>FK to <see cref="Product.ProductId"/>.</summary>
    public int ProductId { get; set; }

    public string CatalogNumber { get; set; } = string.Empty;

    /// <summary>Origin of the chunk text: "json_summary" | "specpdf" | "extrainfo".</summary>
    public string ChunkSource { get; set; } = string.Empty;

    public string ChunkText { get; set; } = string.Empty;

    /// <summary>Source PDF page number — null for non-PDF chunks.</summary>
    public int? PageNumber { get; set; }

    /// <summary>Zero-based index of this chunk within its source document.</summary>
    public int ChunkIndex { get; set; }

    /// <summary>True once the chunk has been embedded and indexed in pgvector.</summary>
    public bool IsEmbedded { get; set; }

    /// <summary>Identifier of the corresponding row in the pgvector product_chunks table.</summary>
    public string? VectorId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Product Product { get; set; } = null!;
}
