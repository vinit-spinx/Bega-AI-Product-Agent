// AZURE IMPLEMENTATION — uncomment and activate when moving to hosted environment.
//
// Required NuGet packages (add to BegaProductFinder.Infrastructure.csproj):
//   <PackageReference Include="Azure.AI.OpenAI" Version="2.*" />
//
// Required configuration keys (set in Azure App Service Application Settings):
//   Embeddings:Provider                  = "azureopenai"
//   Embeddings:AzureOpenAiEndpoint       = "https://<your-resource>.openai.azure.com/"
//   Embeddings:AzureOpenAiApiKey         = "<your-api-key>"
//   Embeddings:AzureOpenAiDeploymentName = "text-embedding-3-small"
//   Embeddings:Dimensions                = 1536
//
// To activate: set the Provider value above and register this class in
// ServiceCollectionExtensions.AddEmbeddingService() — no other code changes needed.

using BegaProductFinder.Core.Interfaces;

namespace BegaProductFinder.Infrastructure.Embeddings;

/// <summary>
/// Azure OpenAI implementation of <see cref="IEmbeddingService"/>.
/// Uses <c>text-embedding-3-small</c> (1536 dimensions) or any configured Azure OpenAI embedding deployment.
/// Activated by setting <c>Embeddings:Provider = "azureopenai"</c> in configuration.
/// </summary>
/// <remarks>
/// This stub is ready for implementation. To complete it:
/// <list type="number">
/// <item><description>Add the <c>Azure.AI.OpenAI</c> NuGet package.</description></item>
/// <item><description>Inject <c>AzureOpenAIClient</c> via the constructor.</description></item>
/// <item><description>Call <c>client.GetEmbeddingClient(deploymentName).GenerateEmbeddingsAsync()</c>.</description></item>
/// <item><description>See README.md §Switching to Azure for full setup steps.</description></item>
/// </list>
/// </remarks>
public sealed class AzureOpenAiEmbeddingService : IEmbeddingService
{
    // Configuration values consumed by this service when implemented:
    //   private readonly AzureOpenAIClient _client;
    //   private readonly string _deploymentName;

    private readonly string _endpoint;
    private readonly string _deploymentName;

    /// <inheritdoc/>
    public int Dimensions { get; }

    public AzureOpenAiEmbeddingService(string endpoint, string deploymentName, int dimensions)
    {
        _endpoint = endpoint;
        _deploymentName = deploymentName;
        Dimensions = dimensions;
    }

    /// <inheritdoc/>
    /// <exception cref="NotImplementedException">
    /// Always thrown — see README.md §Switching to Azure for setup instructions.
    /// </exception>
    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        // Full implementation using Azure.AI.OpenAI:
        //
        // var embeddingClient = _client.GetEmbeddingClient(_deploymentName);
        // var response = await embeddingClient.GenerateEmbeddingAsync(text, cancellationToken: ct);
        // return response.Value.ToFloats().ToArray();

        throw new NotImplementedException(
            "AzureOpenAiEmbeddingService is not yet implemented. " +
            "See README.md §Switching to Azure for activation steps.");
    }

    /// <inheritdoc/>
    /// <exception cref="NotImplementedException">
    /// Always thrown — see README.md §Switching to Azure for setup instructions.
    /// </exception>
    public Task<List<float[]>> EmbedBatchAsync(List<string> texts, CancellationToken ct = default)
    {
        // Full implementation using Azure.AI.OpenAI:
        //
        // var embeddingClient = _client.GetEmbeddingClient(_deploymentName);
        // var response = await embeddingClient.GenerateEmbeddingsAsync(texts, cancellationToken: ct);
        // return response.Value.Select(e => e.ToFloats().ToArray()).ToList();

        throw new NotImplementedException(
            "AzureOpenAiEmbeddingService is not yet implemented. " +
            "See README.md §Switching to Azure for activation steps.");
    }
}
