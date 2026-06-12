using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core column mapping for the ProductProjects table.
/// Each row is one project reference from the BEGA JSON Projects array.
/// </summary>
public sealed class ProductProjectConfiguration : IEntityTypeConfiguration<ProductProject>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<ProductProject> builder)
    {
        builder.HasKey(p => p.ProjectId);
        builder.Property(p => p.ProjectId).UseIdentityColumn();

        builder.Property(p => p.ProductId).IsRequired();
        builder.Property(p => p.Name).IsRequired().HasMaxLength(500);
        builder.Property(p => p.Description);
        builder.Property(p => p.Tags).HasMaxLength(500);
        builder.Property(p => p.Slug).HasMaxLength(1000);
        builder.Property(p => p.Location).HasMaxLength(500);
        builder.Property(p => p.ListingImage).HasMaxLength(1000);
        builder.Property(p => p.SortOrder).HasDefaultValue(0);

        builder.HasIndex(p => p.ProductId);

        builder.HasOne(p => p.Product)
            .WithMany(pr => pr.Projects)
            .HasForeignKey(p => p.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
