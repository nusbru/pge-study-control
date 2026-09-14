using Microsoft.AspNetCore.Http.HttpResults;
using PgeStudy.Application;

namespace PgeStudy.Host;

public static class MockExamEndpoints
{
    public static void MapMockExams(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mock-exams").RequireAuthorization().ValidateCsrf();
        group.MapGet("/", async (HttpContext context, IMockExamRepository repository, string? page, CancellationToken ct) =>
            TypedResults.Ok(await repository.ListAsync(context.UserId(), int.TryParse(page, out var n) && n > 0 ? n : 1, ct)));
        group.MapGet("/performance", async (HttpContext context, IMockExamPerformanceQuery query,
            string? period, string? today, CancellationToken ct) =>
            TypedResults.Ok(await query.GetAsync(context.UserId(), DashboardFilter.Parse(period, today, null), ct)));
        group.MapGet("/{id:guid}", async Task<Results<Ok<MockExamResponse>, NotFound>>
            (Guid id, HttpContext context, IMockExamRepository repository, CancellationToken ct) =>
        {
            var exam = await repository.GetAsync(context.UserId(), id, ct);
            return exam is null ? TypedResults.NotFound() : TypedResults.Ok(MockExamResponse.From(exam));
        });
        group.MapPost("/", async (MockExamRequest request, HttpContext context, MockExams exams, CancellationToken ct) =>
        {
            var exam = await exams.CreateAsync(context.UserId(), request, ct);
            return TypedResults.Created($"/api/mock-exams/{exam.Id}", exam);
        });
        group.MapPut("/{id:guid}", async Task<Results<Ok<MockExamResponse>, NotFound>>
            (Guid id, MockExamRequest request, HttpContext context, MockExams exams, CancellationToken ct) =>
        {
            var exam = await exams.UpdateAsync(context.UserId(), id, request, ct);
            return exam is null ? TypedResults.NotFound() : TypedResults.Ok(exam);
        });
        group.MapPost("/{id:guid}/start", async Task<Results<Ok<MockExamResponse>, NotFound>>
            (Guid id, HttpContext context, MockExams exams, CancellationToken ct) =>
        {
            var exam = await exams.TrackAsync(context.UserId(), id, false, ct);
            return exam is null ? TypedResults.NotFound() : TypedResults.Ok(exam);
        });
        group.MapPost("/{id:guid}/finish", async Task<Results<Ok<MockExamResponse>, NotFound>>
            (Guid id, HttpContext context, MockExams exams, CancellationToken ct) =>
        {
            var exam = await exams.TrackAsync(context.UserId(), id, true, ct);
            return exam is null ? TypedResults.NotFound() : TypedResults.Ok(exam);
        });
        group.MapDelete("/{id:guid}", async Task<Results<NoContent, NotFound>>
            (Guid id, HttpContext context, IMockExamRepository repository, CancellationToken ct) =>
            await repository.DeleteAsync(context.UserId(), id, ct) ? TypedResults.NoContent() : TypedResults.NotFound());
    }
}
