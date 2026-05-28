using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core column mapping for the ProductChunks table.
/// Stores chunk metadata only — the embedding vector lives in the pgvector <c>product_chunks</c> table.
/// <see cref="Core.Models.ProductChunk.IsEmbedded"/> is the flag checked before re-embedding on ingestion re-runs.
/// </summary>
public sealed class ProductChunkConfiguration : IEntityTypeConfiguration<ProductChunk>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<ProductChunk> builder)
    {
        builder.ToTable("ProductChunks");
        builder.HasKey(c => c.ChunkId);
        builder.Property(c => c.ChunkId).UseIdentityColumn();

        builder.Property(c => c.CatalogNumber).IsRequired().HasMaxLength(50);
        builder.Property(c => c.ChunkSource).IsRequired().HasMaxLength(50);
        builder.Property(c => c.ChunkText).IsRequired();
        builder.Property(c => c.IsEmbedded).HasDefaultValue(false);
        builder.Property(c => c.VectorId).HasMaxLength(200);
        builder.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()").ValueGeneratedOnAdd();

        builder.HasOne(c => c.Product)
               .WithMany(p => p.Chunks)
               .HasForeignKey(c => c.ProductId)
               .OnDelete(DeleteBehavior.Cascade);

        // Index to quickly find all un-embedded chunks during ingestion
        builder.HasIndex(c => c.IsEmbedded);
        builder.HasIndex(c => c.CatalogNumber);
    }
}
