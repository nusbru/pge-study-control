namespace PgeStudy.Domain;

public sealed record MockExamValues(DateOnly ExamDate, int TotalQuestions, int? CorrectAnswers,
    int? WrongAnswers, string? Feeling, string? Comment, DateTimeOffset? StartedAt, DateTimeOffset? EndedAt);

public sealed class MockExam
{
    public const string Ready = "READY";
    public const string Running = "RUNNING";
    public const string Completed = "COMPLETED";
    public Guid Id { get; private set; }
    public string UserId { get; private set; } = "";
    public DateOnly ExamDate { get; private set; }
    public int TotalQuestions { get; private set; }
    public int? CorrectAnswers { get; private set; }
    public int? WrongAnswers { get; private set; }
    public string Status { get; private set; } = Ready;
    public bool IsHistorical { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? EndedAt { get; private set; }
    public string? Feeling { get; private set; }
    public string? Comment { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public Guid Version { get; private set; }

    private MockExam() { }

    public static MockExam Create(string userId, bool isHistorical, MockExamValues values, DateTimeOffset now)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId);
        var exam = new MockExam { Id = Guid.NewGuid(), UserId = userId, IsHistorical = isHistorical,
            Status = isHistorical ? Completed : Ready, CreatedAt = UtcTime(now) };
        exam.Update(values, now);
        return exam;
    }

    public void Update(MockExamValues values, DateTimeOffset now)
    {
        if (values.ExamDate == default)
            throw new ValidationException("examDate", "Informe uma data válida.");
        if (values.TotalQuestions is < 1 or > 1_000_000)
            throw new ValidationException("totalQuestions", "Informe entre 1 e 1.000.000 questões.");
        QuestionCounts? counts = null;
        if (values.CorrectAnswers.HasValue || values.WrongAnswers.HasValue)
        {
            if (Status != Completed)
                throw new ValidationException("correctAnswers", "Finalize o simulado antes de registrar a correção.");
            counts = QuestionCounts.Resolve(values.TotalQuestions, values.CorrectAnswers, values.WrongAnswers);
        }
        var feeling = string.IsNullOrWhiteSpace(values.Feeling) ? null : values.Feeling.Trim();
        if (feeling is not (null or "CONFIDENT" or "CALM" or "ANXIOUS" or "TIRED" or "FRUSTRATED"))
            throw new ValidationException("feeling", "Selecione um sentimento válido.");
        var comment = string.IsNullOrWhiteSpace(values.Comment) ? null : values.Comment.Trim();
        if (comment?.Length > 2000)
            throw new ValidationException("comment", "Use até 2.000 caracteres no comentário.");
        if (IsHistorical)
        {
            if (values.StartedAt.HasValue != values.EndedAt.HasValue)
                throw new ValidationException("endedAt", "Informe início e fim ou deixe ambos em branco.");
            if (values.EndedAt < values.StartedAt)
                throw new ValidationException("endedAt", "O fim deve ser igual ou posterior ao início.");
        }
        else if (values.StartedAt != StartedAt || values.EndedAt != EndedAt)
            throw new ValidationException("startedAt", "Os horários são registrados pelo cronômetro.");

        ExamDate = values.ExamDate;
        TotalQuestions = values.TotalQuestions;
        CorrectAnswers = counts?.Correct;
        WrongAnswers = counts?.Wrong;
        Feeling = feeling;
        Comment = comment;
        if (IsHistorical)
        {
            StartedAt = values.StartedAt.HasValue ? UtcTime(values.StartedAt.Value) : null;
            EndedAt = values.EndedAt.HasValue ? UtcTime(values.EndedAt.Value) : null;
        }
        Touch(now);
    }

    public void Start(DateTimeOffset now)
    {
        if (Status == Running) return;
        if (Status != Ready)
            throw new ValidationException("status", "Um simulado finalizado não pode ser iniciado novamente.");
        StartedAt = UtcTime(now);
        Status = Running;
        Touch(now);
    }

    public void Finish(DateTimeOffset now)
    {
        if (Status == Completed) return;
        if (Status != Running)
            throw new ValidationException("status", "Inicie o simulado antes de finalizar.");
        if (now < StartedAt)
            throw new ValidationException("endedAt", "O fim deve ser igual ou posterior ao início.");
        EndedAt = UtcTime(now);
        Status = Completed;
        Touch(now);
    }

    private void Touch(DateTimeOffset now)
    {
        UpdatedAt = UtcTime(now);
        Version = Guid.NewGuid();
    }

    // PostgreSQL stores microseconds; responses must round-trip without changing the recorded instant.
    private static DateTimeOffset UtcTime(DateTimeOffset value) =>
        new(value.UtcTicks - value.UtcTicks % TimeSpan.TicksPerMicrosecond, TimeSpan.Zero);
}
