using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BegaProductFinder.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteRequestFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BomReportJson",
                table: "ContactInquiries",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Company",
                table: "ContactInquiries",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShortlistJson",
                table: "ContactInquiries",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "ContactInquiries",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "inquiry");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BomReportJson",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Company",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "ShortlistJson",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "ContactInquiries");
        }
    }
}
