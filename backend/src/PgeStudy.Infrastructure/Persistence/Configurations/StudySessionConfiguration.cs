using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PgeStudy.Domain;
using PgeStudy.Infrastructure.Identity;

namespace PgeStudy.Infrastructure.Persistence.Configurations;

public sealed class StudySessionConfiguration : IEntityTypeConfiguration<StudySession>
{
    public void Configure(EntityTypeBuilder<StudySession> builder)
    {
        builder.ToTable("study_sessions", table =>
        {
            table.HasCheckConstraint("session_total_range", "total_questions > 0 AND total_questions <= 1000000");
            table.HasCheckConstraint("session_correct_range", "correct_answers BETWEEN 0 AND 1000000");
            table.HasCheckConstraint("session_wrong_range", "wrong_answers BETWEEN 0 AND 1000000");
            table.HasCheckConstraint("session_counts_consistent", "total_questions = correct_answers + wrong_answers");
            table.HasCheckConstraint("session_question_type", "question_type IN ('JURISPRUDENCE', 'BLACK_LETTER_LAW', 'DOCTRINE', 'UNSPECIFIED')");
        });
        builder.HasKey(session => session.Id);
        builder.Property(session => session.Subject).HasMaxLength(120).IsRequired();
        builder.Property(session => session.SubjectKey).HasMaxLength(240).IsRequired();
        builder.Property(session => session.QuestionType).HasMaxLength(32).IsRequired();
        builder.Property(session => session.QuestionListUrl).HasMaxLength(2048);
        builder.Property(session => session.WrongQuestionListUrl).HasMaxLength(2048);
        builder.Property(session => session.StudyDate).HasColumnType("date");
        builder.Property(session => session.UserId).IsConcurrencyToken();
        builder.HasOne<ApplicationUser>().WithMany().HasForeignKey(session => session.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(session => new { session.UserId, session.StudyDate }).IsDescending(false, true);
        builder.HasIndex(session => new { session.UserId, session.SubjectKey, session.StudyDate });
        builder.HasIndex(session => new { session.UserId, session.QuestionType, session.StudyDate });
    }
}
