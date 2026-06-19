using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// Calls the local Depth Anything V2 sidecar to produce a monocular depth map for a scene image.
/// The depth map is forwarded to Claude as a second vision content block, giving the model
/// explicit surface-distance cues for more accurate placement-map coordinates.
///
/// Gracefully degrades: if the service is unreachable or disabled, returns null and the
/// orchestrator falls back to single-image vision analysis.
/// </summary>
public sealed class DepthAnalysisService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<DepthAnalysisService> _logger;
    private readonly bool _enabled;
    private readonly string _predictUrl;
    private readonly int _timeoutSeconds;

    private static readonly JsonSerializerOptions _json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public DepthAnalysisService(
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<DepthAnalysisService> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
        _enabled = config.GetValue("DepthAnalysis:Enabled", true);
        var baseUrl = (config["DepthAnalysis:BaseUrl"] ?? "http://localhost:8001").TrimEnd('/');
        var path = (config["DepthAnalysis:PredictPath"] ?? "/depth").TrimStart('/');
        _predictUrl = $"{baseUrl}/{path}";
        _timeoutSeconds = config.GetValue("DepthAnalysis:TimeoutSeconds", 30);
    }

    /// <summary>
    /// Sends <paramref name="imageBase64"/> to the Depth Anything V2 sidecar and returns
    /// the depth map as a base64-encoded PNG string, or <c>null</c> if unavailable.
    /// </summary>
    public async Task<string?> GetDepthMapBase64Async(string imageBase64, CancellationToken ct)
    {
        if (!_enabled) return null;
        _logger.LogInformation("Requesting depth analysis from {Url} with timeout {Timeout}s", _predictUrl, _timeoutSeconds);
        try
        {
            using var client = _httpFactory.CreateClient("DepthAnalysis");
            client.Timeout = TimeSpan.FromSeconds(_timeoutSeconds);

            // Match FastAPI request model
            var requestBody = JsonSerializer.Serialize(
                new
                {
                    imageBase64 = imageBase64,
                    mimeType = "image/jpeg",
                    maxDim = 768
                },
                _json);

            using var content = new StringContent(requestBody, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(_predictUrl, content, ct);
            response.EnsureSuccessStatusCode();

            var responseText = await response.Content.ReadAsStringAsync(ct);

            // Content-Type image/* — server returned raw PNG bytes re-encoded as base64
            if (response.Content.Headers.ContentType?.MediaType?.StartsWith("image/") == true)
                return Convert.ToBase64String(Convert.FromBase64String(responseText.Trim()));

            // JSON response — actual Depth Anything V2 response format:
            // { "depthBase64": "...", "mimeType": "image/png", "success": true, "errorMessage": "" }
            var node = JsonNode.Parse(responseText);

            var success = node?["success"]?.GetValue<bool>() ?? true;
            if (!success)
            {
                var errorMsg = node?["errorMessage"]?.GetValue<string>();
                _logger.LogWarning("Depth analysis returned error: {Error}", errorMsg ?? "unknown");
                return null;
            }

            var depthBase64 = node?["depthBase64"]?.GetValue<string>();
            _logger.LogInformation("Depth analysis completed successfully. Depth map size: {Length} bytes", depthBase64?.Length ?? 0);
            if (depthBase64 is null)
            {
                _logger.LogWarning(
                    "Depth analysis response missing 'depthBase64' field. Response: {Body}",
                    responseText.Length > 200 ? responseText[..200] + "..." : responseText);
            }

            // Strip data-URL prefix if present ("data:image/png;base64,...")
            if (depthBase64?.Contains(',') == true)
                depthBase64 = depthBase64[(depthBase64.IndexOf(',') + 1)..];

            return depthBase64;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Depth analysis unavailable ({Url}) — proceeding with single-image vision", _predictUrl);
            return null;
        }
    }
}
