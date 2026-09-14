using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PgeStudy.Domain;
using PgeStudy.Infrastructure.Identity;

namespace PgeStudy.Infrastructure.Persistence.Configurations;

public sealed class MockExamConfiguration : IEntityTypeConfiguration<MockExam>
{
    public void Configure(EntityTypeBuilder<MockExam> builder)
    {
        builder.ToTable("mock_exams", table =>
        {
            table.HasCheckConstraint("exam_total_range", "total_questions BETWEEN 1 AND 1000000");
            table.HasCheckConstraint("exam_counts", "(correct_answers IS NULL AND wrong_answers IS NULL) OR (correct_answers IS NOT NULL AND wrong_answers IS NOT NULL AND correct_answers >= 0 AND wrong_answers >= 0 AND correct_answers + wrong_answers = total_questions AND status = 'COMPLETED')");
            table.HasCheckConstraint("exam_timing", "(status = 'READY' AND NOT is_historical AND started_at IS NULL AND ended_at IS NULL) OR (status = 'RUNNING' AND NOT is_historical AND started_at IS NOT NULL AND ended_at IS NULL) OR (status = 'COMPLETED' AND ((is_historical AND started_at IS NULL AND ended_at IS NULL) OR (started_at IS NOT NULL AND ended_at IS NOT NULL AND ended_at >= started_at)))");
            table.HasCheckConstraint("exam_feeling", "feeling IS NULL OR feeling IN ('CONFIDENT', 'CALM', 'ANXIOUS', 'TIRED', 'FRUSTRATED')");
        });
        builder.HasKey(exam => exam.Id);
        builder.Property(exam => exam.Version).IsConcurrencyToken();
        builder.Property(exam => exam.UserId).IsConcurrencyToken();
        builder.Property(exam => exam.Status).HasMaxLength(16);
        builder.Property(exam => exam.Feeling).HasMaxLength(16);
        builder.Property(exam => exam.Comment).HasMaxLength(2000);
        builder.HasOne<ApplicationUser>().WithMany().HasForeignKey(exam => exam.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(exam => new { exam.UserId, exam.ExamDate }).IsDescending(false, true);
    }
}
