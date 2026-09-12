using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;

namespace PgeStudy.Host;

public static class EndpointSecurity
{
    public static string UserId(this HttpContext context) =>
        context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new InvalidOperationException("Authenticated user required.");

    public static RouteGroupBuilder ValidateCsrf(this RouteGroupBuilder group)
    {
        group.AddEndpointFilter(async (context, next) =>
        {
            if (!HttpMethods.IsGet(context.HttpContext.Request.Method))
            {
                try
                {
                    await context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>()
                        .ValidateRequestAsync(context.HttpContext);
                }
                catch (AntiforgeryValidationException)
                {
                    return Results.Problem(statusCode: 400, title: "Recarregue a página e tente novamente.",
                        extensions: new Dictionary<string, object?> { ["code"] = "csrf_invalid" });
                }
            }
            return await next(context);
        });
        return group;
    }
}
