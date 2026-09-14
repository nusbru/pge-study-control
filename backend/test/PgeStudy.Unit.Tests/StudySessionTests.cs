using PgeStudy.Application;
using PgeStudy.Domain;

namespace PgeStudy.Unit.Tests;

public sealed class StudySessionTests
{
    [Theory]
    [InlineData(null, 7, 3)]
    [InlineData(10, null, 3)]
    [InlineData(10, 7, null)]
    public void Resolve_TwoCounts_DerivesThird(int? total, int? correct, int? wrong)
    {
        var result = QuestionCounts.Resolve(total, correct, wrong);
        Assert.Equal((10, 7, 3), (result.Total, result.Correct, result.Wrong));
    }

    [Theory]
    [InlineData(10, 7, 4)]
    [InlineData(0, 0, 0)]
    [InlineData(null, 2_147_483_647, 1)]
    [InlineData(10, null, null)]
    [InlineData(10, 11, null)]
    public void Resolve_InvalidCounts_Rejects(int? total, int? correct, int? wrong) =>
        Assert.Throws<ValidationException>(() => QuestionCounts.Resolve(total, correct, wrong));

    [Fact]
    public void Percentage_Midpoint_RoundsLikeBrowser() => Assert.Equal(6.3m, QuestionCounts.Percentage(1, 16));

    [Fact]
    public void Create_RegisteredSubject_StoresReference()
    {
        var values = Values("1000 — Constitucionalismo");
        var session = StudySession.Create("owner", values, DateTime.UtcNow);
        Assert.Equal(values.Subject.Id, session.SubjectId);
        Assert.Same(values.Subject, session.Subject);
    }

    [Fact]
    public void Create_MissingSubject_Rejects()
    {
        var error = Assert.Throws<ValidationException>(() =>
            StudySession.Create("owner", Values("Civil") with { Subject = null! }, DateTime.UtcNow));
        Assert.Equal("subjectId", error.Field);
    }

    [Fact]
    public void Update_InvalidInput_LeavesEntityUnchanged()
    {
        var session = StudySession.Create("owner", Values("Civil"), DateTime.UtcNow);
        Assert.Throws<ValidationException>(() => session.Update(Values("Penal") with { WrongQuestionListUrl = "javascript:alert(1)" }, DateTime.UtcNow));
        Assert.Equal("Civil", session.Subject.Subject);
    }

    [Theory]
    [InlineData("7d", "2026-09-09", "2026-09-03")]
    [InlineData("30d", "2026-09-09", "2026-08-11")]
    [InlineData("all", "0001-01-01", null)]
    public void Parse_InclusivePeriod_ResolvesStart(string period, string today, string? start) =>
        Assert.Equal(start, DashboardFilter.Parse(period, today, "all").Start?.ToString("yyyy-MM-dd"));

    [Theory]
    [InlineData("2025-02-29")]
    [InlineData("0001-01-01")]
    [InlineData("2026-9-9")]
    public void Parse_InvalidDateWindow_Rejects(string today) =>
        Assert.Throws<ValidationException>(() => DashboardFilter.Parse("30d", today, "all"));

    [Fact]
    public void Performance_EmptyAndUnsafeTotals_DistinguishesUnavailableAndOverflow()
    {
        Assert.Null(Performance.From(0, 0, 0).CorrectPercentage);
        Assert.Throws<InvalidOperationException>(() => Performance.From(9_007_199_254_740_992, 0, 0));
    }

    private static SessionValues Values(string subject) => new(new DateOnly(2026, 9, 9), StudySubject.Create(Guid.NewGuid(), subject),
        QuestionTypes.Doctrine, 10, 7, null, null, null);
}
