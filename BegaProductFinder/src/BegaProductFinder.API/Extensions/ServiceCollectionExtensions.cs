using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Infrastructure.Data;
using BegaProductFinder.Infrastructure.Embeddings;
using BegaProductFinder.Infrastructure.Search;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.API.Extensions;

/// <summary>
/// DI extension methods for the swap-architecture services (embeddings and vector search).
/// The concrete implementation registered is determined solely by the <c>Provider</c>
/// configuration value — no code changes are required when switching from local to Azure.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the vector search service based on <c>VectorSearch:Provider</c>.
    /// <list type="bullet">
    /// <item><description><c>"pgvector"</c> → <see cref="PgVectorSearchService"/> (local PostgreSQL)</description></item>
    /// <item><description><c>"azureaisearch"</c> → <see cref="AzureAiSearchService"/> (Azure AI Search stub)</description></item>
    /// </list>
    /// </summary>
    public static IServiceCollection AddVectorSearch(
        this IServiceCollection services,
        IConfiguration config)
    {
        var provider = (config["VectorSearch:Provider"] ?? string.Empty).ToLowerInvariant();

        return provider switch
        {
            "pgvector" =>
                services
                    .AddSingleton<VectorDbContext>(sp =>
                    {
                        var connStr = config.GetConnectionString("Database")
                            ?? throw new InvalidOperationException("ConnectionStrings:Database is required.");
                        var dimensions = config.GetValue<int>("Embeddings:Dimensions", 768);
                        return new VectorDbContext(connStr, dimensions);
                    })
                    .AddScoped<IVectorSearchService, PgVectorSearchService>(),

            "azureaisearch" =>
                services.AddScoped<IVectorSearchService>(_ => new AzureAiSearchService(
                    config["VectorSearch:AzureSearchEndpoint"] ?? string.Empty,
                    config["VectorSearch:AzureSearchIndexName"] ?? "bega-products")),

            _ => throw new InvalidOperationException(
                $"Unknown VectorSearch:Provider '{provider}'. Valid values: 'pgvector', 'azureaisearch'.")
        };
    }

    /// <summary>
    /// Registers the embedding service based on <c>Embeddings:Provider</c>.
    /// Also registers the named HTTP client <c>"Ollama"</c> required by <see cref="OllamaEmbeddingService"/>.
    /// <list type="bullet">
    /// <item><description><c>"ollama"</c> → <see cref="OllamaEmbeddingService"/> (local Ollama)</description></item>
    /// <item><description><c>"azureopenai"</c> → <see cref="AzureOpenAiEmbeddingService"/> (Azure OpenAI stub)</description></item>
    /// </list>
    /// </summary>
    public static IServiceCollection AddEmbeddingService(
        this IServiceCollection services,
        IConfiguration config)
    {
        var provider = (config["Embeddings:Provider"] ?? string.Empty).ToLowerInvariant();
        var dimensions = config.GetValue<int>("Embeddings:Dimensions", 768);

        switch (provider)
        {
            case "ollama":
                var ollamaBaseUrl = config["Embeddings:OllamaBaseUrl"] ?? "http://localhost:11434";
                var ollamaModel = config["Embeddings:OllamaModel"] ?? "nomic-embed-text";

                services.AddHttpClient("Ollama", client =>
                {
                    client.BaseAddress = new Uri(ollamaBaseUrl);
                    client.Timeout = Timeout.InfiniteTimeSpan;
                });

                services.AddSingleton<IEmbeddingService>(sp => new OllamaEmbeddingService(
                    sp.GetRequiredService<IHttpClientFactory>(),
                    ollamaBaseUrl,
                    ollamaModel,
                    dimensions,
                    sp.GetRequiredService<ILogger<OllamaEmbeddingService>>()));
                break;

            case "azureopenai":
                services.AddSingleton<IEmbeddingService>(_ => new AzureOpenAiEmbeddingService(
                    config["Embeddings:AzureOpenAiEndpoint"] ?? string.Empty,
                    config["Embeddings:AzureOpenAiDeploymentName"] ?? string.Empty,
                    dimensions));
                break;

            default:
                throw new InvalidOperationException(
                    $"Unknown Embeddings:Provider '{provider}'. Valid values: 'ollama', 'azureopenai'.");
        }

        return services;
    }
}
