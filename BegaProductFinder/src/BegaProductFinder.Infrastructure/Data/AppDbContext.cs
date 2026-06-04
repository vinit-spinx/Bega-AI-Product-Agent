using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace BegaProductFinder.Infrastructure.Data;

/// <summary>
/// EF Core DbContext for SQL Server — manages Products, ProductAccessories, ProductChunks, and ChatSessions.
/// Entity configurations are discovered automatically via <see cref="ModelBuilder.ApplyConfigurationsFromAssembly"/>.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    /// <summary>The BEGA product catalog.</summary>
    public DbSet<Product> Products => Set<Product>();

    /// <summary>Accessories belonging to products — one-to-many, cascade delete.</summary>
    public DbSet<ProductAccessory> ProductAccessories => Set<ProductAccessory>();

    /// <summary>Text chunks extracted from product JSON and spec PDFs — ready for embedding.</summary>
    public DbSet<ProductChunk> ProductChunks => Set<ProductChunk>();

    /// <summary>Conversation sessions — messages persisted as a JSON blob.</summary>
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();

    /// <summary>Contact inquiries submitted via the "Connect with BEGA Team" panel.</summary>
    public DbSet<ContactInquiry> ContactInquiries => Set<ContactInquiry>();

    /// <inheritdoc/>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Applies all IEntityTypeConfiguration<T> classes found in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
