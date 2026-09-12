using PgeStudy.Domain;

namespace PgeStudy.Application;

public interface ISessionRepository
{
    Task<StudySession?> GetAsync(string userId, Guid id, CancellationToken cancellationToken);
    Task<SessionPage> ListAsync(string userId, int page, CancellationToken cancellationToken);
    Task AddAsync(StudySession session, CancellationToken cancellationToken);
    Task SaveAsync(CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string userId, Guid id, CancellationToken cancellationToken);
}

public interface IDashboardQuery
{
    Task<DashboardResponse> GetAsync(string userId, DashboardFilter filter, CancellationToken cancellationToken);
}

public sealed class StudySessions(ISessionRepository repository, TimeProvider clock)
{
    public async Task<SessionResponse> CreateAsync(string userId, SessionRequest request, CancellationToken cancellationToken)
    {
        var session = StudySession.Create(userId, request.ToValues(), clock.GetUtcNow().UtcDateTime);
        await repository.AddAsync(session, cancellationToken);
        return SessionResponse.From(session);
    }

    public async Task<SessionResponse?> UpdateAsync(string userId, Guid id, SessionRequest request, CancellationToken cancellationToken)
    {
        var session = await repository.GetAsync(userId, id, cancellationToken);
        if (session is null) return null;
        session.Update(request.ToValues(), clock.GetUtcNow().UtcDateTime);
        await repository.SaveAsync(cancellationToken);
        return SessionResponse.From(session);
    }
}
