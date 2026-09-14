using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using PgeStudy.Domain;
using PgeStudy.Application;

namespace PgeStudy.Host;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        IResult response = exception switch
        {
            ValidationException validation => Results.ValidationProblem(
                new Dictionary<string, string[]> { [validation.Field] = [validation.Message] }, title: validation.Message),
            BadHttpRequestException => Results.Problem(statusCode: 400, title: "Dados inválidos. Revise os campos informados."),
            MockExamConflictException conflict => Results.Problem(statusCode: 409, title: conflict.Message),
            DbUpdateConcurrencyException => Results.Problem(statusCode: 404, title: "Sessão não encontrada."),
            _ => Results.Problem(statusCode: 500, title: "Não foi possível concluir a operação. Tente novamente.")
        };
        if (exception is not (ValidationException or BadHttpRequestException or DbUpdateConcurrencyException or MockExamConflictException))
            logger.LogError(exception, "API request failed: {TraceId}", context.TraceIdentifier);
        await response.ExecuteAsync(context);
        return true;
    }
}
