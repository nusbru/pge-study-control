using System.Text.Json.Serialization;
using PgeStudy.Domain;

namespace PgeStudy.Application;

public sealed record MockExamRequest([property: JsonRequired] DateOnly ExamDate, int TotalQuestions,
    bool IsHistorical, int? CorrectAnswers, int? WrongAnswers, string? Feeling, string? Comment,
    DateTimeOffset? StartedAt, DateTimeOffset? EndedAt, Guid? Version)
{
    public MockExamValues ToValues() => new(ExamDate, TotalQuestions, CorrectAnswers, WrongAnswers,
        Feeling, Comment, StartedAt, EndedAt);
}

public sealed record MockExamResponse(Guid Id, DateOnly ExamDate, int TotalQuestions, int? CorrectAnswers,
    int? WrongAnswers, string Status, bool IsHistorical, DateTimeOffset? StartedAt, DateTimeOffset? EndedAt,
    long? DurationSeconds, string? Feeling, string? Comment, Guid Version)
{
    public static MockExamResponse From(MockExam exam) => new(exam.Id, exam.ExamDate, exam.TotalQuestions,
        exam.CorrectAnswers, exam.WrongAnswers, exam.Status, exam.IsHistorical, exam.StartedAt, exam.EndedAt,
        exam.EndedAt.HasValue && exam.StartedAt.HasValue
            ? (long)(exam.EndedAt.Value - exam.StartedAt.Value).TotalSeconds : null,
        exam.Feeling, exam.Comment, exam.Version);
}

public sealed record MockExamPage(IReadOnlyList<MockExamResponse> Records, int TotalPages);
public sealed record MockExamPerformance(int CompletedCount, int CorrectedCount, int TimedCount,
    long TotalDurationSeconds, long? AverageDurationSeconds, Performance Overall,
    IReadOnlyList<MockExamResponse> Recent);

public interface IMockExamRepository
{
    Task<MockExam?> GetAsync(string userId, Guid id, CancellationToken cancellationToken);
    Task<MockExamPage> ListAsync(string userId, int page, CancellationToken cancellationToken);
    Task AddAsync(MockExam exam, CancellationToken cancellationToken);
    Task SaveAsync(CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string userId, Guid id, CancellationToken cancellationToken);
}

public interface IMockExamPerformanceQuery
{
    Task<MockExamPerformance> GetAsync(string userId, DashboardFilter filter, CancellationToken cancellationToken);
}

public sealed class MockExamConflictException : Exception
{
    public MockExamConflictException() : base("O simulado foi alterado. Recarregue a página antes de tentar novamente.") { }
}

public sealed class MockExams(IMockExamRepository repository, TimeProvider clock)
{
    public async Task<MockExamResponse> CreateAsync(string userId, MockExamRequest request, CancellationToken cancellationToken)
    {
        var exam = MockExam.Create(userId, request.IsHistorical, request.ToValues(), clock.GetUtcNow());
        await repository.AddAsync(exam, cancellationToken);
        return MockExamResponse.From(exam);
    }

    public async Task<MockExamResponse?> UpdateAsync(string userId, Guid id, MockExamRequest request, CancellationToken cancellationToken)
    {
        var exam = await repository.GetAsync(userId, id, cancellationToken);
        if (exam is null) return null;
        if (request.Version != exam.Version) throw new MockExamConflictException();
        if (request.IsHistorical != exam.IsHistorical)
            throw new ValidationException("isHistorical", "O modo de registro não pode ser alterado.");
        exam.Update(request.ToValues(), clock.GetUtcNow());
        await repository.SaveAsync(cancellationToken);
        return MockExamResponse.From(exam);
    }

    public async Task<MockExamResponse?> TrackAsync(string userId, Guid id, bool finish, CancellationToken cancellationToken)
    {
        var exam = await repository.GetAsync(userId, id, cancellationToken);
        if (exam is null) return null;
        if (finish) exam.Finish(clock.GetUtcNow());
        else exam.Start(clock.GetUtcNow());
        await repository.SaveAsync(cancellationToken);
        return MockExamResponse.From(exam);
    }
}
