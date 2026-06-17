using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

public sealed class AnalyticsEventConfiguration : IEntityTypeConfiguration<AnalyticsEvent>
{
    public void Configure(EntityTypeBuilder<AnalyticsEvent> builder)
    {
        builder.ToTable("AnalyticsEvents");
        builder.HasKey(e => e.EventId);
        builder.Property(e => e.EventId).UseIdentityColumn();
        builder.Property(e => e.EventType).HasMaxLength(50).IsRequired();
        builder.Property(e => e.SessionId).HasMaxLength(200);
        builder.Property(e => e.Name).HasMaxLength(500);

        // Composite index for all aggregate queries
        builder.HasIndex(e => new { e.EventType, e.CreatedAt });
    }
}
