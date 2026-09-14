using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PgeStudy.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMockExams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mock_exams",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    exam_date = table.Column<DateOnly>(type: "date", nullable: false),
                    total_questions = table.Column<int>(type: "integer", nullable: false),
                    correct_answers = table.Column<int>(type: "integer", nullable: true),
                    wrong_answers = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    is_historical = table.Column<bool>(type: "boolean", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ended_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    feeling = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mock_exams", x => x.id);
                    table.CheckConstraint("exam_counts", "(correct_answers IS NULL AND wrong_answers IS NULL) OR (correct_answers IS NOT NULL AND wrong_answers IS NOT NULL AND correct_answers >= 0 AND wrong_answers >= 0 AND correct_answers + wrong_answers = total_questions AND status = 'COMPLETED')");
                    table.CheckConstraint("exam_feeling", "feeling IS NULL OR feeling IN ('CONFIDENT', 'CALM', 'ANXIOUS', 'TIRED', 'FRUSTRATED')");
                    table.CheckConstraint("exam_timing", "(status = 'READY' AND NOT is_historical AND started_at IS NULL AND ended_at IS NULL) OR (status = 'RUNNING' AND NOT is_historical AND started_at IS NOT NULL AND ended_at IS NULL) OR (status = 'COMPLETED' AND ((is_historical AND started_at IS NULL AND ended_at IS NULL) OR (started_at IS NOT NULL AND ended_at IS NOT NULL AND ended_at >= started_at)))");
                    table.CheckConstraint("exam_total_range", "total_questions BETWEEN 1 AND 1000000");
                    table.ForeignKey(
                        name: "FK_mock_exams_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mock_exams_user_id_exam_date",
                table: "mock_exams",
                columns: new[] { "user_id", "exam_date" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mock_exams");
        }
    }
}
