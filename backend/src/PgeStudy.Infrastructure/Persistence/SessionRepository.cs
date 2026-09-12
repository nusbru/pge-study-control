using Microsoft.EntityFrameworkCore;
using PgeStudy.Application;
using PgeStudy.Domain;

namespace PgeStudy.Infrastructure.Persistence;

public sealed class SessionRepository(AppDbContext db) : ISessionRepository
{
    public Task<StudySession?> GetAsync(string userId, Guid id, CancellationToken cancellationToken) =>
        db.StudySessions.SingleOrDefaultAsync(session => session.Id == id && session.UserId == userId, cancellationToken);

    public async Task<SessionPage> ListAsync(string userId, int page, CancellationToken cancellationToken)
    {
        var query = db.StudySessions.AsNoTracking().Where(session => session.UserId == userId);
        var count = await query.CountAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(count / 20d);
        if (page > totalPages) return new([], totalPages);
        var records = await query.OrderByDescending(session => session.StudyDate)
            .ThenByDescending(session => session.CreatedAt).ThenByDescending(session => session.Id)
            .Skip((page - 1) * 20).Take(20).ToListAsync(cancellationToken);
        return new(records.Select(SessionResponse.From).ToArray(), totalPages);
    }

    public async Task AddAsync(StudySession session, CancellationToken cancellationToken)
    {
        db.StudySessions.Add(session);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveAsync(CancellationToken cancellationToken) => await db.SaveChangesAsync(cancellationToken);

    public async Task<bool> DeleteAsync(string userId, Guid id, CancellationToken cancellationToken) =>
        await db.StudySessions.Where(session => session.Id == id && session.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken) == 1;
}
