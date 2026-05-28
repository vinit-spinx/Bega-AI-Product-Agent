using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BegaProductFinder.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChatSessions",
                columns: table => new
                {
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    LastActivityAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MessagesJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "[]"),
                    ContextJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatSessions", x => x.SessionId);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BegaId = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CatalogNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FamilyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FamilySlug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SubFamilyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FamilyListPageImage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FamilyTechImage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LuminaireType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    GroupSlug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    GroupsName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CategoryName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LedWattage = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    WattageW = table.Column<decimal>(type: "decimal(10,4)", nullable: true),
                    SystemWattageW = table.Column<decimal>(type: "decimal(10,4)", nullable: true),
                    LumenOutputLm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    BeamAngleDeg = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    ColorTemperatureJson = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Voltage = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ControlProtocol = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Application = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Distribution = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DynamicLight = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Finish = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LeadTime = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DimensionA = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionAFraction = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionB = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionBFraction = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionC = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionCFraction = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionD = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionDFraction = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionE = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    DimensionEFraction = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    RatingB = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RatingU = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RatingG = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DnpPrice = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    MsrpPrice = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    IsAdaCompliant = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsExpressDelivery = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    ExtraInfo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SocialEnviornmentalHealth = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReplacementCatalogNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProductOptionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TechnicalDocumentUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    SpecDocumentUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.ProductId);
                });

            migrationBuilder.CreateTable(
                name: "ProductAccessories",
                columns: table => new
                {
                    AccessoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    AccessoryName = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductAccessories", x => x.AccessoryId);
                    table.ForeignKey(
                        name: "FK_ProductAccessories_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductChunks",
                columns: table => new
                {
                    ChunkId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    CatalogNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ChunkSource = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ChunkText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PageNumber = table.Column<int>(type: "int", nullable: true),
                    ChunkIndex = table.Column<int>(type: "int", nullable: false),
                    IsEmbedded = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    VectorId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductChunks", x => x.ChunkId);
                    table.ForeignKey(
                        name: "FK_ProductChunks_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductAccessories_ProductId",
                table: "ProductAccessories",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductChunks_CatalogNumber",
                table: "ProductChunks",
                column: "CatalogNumber");

            migrationBuilder.CreateIndex(
                name: "IX_ProductChunks_IsEmbedded",
                table: "ProductChunks",
                column: "IsEmbedded");

            migrationBuilder.CreateIndex(
                name: "IX_ProductChunks_ProductId",
                table: "ProductChunks",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_BegaId",
                table: "Products",
                column: "BegaId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_CatalogNumber",
                table: "Products",
                column: "CatalogNumber");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryName",
                table: "Products",
                column: "CategoryName");

            migrationBuilder.CreateIndex(
                name: "IX_Products_FamilyName",
                table: "Products",
                column: "FamilyName");

            migrationBuilder.CreateIndex(
                name: "IX_Products_GroupSlug",
                table: "Products",
                column: "GroupSlug");

            migrationBuilder.CreateIndex(
                name: "IX_Products_LuminaireType",
                table: "Products",
                column: "LuminaireType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatSessions");

            migrationBuilder.DropTable(
                name: "ProductAccessories");

            migrationBuilder.DropTable(
                name: "ProductChunks");

            migrationBuilder.DropTable(
                name: "Products");
        }
    }
}
