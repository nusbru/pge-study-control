using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PgeStudy.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStudySubjects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_study_sessions_user_id_subject_key_study_date",
                table: "study_sessions");

            migrationBuilder.DropColumn(
                name: "subject",
                table: "study_sessions");

            migrationBuilder.DropColumn(
                name: "subject_key",
                table: "study_sessions");

            migrationBuilder.AddColumn<Guid>(
                name: "subject_id",
                table: "study_sessions",
                type: "uuid",
                nullable: false);

            migrationBuilder.CreateTable(
                name: "study_subjects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    subject = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_study_subjects", x => x.id);
                    table.CheckConstraint("subject_not_blank", "btrim(subject) <> ''");
                });

            migrationBuilder.CreateIndex(
                name: "IX_study_sessions_subject_id",
                table: "study_sessions",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "IX_study_sessions_user_id_subject_id_study_date",
                table: "study_sessions",
                columns: new[] { "user_id", "subject_id", "study_date" });

            migrationBuilder.CreateIndex(
                name: "IX_study_subjects_subject",
                table: "study_subjects",
                column: "subject",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_study_sessions_study_subjects_subject_id",
                table: "study_sessions",
                column: "subject_id",
                principalTable: "study_subjects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_study_sessions_study_subjects_subject_id",
                table: "study_sessions");

            migrationBuilder.DropIndex(
                name: "IX_study_sessions_subject_id",
                table: "study_sessions");

            migrationBuilder.DropIndex(
                name: "IX_study_sessions_user_id_subject_id_study_date",
                table: "study_sessions");

            migrationBuilder.AddColumn<string>(
                name: "subject",
                table: "study_sessions",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "subject_key",
                table: "study_sessions",
                type: "character varying(240)",
                maxLength: 240,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_study_sessions_user_id_subject_key_study_date",
                table: "study_sessions",
                columns: new[] { "user_id", "subject_key", "study_date" });

            migrationBuilder.Sql("""
                UPDATE study_sessions AS session
                SET subject = catalog.subject, subject_key = lower(catalog.subject)
                FROM study_subjects AS catalog WHERE catalog.id = session.subject_id;
                """);

            migrationBuilder.DropColumn(name: "subject_id", table: "study_sessions");
            migrationBuilder.DropTable(name: "study_subjects");
        }
    }
}
