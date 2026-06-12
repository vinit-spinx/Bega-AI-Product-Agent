using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core column mapping for the Products table (PostgreSQL via Npgsql).
/// </summary>
public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    /// <inheritdoc/>
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.ProductId);
        builder.Property(p => p.ProductId).UseIdentityColumn();

        // Core identifiers
        builder.Property(p => p.BegaId).IsRequired().HasMaxLength(20);
        builder.Property(p => p.CatalogNumber).IsRequired().HasMaxLength(50);

        // Hierarchy / classification
        builder.Property(p => p.FamilyName).HasMaxLength(200);
        builder.Property(p => p.FamilySlug).HasMaxLength(100);
        builder.Property(p => p.SubFamilyName).HasMaxLength(200);
        builder.Property(p => p.LuminaireType).HasMaxLength(100);
        builder.Property(p => p.GroupSlug).HasMaxLength(100);
        builder.Property(p => p.GroupsName).HasMaxLength(100);
        builder.Property(p => p.CategoryName).HasMaxLength(100);

        // Image URLs
        builder.Property(p => p.FamilyListPageImage).HasMaxLength(1000);
        builder.Property(p => p.FamilyListPageImageOrientation).HasMaxLength(10);
        builder.Property(p => p.FamilyTechImage).HasMaxLength(1000);

        // Electrical / photometric specs
        builder.Property(p => p.LedWattage).HasMaxLength(20);
        builder.Property(p => p.WattageW).HasPrecision(10, 4);
        builder.Property(p => p.SystemWattageW).HasPrecision(10, 4);
        builder.Property(p => p.LumenOutputLm).HasPrecision(10, 2);
        builder.Property(p => p.BeamAngleDeg).HasPrecision(10, 2);
        builder.Property(p => p.ColorTemperatureJson).HasMaxLength(500);
        builder.Property(p => p.Voltage).HasMaxLength(200);
        builder.Property(p => p.ControlProtocol).HasMaxLength(100);
        builder.Property(p => p.Application).HasMaxLength(100);
        builder.Property(p => p.Distribution).HasMaxLength(100);
        builder.Property(p => p.DynamicLight).HasMaxLength(100);
        builder.Property(p => p.Finish).HasMaxLength(100);
        builder.Property(p => p.LeadTime).HasMaxLength(100);

        // Dimensions — raw strings, no numeric conversion
        builder.Property(p => p.DimensionA).HasMaxLength(10);
        builder.Property(p => p.DimensionAFraction).HasMaxLength(10);
        builder.Property(p => p.DimensionB).HasMaxLength(10);
        builder.Property(p => p.DimensionBFraction).HasMaxLength(10);
        builder.Property(p => p.DimensionC).HasMaxLength(10);
        builder.Property(p => p.DimensionCFraction).HasMaxLength(10);
        builder.Property(p => p.DimensionD).HasMaxLength(10);
        builder.Property(p => p.DimensionDFraction).HasMaxLength(10);
        builder.Property(p => p.DimensionE).HasMaxLength(10);
        builder.Property(p => p.DimensionEFraction).HasMaxLength(10);

        // IP ratings
        builder.Property(p => p.RatingB).HasMaxLength(20);
        builder.Property(p => p.RatingU).HasMaxLength(20);
        builder.Property(p => p.RatingG).HasMaxLength(20);

        // Pricing
        builder.Property(p => p.DnpPrice).HasPrecision(18, 4);
        builder.Property(p => p.MsrpPrice).HasPrecision(18, 4);

        // Boolean flags with explicit SQL Server defaults
        builder.Property(p => p.IsAdaCompliant).HasDefaultValue(false);
        builder.Property(p => p.IsExpressDelivery).HasDefaultValue(false);

        // Large text columns — nvarchar(max) by convention for non-nullable string
        builder.Property(p => p.ExtraInfo).IsRequired();
        builder.Property(p => p.ReplacementCatalogNumber).HasMaxLength(50);

        // Document URLs
        builder.Property(p => p.TechnicalDocumentUrl).IsRequired().HasMaxLength(1000);
        builder.Property(p => p.SpecDocumentUrl).IsRequired().HasMaxLength(1000);

        // New fields from updated BEGA JSON
        builder.Property(p => p.ProductTechnicalSpec);
        builder.Property(p => p.FamilyExtraInfo);
        builder.Property(p => p.AIEnrichmentJson);

        // Audit timestamps
        builder.Property(p => p.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();
        builder.Property(p => p.LastUpdated).IsRequired();

        // Unique constraint on external BEGA id
        builder.HasIndex(p => p.BegaId).IsUnique();

        // Search indexes
        builder.HasIndex(p => p.CatalogNumber);
        builder.HasIndex(p => p.FamilyName);
        builder.HasIndex(p => p.LuminaireType);
        builder.HasIndex(p => p.GroupSlug);
        builder.HasIndex(p => p.CategoryName);
    }
}
