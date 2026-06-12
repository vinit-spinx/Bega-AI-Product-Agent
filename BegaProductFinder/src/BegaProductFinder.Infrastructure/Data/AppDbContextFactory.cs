using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace BegaProductFinder.Infrastructure.Data;

/// <summary>
/// Design-time factory used by <c>dotnet ef migrations add</c> and <c>dotnet ef database update</c>
/// without requiring the API host to be running.
/// Resolution order:
/// 1. <c>BEGA_DB_CONNECTION</c> environment variable
/// 2. <c>ConnectionStrings:Database</c> from appsettings.Development.json (API project)
/// 3. <c>ConnectionStrings:Database</c> from appsettings.json (API project)
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    /// <inheritdoc/>
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("BEGA_DB_CONNECTION");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            // Walk up from Infrastructure project to find the API project's appsettings
            var basePath = FindApiProjectRoot();

            var config = new ConfigurationBuilder()
                .SetBasePath(basePath)
                .AddJsonFile("appsettings.json", optional: true)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .AddEnvironmentVariables()
                .Build();

            connectionString = config.GetConnectionString("Database");
        }

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "No PostgreSQL connection string found. Set BEGA_DB_CONNECTION env var or add " +
                "ConnectionStrings:Database to src/BegaProductFinder.API/appsettings.Development.json.");

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString).UseLowerCaseNamingConvention();

        return new AppDbContext(optionsBuilder.Options);
    }

    private static string FindApiProjectRoot()
    {
        // Start from the assembly location and walk up to find the API project directory
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var apiProject = Path.Combine(dir.FullName, "src", "BegaProductFinder.API");
            if (Directory.Exists(apiProject))
                return apiProject;

            // Also check if we're already inside the solution root
            if (dir.GetFiles("*.sln").Length > 0)
            {
                var candidate = Path.Combine(dir.FullName, "src", "BegaProductFinder.API");
                if (Directory.Exists(candidate))
                    return candidate;
            }

            dir = dir.Parent;
        }

        // Last resort: current working directory
        return Directory.GetCurrentDirectory();
    }
}
