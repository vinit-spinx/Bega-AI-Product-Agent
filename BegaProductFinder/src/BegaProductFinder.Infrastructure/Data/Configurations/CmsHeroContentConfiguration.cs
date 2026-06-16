using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

public sealed class CmsHeroContentConfiguration : IEntityTypeConfiguration<CmsHeroContent>
{
    public void Configure(EntityTypeBuilder<CmsHeroContent> builder)
    {
        builder.ToTable("CmsHeroContent");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).IsRequired().HasMaxLength(300);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.BackgroundImageUrl).HasMaxLength(1000);
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasData(new CmsHeroContent
        {
            Id = 1,
            Title = "Find the Perfect Lighting Solution",
            Description = "Discover lighting, furniture, and control solutions engineered for exceptional architectural environments.",
            BackgroundImageUrl = "",
            UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        });
    }
}
