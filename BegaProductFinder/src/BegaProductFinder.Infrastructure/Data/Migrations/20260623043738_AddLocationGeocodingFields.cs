using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BegaProductFinder.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationGeocodingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "ContactInquiries",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "ContactInquiries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CountryCode",
                table: "ContactInquiries",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "ContactInquiries",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "ContactInquiries",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "CountryCode",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "ContactInquiries");
        }
    }
}
