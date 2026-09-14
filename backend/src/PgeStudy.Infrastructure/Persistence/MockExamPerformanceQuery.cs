using Microsoft.EntityFrameworkCore;
using PgeStudy.Application;
using PgeStudy.Domain;

namespace PgeStudy.Infrastructure.Persistence;

public sealed class MockExamPerformanceQuery(AppDbContext db) : IMockExamPerformanceQuery
{
    public async Task<MockExamPerformance> GetAsync(string userId, DashboardFilter filter, CancellationToken cancellationToken)
    {
        var query = db.MockExams.AsNoTracking().Where(exam => exam.UserId == userId
            && exam.Status == MockExam.Completed && exam.ExamDate <= filter.Today
            && (!filter.Start.HasValue || exam.ExamDate >= filter.Start.Value));
        var totals = await query.GroupBy(_ => 1).Select(group => new
        {
            Completed = group.Count(),
            Corrected = group.Count(exam => exam.CorrectAnswers.HasValue),
            Timed = group.Count(exam => exam.StartedAt.HasValue && exam.EndedAt.HasValue),
            Total = group.Sum(exam => exam.CorrectAnswers.HasValue ? (long)exam.TotalQuestions : 0),
            Correct = group.Sum(exam => (long)(exam.CorrectAnswers ?? 0)),
            Wrong = group.Sum(exam => (long)(exam.WrongAnswers ?? 0)),
            Seconds = group.Sum(exam => exam.StartedAt.HasValue && exam.EndedAt.HasValue
                ? (exam.EndedAt.Value - exam.StartedAt.Value).TotalSeconds : 0)
        }).SingleOrDefaultAsync(cancellationToken);
        var recent = await query.Where(exam => exam.CorrectAnswers.HasValue)
            .OrderByDescending(exam => exam.ExamDate).ThenByDescending(exam => exam.CreatedAt)
            .ThenByDescending(exam => exam.Id).Take(12).ToListAsync(cancellationToken);
        if (totals is null) return new(0, 0, 0, 0, null, Performance.From(0, 0, 0), []);
        return new(totals.Completed, totals.Corrected, totals.Timed, (long)totals.Seconds,
            totals.Timed == 0 ? null : (long)(totals.Seconds / totals.Timed),
            Performance.From(totals.Total, totals.Correct, totals.Wrong),
            recent.AsEnumerable().Reverse().Select(MockExamResponse.From).ToArray());
    }
}
