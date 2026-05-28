using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core column mapping for the ProductAccessories table.
/// Each row is one accessory item deserialized from the BEGA JSON <c>ProductAccessories</c> string array.
/// Cascade delete ensures accessories are removed when the parent product is deleted.
/// </summary>
public sealed class ProductAccessoryConfiguration : IEntityTypeConfiguration<ProductAccessory>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<ProductAccessory> builder)
    {
        builder.ToTable("ProductAccessories");
        builder.HasKey(a => a.AccessoryId);
        builder.Property(a => a.AccessoryId).UseIdentityColumn();

        builder.Property(a => a.AccessoryName).IsRequired().HasMaxLength(500);
        builder.Property(a => a.SortOrder).HasDefaultValue(0);

        builder.HasOne(a => a.Product)
               .WithMany(p => p.Accessories)
               .HasForeignKey(a => a.ProductId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
