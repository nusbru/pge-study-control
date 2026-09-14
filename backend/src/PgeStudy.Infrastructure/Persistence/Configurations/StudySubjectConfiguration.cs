using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PgeStudy.Domain;

namespace PgeStudy.Infrastructure.Persistence.Configurations;

public sealed class StudySubjectConfiguration : IEntityTypeConfiguration<StudySubject>
{
    public void Configure(EntityTypeBuilder<StudySubject> builder)
    {
        builder.ToTable("study_subjects", table =>
            table.HasCheckConstraint("subject_not_blank", "btrim(subject) <> ''"));
        builder.HasKey(subject => subject.Id);
        builder.Property(subject => subject.Id).ValueGeneratedNever();
        builder.Property(subject => subject.Subject).HasMaxLength(120).IsRequired();
        builder.HasIndex(subject => subject.Subject).IsUnique();
    }
}
