using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PgeStudy.Application;
using PgeStudy.Host;
using PgeStudy.Infrastructure.Identity;
using PgeStudy.Infrastructure.Persistence;
using PgeStudy.Integration.Tests.Fixtures;

namespace PgeStudy.Integration.Tests;

public sealed class ApiTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private const string Password = "correct horse";
    private static readonly Guid Constitutionalism = new("98287845-45f8-46db-9d4c-4d4139ded7b1");
    private static readonly Guid ConstituentPower = new("7ae8cde0-ca6e-4698-889f-af340b7fb063");

    [Fact]
    public async Task Subjects_SeedAndRepeatMigrations_PreserveCatalogAndSessionReferences()
    {
        using var anonymous = fixture.Browser();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/subjects")).StatusCode);
        using var browser = await Login();
        var before = (await browser.GetFromJsonAsync<SubjectResponse[]>("/api/subjects"))!;
        Assert.Equal(26, before.Length);
        Assert.Equal(26, before.Select(subject => subject.Id).Distinct().Count());
        Assert.Equal(26, before.Select(subject => subject.Subject).Distinct().Count());
        Assert.All(before, subject => Assert.NotEqual(Guid.Empty, subject.Id));
        Assert.Equal(before.OrderBy(subject => subject.Subject, StringComparer.Ordinal), before);
        Assert.Contains(before, subject => subject.Subject == "5000 — Tributos em Geral e Espécies Tributárias");
        Assert.Contains(before, subject => subject.Subject == "7000 — Introdução ao Direito Ambiental, Bens Ambientais e Princípios");
        var session = await Create(browser, Session());
        var persisted = await browser.GetFromJsonAsync<SessionResponse>($"/api/sessions/{session.Id}");
        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        db.Database.Migrate();
        Assert.Equal(before, (await browser.GetFromJsonAsync<SubjectResponse[]>("/api/subjects"))!);
        Assert.Equal(persisted, await browser.GetFromJsonAsync<SessionResponse>($"/api/sessions/{session.Id}"));
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public async Task Sessions_InvalidSubject_RejectsCreateAndUpdateWithoutChangingSession()
    {
        using var browser = await Login();
        var session = await Create(browser, Session());
        var persisted = await browser.GetFromJsonAsync<SessionResponse>($"/api/sessions/{session.Id}");
        foreach (var id in new[] { Guid.Empty, Guid.NewGuid() })
        {
            var request = Session() with { SubjectId = id };
            foreach (var response in new[]
            {
                await browser.PostAsJsonAsync("/api/sessions", request),
                await browser.PutAsJsonAsync($"/api/sessions/{session.Id}", request)
            })
            {
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
                var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
                Assert.True(problem.GetProperty("errors").TryGetProperty("subjectId", out _));
            }
        }
        foreach (var id in new object?[] { null, "not-a-guid", 1000 })
        {
            var response = await browser.PostAsJsonAsync("/api/sessions", new
            {
                studyDate = "2026-09-09", subjectId = id, questionType = "DOCTRINE", totalQuestions = 10, correctAnswers = 7
            });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
        var missing = await browser.PostAsJsonAsync("/api/sessions", new
        {
            studyDate = "2026-09-09", subject = "Texto livre", questionType = "DOCTRINE", totalQuestions = 10, correctAnswers = 7
        });
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Equal(persisted, await browser.GetFromJsonAsync<SessionResponse>($"/api/sessions/{session.Id}"));
        Assert.Single((await browser.GetFromJsonAsync<SessionPage>("/api/sessions"))!.Records);
    }

    [Fact]
    public async Task Database_SubjectConstraints_RejectInvalidReferencesAndDeletingUsedSubject()
    {
        using var browser = await Login();
        var session = await Create(browser, Session());
        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var nullError = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE study_sessions SET subject_id = NULL WHERE id = {session.Id}"));
        Assert.Equal(PostgresErrorCodes.NotNullViolation, nullError.SqlState);
        var foreignError = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE study_sessions SET subject_id = {Guid.NewGuid()} WHERE id = {session.Id}"));
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, foreignError.SqlState);
        var deleteError = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM study_subjects WHERE id = {session.SubjectId}"));
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, deleteError.SqlState);
        var duplicate = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO study_subjects (id, subject) VALUES ({Guid.NewGuid()}, {session.Subject})"));
        Assert.Equal(PostgresErrorCodes.UniqueViolation, duplicate.SqlState);
    }

    [Fact]
    public async Task Authentication_CookiesAndCsrf_ProtectsRequestsAndLogsOut()
    {
        using var browser = fixture.Browser();
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/sessions")).StatusCode);
        var email = $"auth-{Guid.NewGuid()}@example.com";
        Assert.Equal(HttpStatusCode.BadRequest,
            (await browser.PostAsJsonAsync("/api/auth/register", new { email, password = Password })).StatusCode);
        await SetCsrf(browser);
        Assert.Equal(HttpStatusCode.Created,
            (await browser.PostAsJsonAsync("/api/auth/register", new { email, password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await browser.PostAsJsonAsync("/api/auth/login", new { email, password = "wrong password" })).StatusCode);
        var login = await browser.PostAsJsonAsync("/api/auth/login", new { email, password = Password });
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie"), value => value.StartsWith("pge.identity="));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/", cookie, StringComparison.OrdinalIgnoreCase);
        var me = await browser.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.True(me.Headers.CacheControl!.NoStore);
        Assert.False(me.Headers.Contains("Set-Cookie"));
        Assert.Equal(HttpStatusCode.BadRequest, (await browser.PostAsJsonAsync("/api/sessions", Session())).StatusCode);
        await SetCsrf(browser);
        Assert.Equal(HttpStatusCode.Created, (await browser.PostAsJsonAsync("/api/sessions", Session())).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await browser.PostAsync("/api/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Sessions_ForeignOwner_CannotReadUpdateOrDelete()
    {
        using var owner = await Login();
        using var other = await Login();
        var session = await Create(owner, Session());
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/sessions/{session.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync($"/api/sessions/{session.Id}", Session())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"/api/sessions/{session.Id}")).StatusCode);
        Assert.Empty((await other.GetFromJsonAsync<SessionPage>("/api/sessions"))!.Records);
        var updated = await owner.PutAsJsonAsync($"/api/sessions/{session.Id}", Session() with { SubjectId = ConstituentPower });
        var result = (await updated.Content.ReadFromJsonAsync<SessionResponse>())!;
        Assert.Equal("1002 — Poder Constituinte", result.Subject);
        Assert.Equal(ConstituentPower, result.SubjectId);
        var persisted = (await owner.GetFromJsonAsync<SessionResponse>($"/api/sessions/{session.Id}"))!;
        Assert.Equal(result.SubjectId, persisted.SubjectId);
        Assert.Equal(result.Subject, persisted.Subject);
        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"/api/sessions/{session.Id}")).StatusCode);
    }

    [Fact]
    public async Task Dashboard_WeightedCountsAndFilters_MatchExistingBehavior()
    {
        using var owner = await Login();
        using var other = await Login();
        await Create(owner, Session() with { TotalQuestions = 10, CorrectAnswers = 9 });
        await Create(owner, Session() with { TotalQuestions = 100, CorrectAnswers = 10 });
        await Create(owner, Session() with { SubjectId = ConstituentPower, StudyDate = new DateOnly(2026, 1, 1) });
        await Create(owner, Session() with { SubjectId = ConstituentPower, StudyDate = new DateOnly(2027, 1, 1) });
        await Create(owner, Session() with { SubjectId = ConstituentPower, QuestionType = "JURISPRUDENCE" });
        await Create(other, Session() with { TotalQuestions = 1_000_000, CorrectAnswers = 1_000_000 });
        var dashboard = await owner.GetFromJsonAsync<DashboardResponse>("/api/dashboard?period=7d&today=2026-09-09&questionType=doctrine");
        Assert.Equal(110, dashboard!.Overall.TotalQuestions);
        Assert.Equal(17.3m, dashboard.Overall.CorrectPercentage);
        Assert.Equal("1000 — Constitucionalismo", Assert.Single(dashboard.Subjects).Subject);
        Assert.Equal(Constitutionalism, dashboard.Subjects[0].SubjectId);
        var all = await owner.GetFromJsonAsync<DashboardResponse>("/api/dashboard?period=all&today=2026-09-09&questionType=all");
        Assert.Equal(130, all!.Overall.TotalQuestions);
        var empty = await owner.GetFromJsonAsync<DashboardResponse>("/api/dashboard?period=all&today=0001-01-01");
        Assert.Null(empty!.Overall.CorrectPercentage);
        Assert.Empty(empty.Subjects);
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.GetAsync("/api/dashboard?period=30d&today=0001-01-01")).StatusCode);
    }

    [Fact]
    public async Task Dashboard_SubjectPeriodAndType_IntersectBeforeAggregation()
    {
        using var owner = await Login();
        using var other = await Login();
        await Create(owner, Session() with { TotalQuestions = 10, CorrectAnswers = 9 });
        await Create(owner, Session() with { StudyDate = new DateOnly(2026, 9, 3), TotalQuestions = 100, CorrectAnswers = 10 });
        await Create(owner, Session() with { SubjectId = ConstituentPower });
        await Create(owner, Session() with { QuestionType = "JURISPRUDENCE" });
        await Create(owner, Session() with { StudyDate = new DateOnly(2026, 9, 2) });
        await Create(owner, Session() with { StudyDate = new DateOnly(2026, 9, 10) });
        await Create(other, Session());

        var filtered = await owner.GetFromJsonAsync<DashboardResponse>(
            $"/api/dashboard?period=7d&today=2026-09-09&questionType=doctrine&subjectId={Constitutionalism}");
        Assert.Equal(110, filtered!.Overall.TotalQuestions);
        Assert.Equal(19, filtered.Overall.CorrectAnswers);
        Assert.Equal(91, filtered.Overall.WrongAnswers);
        Assert.Equal(17.3m, filtered.Overall.CorrectPercentage);
        Assert.Equal(Constitutionalism, Assert.Single(filtered.Subjects).SubjectId);

        var allTypes = await owner.GetFromJsonAsync<DashboardResponse>(
            $"/api/dashboard?period=7d&today=2026-09-09&subjectId={Constitutionalism}");
        Assert.Equal(120, allTypes!.Overall.TotalQuestions);
        var allPeriods = await owner.GetFromJsonAsync<DashboardResponse>(
            $"/api/dashboard?period=all&today=2026-09-09&questionType=doctrine&subjectId={Constitutionalism}");
        Assert.Equal(120, allPeriods!.Overall.TotalQuestions);
        var empty = await owner.GetFromJsonAsync<DashboardResponse>(
            $"/api/dashboard?period=7d&today=2026-09-09&questionType=jurisprudence&subjectId={ConstituentPower}");
        Assert.Equal(0, empty!.Overall.TotalQuestions);
        Assert.Null(empty.Overall.CorrectPercentage);
        Assert.Empty(empty.Subjects);
    }

    [Theory]
    [InlineData("/api/dashboard?period=7d&today=2026-09-09&subjectId=invalid")]
    [InlineData("/api/sessions?subjectId=invalid")]
    public async Task SubjectFilter_MalformedId_ReturnsBadRequest(string url)
    {
        using var browser = await Login();
        Assert.Equal(HttpStatusCode.BadRequest, (await browser.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task Sessions_ValidationAndPagination_EnforceContract()
    {
        using var browser = await Login();
        var invalid = await browser.PostAsJsonAsync("/api/sessions", Session() with { WrongAnswers = 9 });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var problem = await invalid.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty("totalQuestions", out _));
        Assert.Equal(HttpStatusCode.BadRequest,
            (await browser.PostAsJsonAsync("/api/sessions", new { subjectId = Constitutionalism, questionType = "DOCTRINE", totalQuestions = 10, correctAnswers = 7 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await browser.PostAsJsonAsync("/api/sessions", Session() with { QuestionType = "UNSPECIFIED" })).StatusCode);
        for (var index = 0; index < 21; index++) await Create(browser, Session() with { StudyDate = new DateOnly(2026, 9, 1).AddDays(index) });
        var first = await browser.GetFromJsonAsync<SessionPage>("/api/sessions?page=1");
        Assert.Equal(20, first!.Records.Count);
        Assert.Equal(2, first.TotalPages);
        var second = await browser.GetFromJsonAsync<SessionPage>("/api/sessions?page=2");
        Assert.Single(second!.Records);
        Assert.True(first.Records[0].StudyDate > second.Records[0].StudyDate);
        Assert.Empty((await browser.GetFromJsonAsync<SessionPage>("/api/sessions?page=2147483647"))!.Records);

        await Create(browser, Session() with { SubjectId = ConstituentPower });
        using var other = await Login();
        await Create(other, Session());
        var filteredFirst = await browser.GetFromJsonAsync<SessionPage>($"/api/sessions?page=1&subjectId={Constitutionalism}");
        Assert.Equal(20, filteredFirst!.Records.Count);
        Assert.Equal(2, filteredFirst.TotalPages);
        Assert.Equal(first.Records.Select(session => session.Id), filteredFirst.Records.Select(session => session.Id));
        var filteredSecond = await browser.GetFromJsonAsync<SessionPage>($"/api/sessions?page=2&subjectId={Constitutionalism}");
        Assert.Equal(second.Records.Single().Id, Assert.Single(filteredSecond!.Records).Id);
        var single = await browser.GetFromJsonAsync<SessionPage>($"/api/sessions?subjectId={ConstituentPower}");
        Assert.Equal(1, single!.TotalPages);
        Assert.Equal(ConstituentPower, Assert.Single(single.Records).SubjectId);
        var empty = await browser.GetFromJsonAsync<SessionPage>($"/api/sessions?subjectId={Guid.NewGuid()}");
        Assert.Equal(0, empty!.TotalPages);
        Assert.Empty(empty.Records);
    }

    [Fact]
    public async Task Registration_ConcurrentNormalizedEmail_OnlyCreatesOneAccount()
    {
        using var first = fixture.Browser();
        using var second = fixture.Browser();
        await SetCsrf(first);
        await SetCsrf(second);
        var email = $"race-{Guid.NewGuid()}@example.com";
        var responses = await Task.WhenAll(
            first.PostAsJsonAsync("/api/auth/register", new { email, password = Password }),
            second.PostAsJsonAsync("/api/auth/register", new { email = email.ToUpperInvariant(), password = Password }));
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Identity_ChangedSecurityStamp_RevokesCookie()
    {
        using var browser = await Login();
        var me = await browser.GetFromJsonAsync<CurrentUser>("/api/auth/me");
        using var scope = fixture.Services.CreateScope();
        var manager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await manager.FindByIdAsync(me!.Id);
        Assert.True((await manager.UpdateSecurityStampAsync(user!)).Succeeded);
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Database_CountConstraint_RejectsOutOfBandInvalidUpdate()
    {
        using var browser = await Login();
        var session = await Create(browser, Session());
        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var error = await Assert.ThrowsAsync<PostgresException>(() =>
            db.Database.ExecuteSqlInterpolatedAsync($"UPDATE study_sessions SET wrong_answers = 100 WHERE id = {session.Id}"));
        Assert.Equal(PostgresErrorCodes.CheckViolation, error.SqlState);
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public async Task Dashboard_CatalogAndBigintTotals_PreservePrecision()
    {
        using var browser = await Login();
        await Create(browser, Session());
        var me = await browser.GetFromJsonAsync<CurrentUser>("/api/auth/me");
        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO study_sessions (id, user_id, study_date, subject_id, question_type,
                total_questions, correct_answers, wrong_answers, created_at, updated_at)
            SELECT gen_random_uuid(), {me!.Id}, DATE '2026-09-09', {ConstituentPower}, 'DOCTRINE',
                1000000, 1000000, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM generate_series(1, 2148)
            """);
        var dashboard = await browser.GetFromJsonAsync<DashboardResponse>("/api/dashboard?period=7d&today=2026-09-09");
        Assert.Equal(2_148_000_010L, dashboard!.Overall.TotalQuestions);
        Assert.Equal(2_148_000_000L, dashboard.Subjects[0].TotalQuestions);
        Assert.Equal(100m, dashboard.Subjects[0].CorrectPercentage);
    }

    private async Task<HttpClient> Login()
    {
        var client = fixture.Browser();
        await SetCsrf(client);
        var credentials = new { email = $"test-{Guid.NewGuid()}@example.com", password = Password };
        (await client.PostAsJsonAsync("/api/auth/register", credentials)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/auth/login", credentials)).EnsureSuccessStatusCode();
        await SetCsrf(client);
        return client;
    }

    [Fact]
    public async Task Identity_PersistedKeys_AuthenticateOnAnotherHost()
    {
        using var browser = fixture.Browser();
        await SetCsrf(browser);
        var credentials = new { email = $"replica-{Guid.NewGuid()}@example.com", password = Password };
        (await browser.PostAsJsonAsync("/api/auth/register", credentials)).EnsureSuccessStatusCode();
        var login = await browser.PostAsJsonAsync("/api/auth/login", credentials);
        login.EnsureSuccessStatusCode();
        var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie"), value => value.StartsWith("pge.identity="));
        using var replica = fixture.Replica();
        using var client = replica.CreateClient();
        client.DefaultRequestHeaders.Add("Cookie", cookie.Split(';')[0]);
        var response = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(credentials.email, (await response.Content.ReadFromJsonAsync<CurrentUser>())!.Email);
    }

    [Fact]
    public async Task Identity_LongPasswordAndLockout_UseIdentitySemantics()
    {
        using var browser = fixture.Browser();
        await SetCsrf(browser);
        var email = $"password-{Guid.NewGuid()}@example.com";
        var password = new string('é', 60) + "A";
        (await browser.PostAsJsonAsync("/api/auth/register", new { email, password })).EnsureSuccessStatusCode();
        for (var attempt = 0; attempt < 5; attempt++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await browser.PostAsJsonAsync("/api/auth/login",
                new { email, password = new string('é', 60) + "B" })).StatusCode);
        }
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await browser.PostAsJsonAsync("/api/auth/login", new { email, password })).StatusCode);
        using var scope = fixture.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByEmailAsync(email);
        Assert.True(await users.IsLockedOutAsync(user!));
        await users.SetLockoutEndDateAsync(user!, DateTimeOffset.UtcNow.AddMinutes(-1));
        Assert.Equal(HttpStatusCode.NoContent,
            (await browser.PostAsJsonAsync("/api/auth/login", new { email, password })).StatusCode);
    }

    private static async Task SetCsrf(HttpClient browser)
    {
        var token = await browser.GetFromJsonAsync<CsrfResponse>("/api/auth/csrf");
        browser.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        browser.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token!.Token);
    }

    [Fact]
    public async Task MockExams_CrudTrackerAndPerformance_RespectOwnershipAndCorrection()
    {
        using var anonymous = fixture.Browser();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/mock-exams")).StatusCode);
        using var browser = await Login();
        using var other = await Login();
        var request = new MockExamRequest(new DateOnly(2026, 9, 14), 100, false, null, null, null, null, null, null, null);
        var created = await browser.PostAsJsonAsync("/api/mock-exams", request);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var exam = (await created.Content.ReadFromJsonAsync<MockExamResponse>())!;
        var path = $"/api/mock-exams/{exam.Id}";
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync(path, request)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsync(path + "/start", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsync(path + "/finish", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await browser.PostAsync(path + "/finish", null)).StatusCode);
        var started = (await (await browser.PostAsync(path + "/start", null)).Content.ReadFromJsonAsync<MockExamResponse>())!;
        var repeated = (await (await browser.PostAsync(path + "/start", null)).Content.ReadFromJsonAsync<MockExamResponse>())!;
        Assert.Equal(started.StartedAt, repeated.StartedAt);
        var finished = (await (await browser.PostAsync(path + "/finish", null)).Content.ReadFromJsonAsync<MockExamResponse>())!;
        Assert.Equal("COMPLETED", finished.Status);
        Assert.NotNull(finished.DurationSeconds);
        Assert.Equal(HttpStatusCode.Conflict, (await browser.PutAsJsonAsync(path, request with { Version = exam.Version })).StatusCode);
        var update = request with { Version = finished.Version, StartedAt = finished.StartedAt, EndedAt = finished.EndedAt,
            CorrectAnswers = 30, Feeling = "CALM", Comment = "Consegui manter o ritmo." };
        var corrected = (await (await browser.PutAsJsonAsync(path, update)).Content.ReadFromJsonAsync<MockExamResponse>())!;
        Assert.Equal(70, corrected.WrongAnswers);
        (await browser.PostAsJsonAsync("/api/mock-exams", request with { IsHistorical = true })).EnsureSuccessStatusCode();
        (await browser.PostAsJsonAsync("/api/mock-exams", request with { IsHistorical = true, TotalQuestions = 10,
            CorrectAnswers = 10, StartedAt = DateTimeOffset.Parse("2026-09-14T10:00:00-03:00"),
            EndedAt = DateTimeOffset.Parse("2026-09-14T11:00:00-03:00") })).EnsureSuccessStatusCode();
        var summary = (await browser.GetFromJsonAsync<MockExamPerformance>("/api/mock-exams/performance?period=7d&today=2026-09-14"))!;
        Assert.Equal(3, summary.CompletedCount);
        Assert.Equal(2, summary.CorrectedCount);
        Assert.Equal(2, summary.TimedCount);
        Assert.Equal(110, summary.Overall.TotalQuestions);
        Assert.Equal(40, summary.Overall.CorrectAnswers);
        Assert.Equal(36.4m, summary.Overall.CorrectPercentage);
        Assert.True(summary.TotalDurationSeconds >= 3600);
        Assert.Equal(2, summary.Recent.Count);
        Assert.Empty((await other.GetFromJsonAsync<MockExamPage>("/api/mock-exams"))!.Records);
        Assert.Equal(0, (await browser.GetFromJsonAsync<MockExamPerformance>("/api/mock-exams/performance?period=7d&today=2026-09-13"))!.CompletedCount);
        Assert.Equal(HttpStatusCode.NoContent, (await browser.DeleteAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await browser.GetAsync(path)).StatusCode);
        browser.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        Assert.Equal(HttpStatusCode.BadRequest, (await browser.PostAsJsonAsync("/api/mock-exams", request)).StatusCode);
    }

    private static SessionRequest Session() => new(new DateOnly(2026, 9, 9), Constitutionalism, "DOCTRINE", 10, 7, null, null, null);
    private static async Task<SessionResponse> Create(HttpClient client, SessionRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/sessions", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SessionResponse>())!;
    }
}
