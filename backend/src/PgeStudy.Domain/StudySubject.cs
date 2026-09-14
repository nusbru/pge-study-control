namespace PgeStudy.Domain;

public sealed class StudySubject
{
    public Guid Id { get; private set; }
    public string Subject { get; private set; } = "";

    private StudySubject() { }

    public static StudySubject Create(Guid id, string subject)
    {
        if (id == Guid.Empty) throw new ValidationException("subjectId", "Selecione um assunto cadastrado.");
        if (string.IsNullOrWhiteSpace(subject) || subject.Trim().Length > 120)
            throw new ValidationException("subject", "Informe um assunto com até 120 caracteres.");
        return new StudySubject { Id = id, Subject = subject.Trim() };
    }
}
