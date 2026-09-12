using System.Text.RegularExpressions;

namespace PgeStudy.Domain;

public static class QuestionTypes
{
    public const string Jurisprudence = "JURISPRUDENCE";
    public const string BlackLetterLaw = "BLACK_LETTER_LAW";
    public const string Doctrine = "DOCTRINE";
    public const string Unspecified = "UNSPECIFIED";
    public static bool IsEditable(string? value) => value is Jurisprudence or BlackLetterLaw or Doctrine;
}

public sealed record SessionValues(DateOnly StudyDate, string Subject, string QuestionType,
    int? TotalQuestions, int? CorrectAnswers, int? WrongAnswers,
    string? QuestionListUrl, string? WrongQuestionListUrl);

public sealed partial class StudySession
{
    public Guid Id { get; private set; }
    public string UserId { get; private set; } = "";
    public DateOnly StudyDate { get; private set; }
    public string Subject { get; private set; } = "";
    public string SubjectKey { get; private set; } = "";
    public string QuestionType { get; private set; } = "";
    public int TotalQuestions { get; private set; }
    public int CorrectAnswers { get; private set; }
    public int WrongAnswers { get; private set; }
    public string? QuestionListUrl { get; private set; }
    public string? WrongQuestionListUrl { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private StudySession() { }

    public static StudySession Create(string userId, SessionValues values, DateTime now)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);
        var session = new StudySession { Id = Guid.NewGuid(), UserId = userId, CreatedAt = now };
        session.Update(values, now);
        return session;
    }

    public void Update(SessionValues values, DateTime now)
    {
        var subject = Whitespace().Replace(values.Subject ?? "", " ").Trim(' ');
        if (subject.Length is 0 or > 120)
            throw new ValidationException("subject", "Informe um assunto com até 120 caracteres.");
        if (!QuestionTypes.IsEditable(values.QuestionType))
            throw new ValidationException("questionType", "Selecione o tipo de questão.");
        var counts = QuestionCounts.Resolve(values.TotalQuestions, values.CorrectAnswers, values.WrongAnswers);
        var questionsUrl = ValidateUrl(values.QuestionListUrl, "questionListUrl");
        var wrongUrl = ValidateUrl(values.WrongQuestionListUrl, "wrongQuestionListUrl");
        StudyDate = values.StudyDate;
        Subject = subject;
        // Unicode full lowercase expands capital dotted I; .NET simple casing does not.
        SubjectKey = subject.Replace("İ", "i\u0307").ToLowerInvariant();
        QuestionType = values.QuestionType;
        (TotalQuestions, CorrectAnswers, WrongAnswers) = (counts.Total, counts.Correct, counts.Wrong);
        (QuestionListUrl, WrongQuestionListUrl) = (questionsUrl, wrongUrl);
        UpdatedAt = now;
    }

    private static string? ValidateUrl(string? value, string field)
    {
        if (string.IsNullOrEmpty(value)) return null;
        if (value.Length > 2048 || !Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || uri.Scheme is not ("http" or "https") || string.IsNullOrEmpty(uri.Host))
            throw new ValidationException(field, "Informe uma URL HTTP ou HTTPS válida.");
        return value;
    }

    [GeneratedRegex("[\\u0009-\\u000D\\u0020\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+")]
    private static partial Regex Whitespace();
}
