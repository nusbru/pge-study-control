using PgeStudy.Domain;

namespace PgeStudy.Unit.Tests;

public sealed class StudySubjectTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_BlankSubject_Rejects(string? subject) =>
        Assert.Throws<ValidationException>(() => StudySubject.Create(Guid.NewGuid(), subject!));

    [Fact]
    public void Create_EmptyId_Rejects() =>
        Assert.Throws<ValidationException>(() => StudySubject.Create(Guid.Empty, "1000 — Constitucionalismo"));

    [Fact]
    public void Create_LengthLimit_EnforcesBoundary()
    {
        var id = Guid.NewGuid();
        var subject = StudySubject.Create(id, new string('A', 120));
        Assert.Equal(id, subject.Id);
        Assert.Equal(120, subject.Subject.Length);
        Assert.Throws<ValidationException>(() => StudySubject.Create(id, new string('A', 121)));
    }
}
