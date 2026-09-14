using Microsoft.EntityFrameworkCore;
using PgeStudy.Application;
using PgeStudy.Domain;

namespace PgeStudy.Infrastructure.Persistence;

public sealed class MockExamRepository(AppDbContext db) : IMockExamRepository
{
    public Task<MockExam?> GetAsync(string userId, Guid id, CancellationToken cancellationToken) =>
        db.MockExams.SingleOrDefaultAsync(exam => exam.UserId == userId && exam.Id == id, cancellationToken);

    public async Task<MockExamPage> ListAsync(string userId, int page, CancellationToken cancellationToken)
    {
        var query = db.MockExams.AsNoTracking().Where(exam => exam.UserId == userId);
        var totalPages = (int)Math.Ceiling(await query.CountAsync(cancellationToken) / 20d);
        if (page > totalPages) return new([], totalPages);
        var exams = await query.OrderByDescending(exam => exam.ExamDate)
            .ThenByDescending(exam => exam.CreatedAt).ThenByDescending(exam => exam.Id)
            .Skip((page - 1) * 20).Take(20).ToListAsync(cancellationToken);
        return new(exams.Select(MockExamResponse.From).ToArray(), totalPages);
    }

    public async Task AddAsync(MockExam exam, CancellationToken cancellationToken)
    {
        db.MockExams.Add(exam);
        await SaveAsync(cancellationToken);
    }

    public async Task SaveAsync(CancellationToken cancellationToken)
    {
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { throw new MockExamConflictException(); }
    }

    public async Task<bool> DeleteAsync(string userId, Guid id, CancellationToken cancellationToken) =>
        await db.MockExams.Where(exam => exam.UserId == userId && exam.Id == id)
            .ExecuteDeleteAsync(cancellationToken) == 1;
}
