using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>EF Core column mapping for the RepresentativeDetails table.</summary>
public sealed class RepresentativeDetailConfiguration : IEntityTypeConfiguration<RepresentativeDetail>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<RepresentativeDetail> builder)
    {
        builder.ToTable("RepresentativeDetails");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Zip)
               .HasMaxLength(50);

        builder.Property(d => d.City)
               .HasMaxLength(200);

        builder.Property(d => d.IsActive)
               .IsRequired();

        builder.Property(d => d.CreatedAt)
               .IsRequired();

        builder.HasOne(d => d.Representative)
               .WithMany(r => r.Details)
               .HasForeignKey(d => d.RepresentativeId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(d => d.RepresentativeId);
    }
}
