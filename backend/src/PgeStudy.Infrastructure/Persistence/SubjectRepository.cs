using Microsoft.EntityFrameworkCore;
using PgeStudy.Application;
using PgeStudy.Domain;

namespace PgeStudy.Infrastructure.Persistence;

public sealed class SubjectRepository(AppDbContext db) : ISubjectRepository
{
    public Task<StudySubject?> GetAsync(Guid id, CancellationToken cancellationToken) =>
        db.StudySubjects.SingleOrDefaultAsync(subject => subject.Id == id, cancellationToken);

    public async Task<IReadOnlyList<SubjectResponse>> ListAsync(CancellationToken cancellationToken) =>
        await db.StudySubjects.AsNoTracking().OrderBy(subject => subject.Subject)
            .Select(subject => new SubjectResponse(subject.Id, subject.Subject)).ToListAsync(cancellationToken);
}
