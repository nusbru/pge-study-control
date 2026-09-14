using Microsoft.EntityFrameworkCore;
using PgeStudy.Domain;

namespace PgeStudy.Infrastructure.Persistence;

public static class SubjectSeed
{
    // Keep these GUIDs stable when extending the catalog: sessions reference them.
    private static readonly (Guid Id, string Subject)[] Subjects =
    [
        (new("98287845-45f8-46db-9d4c-4d4139ded7b1"), "1000 — Constitucionalismo"),
        (new("5c278223-f287-4038-964d-f5d4077a57e0"), "1001 — Normas Constitucionais e Hermenêutica"),
        (new("7ae8cde0-ca6e-4698-889f-af340b7fb063"), "1002 — Poder Constituinte"),
        (new("f5334eed-b09c-46e6-9463-5b2943329b07"), "1003 — Controle de Constitucionalidade"),
        (new("4b32bb17-3288-4948-aa57-56b18bc29712"), "1004 — Teoria Geral dos Direitos Humanos e Fundamentais"),
        (new("e80c39cc-910a-4a22-82c2-1a2a4105e3ea"), "2000 — Introdução ao Direito Administrativo"),
        (new("2e0c0ef0-b642-467e-a3b1-4af8fcd7cc39"), "2001 — Regime Jurídico Administrativo"),
        (new("15c159a4-3e2b-4b07-932b-a7ee7849a423"), "2002 — Poderes Administrativos"),
        (new("8f907fa9-a690-44c0-b97e-12e8766923ad"), "3000 — Lei de Introdução às Normas do Direito Brasileiro"),
        (new("0f53a298-51b6-4431-a0a8-ab883e21a017"), "3001 — Pessoa Natural e Direitos de Personalidade"),
        (new("0021ee3d-12b0-45e8-b8ba-1a5aa68b1047"), "3002 — Pessoas Jurídicas"),
        (new("c19e143e-ed1e-43d1-b7a3-239cc6f0d47b"), "3003 — Domicílio e Bens"),
        (new("3a8d9e8a-1958-4124-b41a-909a74d09b76"), "3004 — Teoria Geral do Negócio Jurídico"),
        (new("6a0baf40-aee5-4772-aa79-8867dad22285"), "3005 — Defeitos do Negócio Jurídico"),
        (new("ef875e67-6cf6-42f2-af5a-57bc917264e5"), "4000 — Introdução e Normas Fundamentais do Processo Civil"),
        (new("b4fa8095-e08f-48fc-bfa7-9c57f6cae74c"), "4001 — Jurisdição"),
        (new("af27f132-8a5b-49c0-abc0-7a7950645cde"), "4002 — Ação"),
        (new("8d2f2c76-569c-48fb-8eb4-a7fdefe993a3"), "4003 — Processo"),
        (new("a9e818d8-0f17-4fef-b460-1a2219c38dab"), "4004 — Sujeitos do Processo"),
        (new("f788d2c1-be00-4783-bb9a-a5e722e36a0c"), "5000 — Tributos em Geral e Espécies Tributárias"),
        (new("a0c9006a-a09d-4d0d-b2bd-f4a7037f2a6e"), "5001 — Fenômeno da Incidência Tributária"),
        (new("a0178f13-e868-4d64-8bcf-fafb5c114a40"), "5002 — Competência e Legislação Tributária"),
        (new("fd9bbed9-1768-4689-9a61-f356646fb558"), "6000 — Introdução ao Direito Financeiro"),
        (new("359335f4-fa25-495e-a41d-d956a1428c19"), "6001 — Orçamento Público"),
        (new("637b1f28-c611-494a-969c-97282842f981"), "7000 — Introdução ao Direito Ambiental, Bens Ambientais e Princípios"),
        (new("0b0121a1-49ec-44a5-a35b-8e0c7699b48f"), "7001 — O Direito Ambiental na Constituição Federal"),
    ];

    public static DbContextOptionsBuilder UseSubjectSeeding(this DbContextOptionsBuilder options) => options
        .UseSeeding((context, _) =>
        {
            var existingIds = context.Set<StudySubject>().Select(subject => subject.Id).ToHashSet();
            AddMissing(context, existingIds);
            context.SaveChanges();
        })
        .UseAsyncSeeding(async (context, _, cancellationToken) =>
        {
            var existingIds = await context.Set<StudySubject>().Select(subject => subject.Id)
                .ToHashSetAsync(cancellationToken);
            AddMissing(context, existingIds);
            await context.SaveChangesAsync(cancellationToken);
        });

    public static DbContextOptionsBuilder<AppDbContext> UseSubjectSeeding(this DbContextOptionsBuilder<AppDbContext> options)
    {
        ((DbContextOptionsBuilder)options).UseSubjectSeeding();
        return options;
    }

    private static void AddMissing(DbContext context, HashSet<Guid> existingIds) =>
        context.Set<StudySubject>().AddRange(Subjects.Where(subject => !existingIds.Contains(subject.Id))
            .Select(subject => StudySubject.Create(subject.Id, subject.Subject)));
}
