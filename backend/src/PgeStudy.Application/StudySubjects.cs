using PgeStudy.Domain;

namespace PgeStudy.Application;

public sealed record SubjectResponse(Guid Id, string Subject);

public interface ISubjectRepository
{
    Task<StudySubject?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<SubjectResponse>> ListAsync(CancellationToken cancellationToken);
}
