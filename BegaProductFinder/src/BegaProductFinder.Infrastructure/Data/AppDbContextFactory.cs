using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BegaProductFinder.Infrastructure.Data;

/// <summary>
/// Design-time factory used by <c>dotnet ef migrations add</c> and <c>dotnet ef database update</c>
/// without requiring the API host to be running.
/// The connection string is read from the <c>BEGA_SQL_CONNECTION</c> environment variable,
/// falling back to the standard local developer default.
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    /// <inheritdoc/>
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("BEGA_SQL_CONNECTION")
            ?? "Server=localhost;Database=BegaProductFinder;Trusted_Connection=True;TrustServerCertificate=True;";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
