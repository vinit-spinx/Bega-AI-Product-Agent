using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BegaProductFinder.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionFunnelStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SessionFunnelStatuses",
                columns: table => new
                {
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FunnelStage = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "query"),
                    IsLead = table.Column<bool>(type: "bit", nullable: false),
                    LeadTemperature = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsFinalized = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    FinalizedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionFunnelStatuses", x => x.SessionId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SessionFunnelStatuses_FunnelStage",
                table: "SessionFunnelStatuses",
                column: "FunnelStage");

            migrationBuilder.CreateIndex(
                name: "IX_SessionFunnelStatuses_IsFinalized",
                table: "SessionFunnelStatuses",
                column: "IsFinalized");

            migrationBuilder.CreateIndex(
                name: "IX_SessionFunnelStatuses_IsLead",
                table: "SessionFunnelStatuses",
                column: "IsLead");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionFunnelStatuses");
        }
    }
}
