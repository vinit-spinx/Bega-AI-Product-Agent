using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BegaProductFinder.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chatsessions",
                columns: table => new
                {
                    sessionid = table.Column<Guid>(type: "uuid", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    lastactivityat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    messagesjson = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    contextjson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chatsessions", x => x.sessionid);
                });

            migrationBuilder.CreateTable(
                name: "contactinquiries",
                columns: table => new
                {
                    inquiryid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    sessionid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    query = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_contactinquiries", x => x.inquiryid);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    productid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    begaid = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    catalognumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    familyname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    familyslug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    subfamilyname = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    familylistpageimage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    familylistpageimageorientation = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    familytechimage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    luminairetype = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    groupslug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    groupsname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    categoryname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ledwattage = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    wattagew = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    systemwattagew = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    lumenoutputlm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    beamangledeg = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    colortemperaturejson = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    voltage = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    controlprotocol = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    application = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    distribution = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    dynamiclight = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    finish = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    leadtime = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    dimensiona = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensionafraction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensionb = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensionbfraction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensionc = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensioncfraction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensiond = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensiondfraction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensione = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    dimensionefraction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    ratingb = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ratingu = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ratingg = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    dnpprice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    msrpprice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    isadacompliant = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    isexpressdelivery = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    extrainfo = table.Column<string>(type: "text", nullable: false),
                    socialenviornmentalhealth = table.Column<string>(type: "text", nullable: true),
                    replacementcatalognumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    productoptionsjson = table.Column<string>(type: "text", nullable: true),
                    technicaldocumenturl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    specdocumenturl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    producttechnicalspec = table.Column<string>(type: "text", nullable: true),
                    familyextrainfo = table.Column<string>(type: "text", nullable: true),
                    aienrichmentjson = table.Column<string>(type: "text", nullable: true),
                    lastupdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_products", x => x.productid);
                });

            migrationBuilder.CreateTable(
                name: "productaccessories",
                columns: table => new
                {
                    accessoryid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    accessoryname = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    sortorder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_productaccessories", x => x.accessoryid);
                    table.ForeignKey(
                        name: "fk_productaccessories_products_productid",
                        column: x => x.productid,
                        principalTable: "products",
                        principalColumn: "productid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "productchunks",
                columns: table => new
                {
                    chunkid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    catalognumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    chunksource = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    chunktext = table.Column<string>(type: "text", nullable: false),
                    pagenumber = table.Column<int>(type: "integer", nullable: true),
                    chunkindex = table.Column<int>(type: "integer", nullable: false),
                    isembedded = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    vectorid = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_productchunks", x => x.chunkid);
                    table.ForeignKey(
                        name: "fk_productchunks_products_productid",
                        column: x => x.productid,
                        principalTable: "products",
                        principalColumn: "productid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "productprojects",
                columns: table => new
                {
                    projectid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    productid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    tags = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    slug = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    location = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    listingimage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    sortorder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_productprojects", x => x.projectid);
                    table.ForeignKey(
                        name: "fk_productprojects_products_productid",
                        column: x => x.productid,
                        principalTable: "products",
                        principalColumn: "productid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_contactinquiries_email",
                table: "contactinquiries",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "ix_contactinquiries_sessionid",
                table: "contactinquiries",
                column: "sessionid");

            migrationBuilder.CreateIndex(
                name: "ix_productaccessories_productid",
                table: "productaccessories",
                column: "productid");

            migrationBuilder.CreateIndex(
                name: "ix_productchunks_catalognumber",
                table: "productchunks",
                column: "catalognumber");

            migrationBuilder.CreateIndex(
                name: "ix_productchunks_isembedded",
                table: "productchunks",
                column: "isembedded");

            migrationBuilder.CreateIndex(
                name: "ix_productchunks_productid",
                table: "productchunks",
                column: "productid");

            migrationBuilder.CreateIndex(
                name: "ix_productprojects_productid",
                table: "productprojects",
                column: "productid");

            migrationBuilder.CreateIndex(
                name: "ix_products_begaid",
                table: "products",
                column: "begaid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_products_catalognumber",
                table: "products",
                column: "catalognumber");

            migrationBuilder.CreateIndex(
                name: "ix_products_categoryname",
                table: "products",
                column: "categoryname");

            migrationBuilder.CreateIndex(
                name: "ix_products_familyname",
                table: "products",
                column: "familyname");

            migrationBuilder.CreateIndex(
                name: "ix_products_groupslug",
                table: "products",
                column: "groupslug");

            migrationBuilder.CreateIndex(
                name: "ix_products_luminairetype",
                table: "products",
                column: "luminairetype");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chatsessions");

            migrationBuilder.DropTable(
                name: "contactinquiries");

            migrationBuilder.DropTable(
                name: "productaccessories");

            migrationBuilder.DropTable(
                name: "productchunks");

            migrationBuilder.DropTable(
                name: "productprojects");

            migrationBuilder.DropTable(
                name: "products");
        }
    }
}
