namespace PgeStudy.Domain;

public static class QuestionTypes
{
    public const string Jurisprudence = "JURISPRUDENCE";
    public const string BlackLetterLaw = "BLACK_LETTER_LAW";
    public const string Doctrine = "DOCTRINE";
    public const string Unspecified = "UNSPECIFIED";
    public static bool IsEditable(string? value) => value is Jurisprudence or BlackLetterLaw or Doctrine;
}

public sealed record SessionValues(DateOnly StudyDate, StudySubject Subject, string QuestionType,
    int? TotalQuestions, int? CorrectAnswers, int? WrongAnswers,
    string? QuestionListUrl, string? WrongQuestionListUrl);

public sealed class StudySession
{
    public Guid Id { get; private set; }
    public string UserId { get; private set; } = "";
    public DateOnly StudyDate { get; private set; }
    public Guid SubjectId { get; private set; }
    public StudySubject Subject { get; private set; } = null!;
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
        if (values.Subject is null || values.Subject.Id == Guid.Empty)
            throw new ValidationException("subjectId", "Selecione um assunto cadastrado.");
        if (!QuestionTypes.IsEditable(values.QuestionType))
            throw new ValidationException("questionType", "Selecione o tipo de questão.");
        var counts = QuestionCounts.Resolve(values.TotalQuestions, values.CorrectAnswers, values.WrongAnswers);
        var questionsUrl = ValidateUrl(values.QuestionListUrl, "questionListUrl");
        var wrongUrl = ValidateUrl(values.WrongQuestionListUrl, "wrongQuestionListUrl");
        StudyDate = values.StudyDate;
        Subject = values.Subject;
        SubjectId = values.Subject.Id;
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

}
