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
        builder.ToTable("ContactInquiries");
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
               .HasColumnType("nvarchar(max)")
               .IsRequired();

        builder.Property(c => c.CreatedAt)
               .HasDefaultValueSql("GETUTCDATE()")
               .ValueGeneratedOnAdd();

        builder.Property(c => c.Company)
               .HasMaxLength(200);

        builder.Property(c => c.ShortlistJson)
               .HasColumnType("nvarchar(max)");

        builder.Property(c => c.BomReportJson)
               .HasColumnType("nvarchar(max)");

        builder.Property(c => c.Source)
               .HasMaxLength(50)
               .HasDefaultValue("inquiry")
               .IsRequired();

        builder.Property(c => c.Designation)
               .HasMaxLength(100);

        builder.Property(c => c.ProjectType)
               .HasMaxLength(100);

        builder.Property(c => c.Location)
               .HasMaxLength(200);

        builder.Property(c => c.Contact)
               .HasMaxLength(100);

        builder.Property(c => c.Message)
               .HasColumnType("nvarchar(max)");

        builder.Property(c => c.City)
               .HasMaxLength(200);

        builder.Property(c => c.Country)
               .HasMaxLength(100);

        builder.Property(c => c.CountryCode)
               .HasMaxLength(10);

        // Fast lookup of all inquiries for a session
        builder.HasIndex(c => c.SessionId);

        // Fast lookup by email for CRM / de-duplication
        builder.HasIndex(c => c.Email);
    }
}
