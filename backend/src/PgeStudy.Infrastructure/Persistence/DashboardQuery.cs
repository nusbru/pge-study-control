using Microsoft.EntityFrameworkCore;
using PgeStudy.Application;

namespace PgeStudy.Infrastructure.Persistence;

public sealed class DashboardQuery(AppDbContext db) : IDashboardQuery
{
    public async Task<DashboardResponse> GetAsync(string userId, DashboardFilter filter, CancellationToken cancellationToken)
    {
        // One statement gives the subject rows and overall totals the same database snapshot.
        var rows = await db.Database.SqlQuery<DashboardRow>($"""
            WITH filtered AS (
                SELECT * FROM study_sessions
                WHERE user_id = {userId} AND study_date <= {filter.Today}
                  AND ({filter.Start}::date IS NULL OR study_date >= {filter.Start})
                  AND ({filter.QuestionType}::text IS NULL OR question_type = {filter.QuestionType})
            ), latest AS (
                SELECT DISTINCT ON (subject_key) subject_key, subject
                FROM filtered ORDER BY subject_key, study_date DESC, created_at DESC, id DESC
            ), subjects AS (
                SELECT f.subject_key, l.subject, SUM(f.total_questions) AS total,
                       SUM(f.correct_answers) AS correct, SUM(f.wrong_answers) AS wrong
                FROM filtered f JOIN latest l USING (subject_key)
                GROUP BY f.subject_key, l.subject
            ), overall AS (
                SELECT COALESCE(SUM(total_questions), 0)::bigint AS total,
                       COALESCE(SUM(correct_answers), 0)::bigint AS correct,
                       COALESCE(SUM(wrong_answers), 0)::bigint AS wrong FROM filtered
            )
            SELECT s.subject AS "Subject", s.subject_key AS "SubjectKey", s.total AS "Total",
                   s.correct AS "Correct", s.wrong AS "Wrong", o.total AS "OverallTotal",
                   o.correct AS "OverallCorrect", o.wrong AS "OverallWrong"
            FROM overall o LEFT JOIN subjects s ON TRUE
            ORDER BY s.total DESC NULLS LAST, s.subject ASC
            """).ToListAsync(cancellationToken);
        var overall = rows[0];
        return new(Performance.From(overall.OverallTotal, overall.OverallCorrect, overall.OverallWrong),
            rows.Where(row => row.Subject is not null).Select(row =>
            {
                var performance = Performance.From(row.Total!.Value, row.Correct!.Value, row.Wrong!.Value);
                return new SubjectPerformance(row.Subject!, row.SubjectKey!, performance.TotalQuestions,
                    performance.CorrectAnswers, performance.WrongAnswers,
                    performance.CorrectPercentage!.Value, performance.WrongPercentage!.Value);
            }).ToArray());
    }
}

public sealed class DashboardRow
{
    public string? Subject { get; set; }
    public string? SubjectKey { get; set; }
    public long? Total { get; set; }
    public long? Correct { get; set; }
    public long? Wrong { get; set; }
    public long OverallTotal { get; set; }
    public long OverallCorrect { get; set; }
    public long OverallWrong { get; set; }
}
