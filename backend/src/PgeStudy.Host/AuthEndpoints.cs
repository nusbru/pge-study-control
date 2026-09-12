using System.Net.Mail;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PgeStudy.Infrastructure.Identity;

namespace PgeStudy.Host;

public sealed record CredentialsRequest(string Email, string Password);
public sealed record CurrentUser(string Id, string Email);
public sealed record CsrfResponse(string Token);

public static class AuthEndpoints
{
    public static void MapAuthentication(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").ValidateCsrf();
        group.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
            TypedResults.Ok(new CsrfResponse(antiforgery.GetAndStoreTokens(context).RequestToken!)));
        group.MapGet("/me", (HttpContext context) => TypedResults.Ok(new CurrentUser(
            context.UserId(), context.User.Identity!.Name!))).RequireAuthorization();
        group.MapPost("/register", RegisterAsync);
        group.MapPost("/login", LoginAsync);
        group.MapPost("/logout", async (SignInManager<ApplicationUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return TypedResults.NoContent();
        }).RequireAuthorization();
    }

    private static Dictionary<string, string[]> Validate(CredentialsRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var email = request.Email?.Trim() ?? "";
        if (email.Length > 254 || !MailAddress.TryCreate(email, out var address)
            || address.Address != email || !address.Host.Contains('.'))
            errors["email"] = ["Informe um e-mail válido."];
        if (request.Password is null || request.Password.Length is < 8 or > 128)
            errors["password"] = ["A senha deve ter entre 8 e 128 caracteres."];
        return errors;
    }

    private static IResult DuplicateEmail() => Results.ValidationProblem(
        new Dictionary<string, string[]> { ["email"] = ["Este e-mail já está cadastrado."] },
        title: "Este e-mail já está cadastrado.");

    private static async Task<IResult> RegisterAsync(CredentialsRequest request, UserManager<ApplicationUser> users)
    {
        var errors = Validate(request);
        if (errors.Count > 0) return Results.ValidationProblem(errors, title: "Revise os campos informados.");
        var email = request.Email.Trim().ToLowerInvariant();
        var user = new ApplicationUser { UserName = email, Email = email };
        try
        {
            var result = await users.CreateAsync(user, request.Password);
            if (result.Succeeded) return Results.Created("/api/auth/me", new CurrentUser(user.Id, email));
            if (result.Errors.Any(error => error.Code is "DuplicateEmail" or "DuplicateUserName")) return DuplicateEmail();
            return Results.ValidationProblem(new Dictionary<string, string[]>
                { ["password"] = ["A senha deve ter entre 8 e 128 caracteres."] }, title: "Revise os campos informados.");
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return DuplicateEmail();
        }
    }

    private static async Task<IResult> LoginAsync(CredentialsRequest request, SignInManager<ApplicationUser> signIn)
    {
        if (Validate(request).Count > 0) return InvalidCredentials();
        var result = await signIn.PasswordSignInAsync(request.Email.Trim().ToLowerInvariant(), request.Password,
            isPersistent: false, lockoutOnFailure: true);
        return result.Succeeded ? Results.NoContent() : InvalidCredentials();
    }

    private static IResult InvalidCredentials() => Results.Problem(statusCode: 401, title: "E-mail ou senha inválidos.");
}
