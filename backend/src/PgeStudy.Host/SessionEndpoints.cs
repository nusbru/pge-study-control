using Microsoft.AspNetCore.Http.HttpResults;
using PgeStudy.Application;

namespace PgeStudy.Host;

public static class SessionEndpoints
{
    public static void MapStudySessions(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sessions").RequireAuthorization().ValidateCsrf();
        group.MapGet("/", async (HttpContext context, ISessionRepository repository, string? page, CancellationToken cancellationToken) =>
            TypedResults.Ok(await repository.ListAsync(context.UserId(),
                int.TryParse(page, out var number) && number > 0 ? number : 1, cancellationToken)));
        group.MapGet("/{id:guid}", async Task<Results<Ok<SessionResponse>, NotFound>>
            (Guid id, HttpContext context, ISessionRepository repository, CancellationToken cancellationToken) =>
        {
            var session = await repository.GetAsync(context.UserId(), id, cancellationToken);
            return session is null ? TypedResults.NotFound() : TypedResults.Ok(SessionResponse.From(session));
        });
        group.MapPost("/", async (SessionRequest request, HttpContext context, StudySessions sessions, CancellationToken cancellationToken) =>
        {
            var session = await sessions.CreateAsync(context.UserId(), request, cancellationToken);
            return TypedResults.Created($"/api/sessions/{session.Id}", session);
        });
        group.MapPut("/{id:guid}", async Task<Results<Ok<SessionResponse>, NotFound>>
            (Guid id, SessionRequest request, HttpContext context, StudySessions sessions, CancellationToken cancellationToken) =>
        {
            var session = await sessions.UpdateAsync(context.UserId(), id, request, cancellationToken);
            return session is null ? TypedResults.NotFound() : TypedResults.Ok(session);
        });
        group.MapDelete("/{id:guid}", async Task<Results<NoContent, NotFound>>
            (Guid id, HttpContext context, ISessionRepository repository, CancellationToken cancellationToken) =>
            await repository.DeleteAsync(context.UserId(), id, cancellationToken) ? TypedResults.NoContent() : TypedResults.NotFound());
    }
}
