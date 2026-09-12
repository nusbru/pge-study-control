using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PgeStudy.Domain;
using PgeStudy.Infrastructure.Identity;

namespace PgeStudy.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<StudySession> StudySessions => Set<StudySession>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        builder.Entity<ApplicationUser>().HasIndex(user => user.NormalizedEmail).IsUnique();
        // Keep Identity's model configuration, with the same snake_case convention as application tables.
        foreach (var entity in builder.Model.GetEntityTypes())
        {
            entity.SetTableName(SnakeCase(entity.GetTableName()!));
            foreach (var property in entity.GetProperties()) property.SetColumnName(SnakeCase(property.Name));
        }
    }

    private static string SnakeCase(string name) => string.Concat(name.Select((character, index) =>
        char.IsUpper(character) ? (index > 0 ? "_" : "") + char.ToLowerInvariant(character) : character.ToString()));
}
