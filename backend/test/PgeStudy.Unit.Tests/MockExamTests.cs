using PgeStudy.Domain;

namespace PgeStudy.Unit.Tests;

public sealed class MockExamTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 14, 23, 30, 0, TimeSpan.Zero);
    private static MockExamValues Values => new(new DateOnly(2026, 9, 14), 100, null, null, null, null, null, null);

    [Fact]
    public void Tracker_RepeatedCalls_PreserveTimestampsAcrossMidnight()
    {
        var exam = MockExam.Create("user", false, Values, Now);
        Assert.Throws<ValidationException>(() => exam.Finish(Now));
        exam.Start(Now);
        exam.Start(Now.AddMinutes(1));
        exam.Finish(Now.AddHours(2));
        exam.Finish(Now.AddHours(3));
        Assert.Equal(Now, exam.StartedAt);
        Assert.Equal(Now.AddHours(2), exam.EndedAt);
        Assert.Equal(MockExam.Completed, exam.Status);
        Assert.Throws<ValidationException>(() => exam.Start(Now.AddHours(4)));
    }

    [Theory]
    [InlineData(30, null, 30, 70)]
    [InlineData(null, 30, 70, 30)]
    [InlineData(0, null, 0, 100)]
    [InlineData(null, null, null, null)]
    public void Historical_Result_DerivesMissingCount(int? correct, int? wrong, int? expectedCorrect, int? expectedWrong)
    {
        var exam = MockExam.Create("user", true, Values with { CorrectAnswers = correct, WrongAnswers = wrong }, Now);
        Assert.Equal(expectedCorrect, exam.CorrectAnswers);
        Assert.Equal(expectedWrong, exam.WrongAnswers);
        Assert.Null(exam.StartedAt);
        Assert.Equal(MockExam.Completed, exam.Status);
    }

    [Fact]
    public void Update_InvalidData_DoesNotMutateExam()
    {
        var exam = MockExam.Create("user", true, Values, Now);
        var version = exam.Version;
        var invalid = new[] {
            Values with { TotalQuestions = 0 }, Values with { CorrectAnswers = 101 },
            Values with { CorrectAnswers = 10, WrongAnswers = 10 },
            Values with { StartedAt = Now }, Values with { StartedAt = Now, EndedAt = Now.AddSeconds(-1) },
            Values with { Feeling = "INVALID" }, Values with { Comment = new string('x', 2001) }
        };
        foreach (var values in invalid) Assert.Throws<ValidationException>(() => exam.Update(values, Now));
        Assert.Equal(version, exam.Version);
        Assert.Null(exam.CorrectAnswers);
    }

    [Fact]
    public void Tracked_CorrectionRequiresCompletion_AndTimesCannotBeEdited()
    {
        var exam = MockExam.Create("user", false, Values, Now);
        Assert.Throws<ValidationException>(() => exam.Update(Values with { CorrectAnswers = 30 }, Now));
        Assert.Throws<ValidationException>(() => exam.Update(Values with { StartedAt = Now }, Now));
        exam.Start(Now);
        Assert.Throws<ValidationException>(() => exam.Finish(Now.AddSeconds(-1)));
        exam.Finish(Now.AddHours(1));
        exam.Update(Values with { CorrectAnswers = 30, StartedAt = exam.StartedAt, EndedAt = exam.EndedAt }, Now.AddHours(1));
        Assert.Equal(70, exam.WrongAnswers);
    }
}
