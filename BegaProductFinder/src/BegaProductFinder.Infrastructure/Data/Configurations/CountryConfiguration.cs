using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>EF Core column mapping for the Countries table.</summary>
public sealed class CountryConfiguration : IEntityTypeConfiguration<Country>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<Country> builder)
    {
        builder.ToTable("Countries");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(c => c.IsActive)
               .IsRequired();

        builder.Property(c => c.ShortCode)
               .HasColumnType("nvarchar(max)");

        builder.Property(c => c.CreatedAt)
               .IsRequired();

        builder.HasIndex(c => c.Name);
    }
}
