using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BegaProductFinder.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddImageOrientationColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FamilyListPageImageOrientation",
                table: "Products",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FamilyListPageImageOrientation",
                table: "Products");
        }
    }
}
