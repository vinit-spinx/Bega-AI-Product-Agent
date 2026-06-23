using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>EF Core column mapping for the Representatives table.</summary>
public sealed class RepresentativeConfiguration : IEntityTypeConfiguration<Representative>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<Representative> builder)
    {
        builder.ToTable("Representatives");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.AgencyName)
               .HasMaxLength(500)
               .IsRequired();

        builder.Property(r => r.Address)
               .HasMaxLength(2000)
               .IsRequired();

        builder.Property(r => r.Latitude)
               .HasColumnType("nvarchar(max)");

        builder.Property(r => r.Longitude)
               .HasColumnType("nvarchar(max)");

        builder.Property(r => r.Phone)
               .HasMaxLength(100);

        builder.Property(r => r.Fax)
               .HasMaxLength(100);

        builder.Property(r => r.Email)
               .HasMaxLength(200);

        builder.Property(r => r.Website)
               .HasMaxLength(2000);

        builder.Property(r => r.IsActive)
               .IsRequired();

        builder.Property(r => r.CreatedAt)
               .IsRequired();

        builder.Property(r => r.StateText)
               .HasMaxLength(250);

        builder.Property(r => r.Provinces)
               .HasMaxLength(250);

        builder.HasOne(r => r.Country)
               .WithMany(c => c.Representatives)
               .HasForeignKey(r => r.CountryId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.State)
               .WithMany(s => s.Representatives)
               .HasForeignKey(r => r.StateId)
               .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(r => r.CountryId);
        builder.HasIndex(r => r.StateId);
        builder.HasIndex(r => r.IsActive);
    }
}
