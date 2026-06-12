using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core column mapping for the ContactInquiries table.
/// </summary>
public sealed class ContactInquiryConfiguration : IEntityTypeConfiguration<ContactInquiry>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<ContactInquiry> builder)
    {
        builder.HasKey(c => c.InquiryId);

        builder.Property(c => c.SessionId)
               .HasMaxLength(200)
               .IsRequired();

        builder.Property(c => c.Name)
               .HasMaxLength(200)
               .IsRequired();

        builder.Property(c => c.Email)
               .HasMaxLength(200)
               .IsRequired();

        builder.Property(c => c.Query)
               .IsRequired();

        builder.Property(c => c.CreatedAt)
               .HasDefaultValueSql("NOW()")
               .ValueGeneratedOnAdd();

        // Fast lookup of all inquiries for a session
        builder.HasIndex(c => c.SessionId);

        // Fast lookup by email for CRM / de-duplication
        builder.HasIndex(c => c.Email);
    }
}
