using PgeStudy.Domain;

namespace PgeStudy.Application;

public sealed record SessionRequest([property: System.Text.Json.Serialization.JsonRequired] DateOnly StudyDate,
    Guid SubjectId, string QuestionType,
    int? TotalQuestions, int? CorrectAnswers, int? WrongAnswers, string? QuestionListUrl, string? WrongQuestionListUrl)
{
    public SessionValues ToValues(StudySubject subject) => new(StudyDate, subject, QuestionType, TotalQuestions,
        CorrectAnswers, WrongAnswers, QuestionListUrl, WrongQuestionListUrl);
}

public sealed record SessionResponse(Guid Id, DateOnly StudyDate, Guid SubjectId, string Subject,
    string QuestionType, int TotalQuestions, int CorrectAnswers, int WrongAnswers,
    string? QuestionListUrl, string? WrongQuestionListUrl, DateTime CreatedAt, DateTime UpdatedAt)
{
    public static SessionResponse From(StudySession session) => new(session.Id, session.StudyDate,
        session.SubjectId, session.Subject.Subject, session.QuestionType, session.TotalQuestions,
        session.CorrectAnswers, session.WrongAnswers, session.QuestionListUrl, session.WrongQuestionListUrl,
        session.CreatedAt, session.UpdatedAt);
}

public sealed record SessionPage(IReadOnlyList<SessionResponse> Records, int TotalPages);
public sealed record Performance(long TotalQuestions, long CorrectAnswers, long WrongAnswers,
    decimal? CorrectPercentage, decimal? WrongPercentage)
{
    public static Performance From(long total, long correct, long wrong)
    {
        const long maxSafeInteger = 9_007_199_254_740_991;
        if (total > maxSafeInteger || correct > maxSafeInteger || wrong > maxSafeInteger)
            throw new InvalidOperationException("Os totais ultrapassam o limite de precisão do cliente.");
        return new(total, correct, wrong, total == 0 ? null : QuestionCounts.Percentage(correct, total),
            total == 0 ? null : QuestionCounts.Percentage(wrong, total));
    }
}
public sealed record SubjectPerformance(string Subject, Guid SubjectId, long TotalQuestions,
    long CorrectAnswers, long WrongAnswers, decimal CorrectPercentage, decimal WrongPercentage);
public sealed record DashboardResponse(Performance Overall, IReadOnlyList<SubjectPerformance> Subjects);

public sealed record DashboardFilter(DateOnly Today, DateOnly? Start, string? QuestionType, Guid? SubjectId = null)
{
    public static DashboardFilter Parse(string? period, string? today, string? questionType, Guid? subjectId = null)
    {
        if (!DateOnly.TryParseExact(today, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None, out var date))
            throw new ValidationException("today", "Informe uma data válida.");
        var days = period switch { "7d" => 7, "90d" => 90, "all" => 0, _ => 30 };
        DateOnly? start;
        try { start = days == 0 ? null : date.AddDays(-(days - 1)); }
        catch (ArgumentOutOfRangeException) { throw new ValidationException("today", "O período ultrapassa o limite mínimo de data."); }
        var type = questionType switch
        {
            "jurisprudence" => QuestionTypes.Jurisprudence,
            "black-letter-law" => QuestionTypes.BlackLetterLaw,
            "doctrine" => QuestionTypes.Doctrine,
            "unspecified" => QuestionTypes.Unspecified,
            _ => null
        };
        return new(date, start, type, subjectId);
    }
}
