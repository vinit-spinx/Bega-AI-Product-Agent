using BegaProductFinder.Core.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BegaProductFinder.Infrastructure.Data.Configurations;

public sealed class CmsActionConfiguration : IEntityTypeConfiguration<CmsAction>
{
    public void Configure(EntityTypeBuilder<CmsAction> builder)
    {
        builder.ToTable("CmsActions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).UseIdentityColumn();
        builder.Property(x => x.Title).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Description).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Prompt).IsRequired().HasColumnType("nvarchar(max)");
        builder.Property(x => x.Icon).IsRequired().HasMaxLength(50);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.IsFeatured).HasDefaultValue(false);
        builder.Property(x => x.SortOrder).HasDefaultValue(0);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

        var seed = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        builder.HasData(
            new CmsAction
            {
                Id = 1, SortOrder = 1, IsActive = true, IsFeatured = true, Icon = "compare",
                Title = "Fixture Comparison",
                Description = "Compare luminaires for a specific application",
                Prompt = "Search the BEGA catalog and provide a direct comparison of luminaires suitable for commercial outdoor use. Show at least 3 products side by side with their beam angles, wattage, lumen output, control protocol, and mounting options. Do not ask clarifying questions — present the best options immediately.",
                CreatedAt = seed, UpdatedAt = seed,
            },
            new CmsAction
            {
                Id = 2, SortOrder = 2, IsActive = true, IsFeatured = true, Icon = "shield",
                Title = "Dark Sky Compliance",
                Description = "Find Dark Sky compliant solutions",
                Prompt = "Search the BEGA catalog and list all products that meet Dark Sky or \"international dark sky\" compliance. Show the catalog numbers, family names, wattage, and lumen output. Do not ask clarifying questions — present the results immediately.",
                CreatedAt = seed, UpdatedAt = seed,
            },
            new CmsAction
            {
                Id = 3, SortOrder = 3, IsActive = true, IsFeatured = true, Icon = "star",
                Title = "Hotel Project Brief",
                Description = "Complete lighting brief for hospitality",
                Prompt = "Use the recommend_for_project tool to generate a complete BEGA lighting recommendation for a 5-star hotel. Cover these areas: entrance, pathways, facade, pool area, and landscaping. For each area provide specific BEGA catalog numbers with rationale. Do not ask clarifying questions — deliver the full recommendation immediately.",
                CreatedAt = seed, UpdatedAt = seed,
            },
            new CmsAction
            {
                Id = 4, SortOrder = 4, IsActive = true, IsFeatured = false, Icon = "building",
                Title = "Facade Lighting",
                Description = "Architectural facade illumination",
                Prompt = "Search the BEGA catalog and recommend specific luminaires for illuminating a contemporary commercial building facade. Focus on wall washers, grazing fixtures, and accent lights. Provide catalog numbers, key specs, and mounting guidance. Do not ask clarifying questions — present results immediately.",
                CreatedAt = seed, UpdatedAt = seed,
            },
            new CmsAction
            {
                Id = 5, SortOrder = 5, IsActive = true, IsFeatured = false, Icon = "controls",
                Title = "Smart Controls",
                Description = "DALI and 0-10V control systems",
                Prompt = "Search the BEGA catalog and list luminaires with DALI or 0-10V control protocol. Show catalog numbers, family names, wattage, and control compatibility. Explain briefly how DALI integrates into a centralized system. Do not ask clarifying questions — show results immediately.",
                CreatedAt = seed, UpdatedAt = seed,
            },
            new CmsAction
            {
                Id = 6, SortOrder = 6, IsActive = true, IsFeatured = false, Icon = "city",
                Title = "Urban Furniture",
                Description = "Public space furniture and lighting",
                Prompt = "Search the BEGA furniture catalog and recommend outdoor furniture and integrated lighting solutions for a modern public plaza. Include benches, bollards, and ambient lighting with catalog numbers and descriptions. Do not ask clarifying questions — present the selection immediately.",
                CreatedAt = seed, UpdatedAt = seed,
            },
            new CmsAction
            {
                Id = 7, SortOrder = 7, IsActive = true, IsFeatured = false, Icon = "leaf",
                Title = "Energy Efficiency",
                Description = "Low-wattage LED solutions",
                Prompt = "Search the BEGA catalog and list the most energy-efficient exterior LED luminaires with system wattage under 10W and high lumen output. Show catalog numbers, wattage, lumens, and application type. Do not ask clarifying questions — display the results immediately.",
                CreatedAt = seed, UpdatedAt = seed,
            },
            new CmsAction
            {
                Id = 8, SortOrder = 8, IsActive = true, IsFeatured = false, Icon = "document",
                Title = "Generate BOM",
                Description = "Bill of materials for your project",
                Prompt = "Use the recommend_for_project tool to select BEGA luminaires for a luxury residential villa exterior — covering driveway, garden, pool, and facade. Then use generate_bill_of_materials to produce a priced BOM with quantities, unit DNP, and totals. Do not ask clarifying questions — generate the recommendation and BOM immediately.",
                CreatedAt = seed, UpdatedAt = seed,
            }
        );
    }
}
