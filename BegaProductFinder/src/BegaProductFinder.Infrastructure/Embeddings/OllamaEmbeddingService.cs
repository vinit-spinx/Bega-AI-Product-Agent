using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using BegaProductFinder.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Embeddings;

/// <summary>
/// Generates text embeddings using a locally running Ollama instance.
/// Configured via <c>Embeddings:OllamaBaseUrl</c>, <c>Embeddings:OllamaModel</c>, and <c>Embeddings:Dimensions</c>.
/// Default model: <c>nomic-embed-text</c> — produces 768-dimensional vectors.
/// </summary>
public sealed class OllamaEmbeddingService : IEmbeddingService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _model;
    private readonly ILogger<OllamaEmbeddingService> _logger;

    /// <inheritdoc/>
    public int Dimensions { get; }

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public OllamaEmbeddingService(
        IHttpClientFactory httpClientFactory,
        string ollamaBaseUrl,
        string model,
        int dimensions,
        ILogger<OllamaEmbeddingService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _model = model;
        Dimensions = dimensions;
        _logger = logger;

        // Validate base URL is set at construction time so misconfiguration surfaces immediately
        if (string.IsNullOrWhiteSpace(ollamaBaseUrl))
            throw new InvalidOperationException("Embeddings:OllamaBaseUrl is required when Provider=ollama.");

        // The named client "Ollama" must be registered in DI with BaseAddress set to ollamaBaseUrl
    }

    /// <inheritdoc/>
    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("Ollama");

        var request = new OllamaEmbedRequest { Model = _model, Prompt = text };

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync("/api/embeddings", request, _jsonOptions, ct);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ollama embedding request failed for model {Model}", _model);
            throw;
        }

        var result = await response.Content.ReadFromJsonAsync<OllamaEmbedResponse>(_jsonOptions, ct)
            ?? throw new InvalidOperationException("Ollama returned an empty embedding response.");

        if (result.Embedding is null or { Length: 0 })
            throw new InvalidOperationException($"Ollama returned an empty embedding vector for model {_model}.");

        if (result.Embedding.Length != Dimensions)
        {
            _logger.LogWarning(
                "Ollama returned {Actual} dimensions but {Expected} were configured (Embeddings:Dimensions). " +
                "Update the configuration to match the model.",
                result.Embedding.Length, Dimensions);
        }

        return result.Embedding;
    }

    /// <inheritdoc/>
    /// <remarks>
    /// Ollama's <c>/api/embeddings</c> endpoint processes one text at a time.
    /// This method sends requests sequentially to avoid overwhelming a local instance.
    /// For high-throughput scenarios, switch to the Azure OpenAI provider which supports true batch embedding.
    /// </remarks>
    public async Task<List<float[]>> EmbedBatchAsync(List<string> texts, CancellationToken ct = default)
    {
        var results = new List<float[]>(texts.Count);

        foreach (var text in texts)
        {
            ct.ThrowIfCancellationRequested();
            results.Add(await EmbedAsync(text, ct));
        }

        return results;
    }

    // ── Ollama API DTOs ───────────────────────────────────────────────────────

    private sealed class OllamaEmbedRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("prompt")]
        public string Prompt { get; set; } = string.Empty;
    }

    private sealed class OllamaEmbedResponse
    {
        [JsonPropertyName("embedding")]
        public float[]? Embedding { get; set; }
    }
}
