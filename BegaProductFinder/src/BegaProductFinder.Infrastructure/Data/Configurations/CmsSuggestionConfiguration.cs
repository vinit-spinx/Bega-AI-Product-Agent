using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

public sealed class CmsSuggestionConfiguration : IEntityTypeConfiguration<CmsSuggestion>
{
    public void Configure(EntityTypeBuilder<CmsSuggestion> builder)
    {
        builder.ToTable("CmsSuggestions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).UseIdentityColumn();
        builder.Property(x => x.Text).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

        var seed = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        builder.HasData(
            new CmsSuggestion { Id = 1, SortOrder = 1, IsActive = true, Text = "Find bollard lights with Dark Sky compliance", CreatedAt = seed, UpdatedAt = seed },
            new CmsSuggestion { Id = 2, SortOrder = 2, IsActive = true, Text = "Recommend lighting for a 5-star hotel entrance", CreatedAt = seed, UpdatedAt = seed },
            new CmsSuggestion { Id = 3, SortOrder = 3, IsActive = true, Text = "Find DALI-compatible exterior luminaires", CreatedAt = seed, UpdatedAt = seed },
            new CmsSuggestion { Id = 4, SortOrder = 4, IsActive = true, Text = "Suggest lighting for a luxurious garden at night", CreatedAt = seed, UpdatedAt = seed }
        );
    }
}
