using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>EF Core column mapping for the States table.</summary>
public sealed class StateConfiguration : IEntityTypeConfiguration<State>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<State> builder)
    {
        builder.ToTable("States");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
               .HasMaxLength(150)
               .IsRequired();

        builder.Property(s => s.IsActive)
               .IsRequired();

        builder.Property(s => s.CreatedAt)
               .IsRequired();

        builder.Property(s => s.CountryId)
               .HasDefaultValue(0)
               .IsRequired();

        builder.HasOne(s => s.Country)
               .WithMany(c => c.States)
               .HasForeignKey(s => s.CountryId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.Name);
        builder.HasIndex(s => s.CountryId);
    }
}
