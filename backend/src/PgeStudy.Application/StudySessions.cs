using PgeStudy.Domain;

namespace PgeStudy.Application;

public interface ISessionRepository
{
    Task<StudySession?> GetAsync(string userId, Guid id, CancellationToken cancellationToken);
    Task<SessionPage> ListAsync(string userId, int page, Guid? subjectId, CancellationToken cancellationToken);
    Task AddAsync(StudySession session, CancellationToken cancellationToken);
    Task SaveAsync(CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string userId, Guid id, CancellationToken cancellationToken);
}

public interface IDashboardQuery
{
    Task<DashboardResponse> GetAsync(string userId, DashboardFilter filter, CancellationToken cancellationToken);
}

public sealed class StudySessions(ISessionRepository repository, ISubjectRepository subjects, TimeProvider clock)
{
    public async Task<SessionResponse> CreateAsync(string userId, SessionRequest request, CancellationToken cancellationToken)
    {
        var subject = await RequireSubjectAsync(request.SubjectId, cancellationToken);
        var session = StudySession.Create(userId, request.ToValues(subject), clock.GetUtcNow().UtcDateTime);
        await repository.AddAsync(session, cancellationToken);
        return SessionResponse.From(session);
    }

    public async Task<SessionResponse?> UpdateAsync(string userId, Guid id, SessionRequest request, CancellationToken cancellationToken)
    {
        var session = await repository.GetAsync(userId, id, cancellationToken);
        if (session is null) return null;
        var subject = await RequireSubjectAsync(request.SubjectId, cancellationToken);
        session.Update(request.ToValues(subject), clock.GetUtcNow().UtcDateTime);
        await repository.SaveAsync(cancellationToken);
        return SessionResponse.From(session);
    }

    private async Task<StudySubject> RequireSubjectAsync(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new ValidationException("subjectId", "Selecione um assunto cadastrado.");
        return await subjects.GetAsync(id, cancellationToken)
            ?? throw new ValidationException("subjectId", "Selecione um assunto cadastrado.");
    }
}
