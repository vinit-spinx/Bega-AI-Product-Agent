using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BegaProductFinder.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCmsContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CmsActions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Prompt = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CmsActions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CmsHeroContent",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    BackgroundImageUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CmsHeroContent", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CmsSuggestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Text = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CmsSuggestions", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "CmsActions",
                columns: new[] { "Id", "CreatedAt", "Description", "Icon", "IsActive", "IsFeatured", "Prompt", "SortOrder", "Title", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Compare luminaires for a specific application", "compare", true, true, "Search the BEGA catalog and provide a direct comparison of luminaires suitable for commercial outdoor use. Show at least 3 products side by side with their beam angles, wattage, lumen output, control protocol, and mounting options. Do not ask clarifying questions — present the best options immediately.", 1, "Fixture Comparison", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Find Dark Sky compliant solutions", "shield", true, true, "Search the BEGA catalog and list all products that meet Dark Sky or \"international dark sky\" compliance. Show the catalog numbers, family names, wattage, and lumen output. Do not ask clarifying questions — present the results immediately.", 2, "Dark Sky Compliance", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Complete lighting brief for hospitality", "star", true, true, "Use the recommend_for_project tool to generate a complete BEGA lighting recommendation for a 5-star hotel. Cover these areas: entrance, pathways, facade, pool area, and landscaping. For each area provide specific BEGA catalog numbers with rationale. Do not ask clarifying questions — deliver the full recommendation immediately.", 3, "Hotel Project Brief", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "CmsActions",
                columns: new[] { "Id", "CreatedAt", "Description", "Icon", "IsActive", "Prompt", "SortOrder", "Title", "UpdatedAt" },
                values: new object[,]
                {
                    { 4, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Architectural facade illumination", "building", true, "Search the BEGA catalog and recommend specific luminaires for illuminating a contemporary commercial building facade. Focus on wall washers, grazing fixtures, and accent lights. Provide catalog numbers, key specs, and mounting guidance. Do not ask clarifying questions — present results immediately.", 4, "Facade Lighting", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 5, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "DALI and 0-10V control systems", "controls", true, "Search the BEGA catalog and list luminaires with DALI or 0-10V control protocol. Show catalog numbers, family names, wattage, and control compatibility. Explain briefly how DALI integrates into a centralized system. Do not ask clarifying questions — show results immediately.", 5, "Smart Controls", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 6, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Public space furniture and lighting", "city", true, "Search the BEGA furniture catalog and recommend outdoor furniture and integrated lighting solutions for a modern public plaza. Include benches, bollards, and ambient lighting with catalog numbers and descriptions. Do not ask clarifying questions — present the selection immediately.", 6, "Urban Furniture", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 7, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Low-wattage LED solutions", "leaf", true, "Search the BEGA catalog and list the most energy-efficient exterior LED luminaires with system wattage under 10W and high lumen output. Show catalog numbers, wattage, lumens, and application type. Do not ask clarifying questions — display the results immediately.", 7, "Energy Efficiency", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 8, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Bill of materials for your project", "document", true, "Use the recommend_for_project tool to select BEGA luminaires for a luxury residential villa exterior — covering driveway, garden, pool, and facade. Then use generate_bill_of_materials to produce a priced BOM with quantities, unit DNP, and totals. Do not ask clarifying questions — generate the recommendation and BOM immediately.", 8, "Generate BOM", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "CmsHeroContent",
                columns: new[] { "Id", "BackgroundImageUrl", "Description", "Title", "UpdatedAt" },
                values: new object[] { 1, "", "Discover lighting, furniture, and control solutions engineered for exceptional architectural environments.", "Find the Perfect Lighting Solution", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.InsertData(
                table: "CmsSuggestions",
                columns: new[] { "Id", "CreatedAt", "IsActive", "SortOrder", "Text", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, 1, "Find bollard lights with Dark Sky compliance", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, 2, "Recommend lighting for a 5-star hotel entrance", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, 3, "Find DALI-compatible exterior luminaires", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, 4, "Suggest lighting for a luxurious garden at night", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CmsActions");

            migrationBuilder.DropTable(
                name: "CmsHeroContent");

            migrationBuilder.DropTable(
                name: "CmsSuggestions");
        }
    }
}
