// AZURE IMPLEMENTATION — uncomment and activate when moving to hosted environment.
//
// Required NuGet packages (add to BegaProductFinder.Infrastructure.csproj):
//   <PackageReference Include="Azure.Search.Documents" Version="11.*" />
//
// Required configuration keys (set in Azure App Service Application Settings):
//   VectorSearch:Provider              = "azureaisearch"
//   VectorSearch:AzureSearchEndpoint   = "https://<your-service>.search.windows.net"
//   VectorSearch:AzureSearchApiKey     = "<your-admin-key>"
//   VectorSearch:AzureSearchIndexName  = "bega-products"
//
// To activate: set the Provider value above and register this class in
// ServiceCollectionExtensions.AddVectorSearch() — no other code changes needed.

using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;

namespace BegaProductFinder.Infrastructure.Search;

/// <summary>
/// Azure AI Search implementation of <see cref="IVectorSearchService"/>.
/// Uses the Azure AI Search vector search API with an HNSW index for cosine similarity.
/// Activated by setting <c>VectorSearch:Provider = "azureaisearch"</c> in configuration.
/// </summary>
/// <remarks>
/// This stub is ready for implementation. To complete it:
/// <list type="number">
/// <item><description>Add the <c>Azure.Search.Documents</c> NuGet package.</description></item>
/// <item><description>Create an Azure AI Search index with a <c>Collection(Edm.Single)</c> vector field.</description></item>
/// <item><description>Use <c>SearchClient.UploadDocumentsAsync</c> for indexing.</description></item>
/// <item><description>Use <c>SearchClient.SearchAsync</c> with <c>VectorSearchOptions</c> for ANN queries.</description></item>
/// <item><description>See README.md §Switching to Azure for full setup steps.</description></item>
/// </list>
/// </remarks>
public sealed class AzureAiSearchService : IVectorSearchService
{
    // Configuration values consumed by this service when implemented:
    //   private readonly SearchClient _searchClient;
    //   private readonly SearchIndexClient _indexClient;
    //   private readonly string _indexName;

    private readonly string _endpoint;
    private readonly string _indexName;

    public AzureAiSearchService(string endpoint, string indexName)
    {
        _endpoint = endpoint;
        _indexName = indexName;
    }

    /// <inheritdoc/>
    /// <exception cref="NotImplementedException">
    /// Always thrown — see README.md §Switching to Azure for setup instructions.
    /// </exception>
    public Task EnsureIndexExistsAsync(CancellationToken ct = default)
    {
        // Full implementation using Azure.Search.Documents:
        //
        // var indexDef = new SearchIndex(_indexName)
        // {
        //     Fields = { ... vector field with VectorSearchProfile ... },
        //     VectorSearch = new VectorSearch
        //     {
        //         Algorithms = { new HnswAlgorithmConfiguration("myHnsw") },
        //         Profiles = { new VectorSearchProfile("myProfile", "myHnsw") }
        //     }
        // };
        // await _indexClient.CreateOrUpdateIndexAsync(indexDef, cancellationToken: ct);

        throw new NotImplementedException(
            "AzureAiSearchService is not yet implemented. " +
            "See README.md §Switching to Azure for activation steps.");
    }

    /// <inheritdoc/>
    /// <exception cref="NotImplementedException">
    /// Always thrown — see README.md §Switching to Azure for setup instructions.
    /// </exception>
    public Task IndexChunkAsync(
        int productId,
        string catalogNumber,
        string chunkSource,
        string chunkText,
        float[] embedding,
        int? pageNumber,
        int chunkIndex,
        CancellationToken ct = default)
    {
        // Full implementation:
        //
        // var doc = new { id = Guid.NewGuid().ToString(), product_id = productId,
        //     catalog_number = catalogNumber, chunk_source = chunkSource,
        //     chunk_text = chunkText, embedding = embedding,
        //     page_number = pageNumber, chunk_index = chunkIndex };
        // await _searchClient.UploadDocumentsAsync(new[] { doc }, cancellationToken: ct);

        throw new NotImplementedException(
            "AzureAiSearchService is not yet implemented. " +
            "See README.md §Switching to Azure for activation steps.");
    }

    /// <inheritdoc/>
    /// <exception cref="NotImplementedException">
    /// Always thrown — see README.md §Switching to Azure for setup instructions.
    /// </exception>
    public Task<List<VectorSearchResult>> SearchAsync(
        float[] queryVector,
        int topK = 10,
        int[]? filterProductIds = null,
        CancellationToken ct = default)
    {
        // Full implementation:
        //
        // var vectorQuery = new VectorizedQuery(queryVector)
        // {
        //     KNearestNeighborsCount = topK,
        //     Fields = { "embedding" }
        // };
        // var options = new SearchOptions { VectorSearch = new() { Queries = { vectorQuery } } };
        // if (filterProductIds?.Length > 0)
        //     options.Filter = string.Join(" or ", filterProductIds.Select(id => $"product_id eq {id}"));
        // var response = await _searchClient.SearchAsync<SearchDocument>(null, options, ct);
        // return response.Value.GetResults().Select(r => new VectorSearchResult(...)).ToList();

        throw new NotImplementedException(
            "AzureAiSearchService is not yet implemented. " +
            "See README.md §Switching to Azure for activation steps.");
    }

    /// <inheritdoc/>
    /// <exception cref="NotImplementedException">
    /// Always thrown — see README.md §Switching to Azure for setup instructions.
    /// </exception>
    public Task DeleteByProductIdAsync(int productId, CancellationToken ct = default)
    {
        // Full implementation:
        //
        // var filter = $"product_id eq {productId}";
        // var options = new SearchOptions { Filter = filter, Select = { "id" } };
        // var results = await _searchClient.SearchAsync<SearchDocument>("*", options, ct);
        // var ids = results.Value.GetResults().Select(r => r.Document["id"]).ToList();
        // await _searchClient.DeleteDocumentsAsync("id", ids, cancellationToken: ct);

        throw new NotImplementedException(
            "AzureAiSearchService is not yet implemented. " +
            "See README.md §Switching to Azure for activation steps.");
    }

    /// <inheritdoc/>
    public Task<bool> HealthCheckAsync(CancellationToken ct = default)
        => Task.FromResult(false); // Returns false until implemented — no exception thrown to avoid startup failures
}
