using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BegaProductFinder.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteRequestDetailFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Contact",
                table: "ContactInquiries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Designation",
                table: "ContactInquiries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "ContactInquiries",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Message",
                table: "ContactInquiries",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProjectType",
                table: "ContactInquiries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Contact",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Designation",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Message",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "ProjectType",
                table: "ContactInquiries");
        }
    }
}
