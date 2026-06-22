using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core column mapping for the SessionFunnelStatuses table.
/// </summary>
public sealed class SessionFunnelStatusConfiguration : IEntityTypeConfiguration<SessionFunnelStatus>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<SessionFunnelStatus> builder)
    {
        builder.ToTable("SessionFunnelStatuses");
        builder.HasKey(s => s.SessionId);

        builder.Property(s => s.FunnelStage)
               .HasMaxLength(30)
               .HasDefaultValue("query")
               .IsRequired();

        builder.Property(s => s.LeadTemperature)
               .HasMaxLength(10);

        builder.Property(s => s.Summary)
               .HasColumnType("nvarchar(max)");

        builder.Property(s => s.IsFinalized)
               .HasDefaultValue(false);

        builder.Property(s => s.CreatedAt)
               .HasDefaultValueSql("GETUTCDATE()")
               .ValueGeneratedOnAdd();

        // Funnel/lead queries filter on these constantly
        builder.HasIndex(s => s.IsFinalized);
        builder.HasIndex(s => s.FunnelStage);
        builder.HasIndex(s => s.IsLead);
    }
}
