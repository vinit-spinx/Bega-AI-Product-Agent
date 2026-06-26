using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// A bounding box (percent of image, 0–100, top-left origin) around the bright-green outline
/// drawn by the area-marking sidecar. Computed directly from pixel data so placement
/// coordinates can be constrained numerically instead of relying on a vision model to
/// visually estimate where a polygon outline falls.
/// </summary>
public sealed record AreaBoundingBox(double XMinPct, double XMaxPct, double YMinPct, double YMaxPct);

/// <summary>The annotated image returned by the sidecar plus the outline's detected bounding box.</summary>
public sealed record AreaMarkResult(string ImageBase64, AreaBoundingBox? BoundingBox);

/// <summary>
/// Calls the local Florence-2 + SAM2 sidecar to highlight the image region matching a
/// derived area label (e.g. "staircase, stairs, steps"). The returned annotated image
/// (original scene with the matched region outlined in green) is forwarded to Claude as a
/// second vision content block for visual confirmation, and its outline's bounding box is
/// computed locally so placement markers can be constrained to exact numeric coordinates
/// rather than left to the model's pixel-level guesswork.
///
/// Gracefully degrades: if the service is unreachable, disabled, or no area label could be
/// derived from the user's message, returns null and the orchestrator falls back to
/// single-image vision analysis.
/// </summary>
public sealed class AreaMarkingService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<AreaMarkingService> _logger;
    private readonly bool _enabled;
    private readonly string _markAreaUrl;
    private readonly int _timeoutSeconds;

    private static readonly JsonSerializerOptions _json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public AreaMarkingService(
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<AreaMarkingService> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
        _enabled = config.GetValue("AreaMarking:Enabled", true);
        var baseUrl = (config["AreaMarking:BaseUrl"] ?? "http://localhost:8010").TrimEnd('/');
        var path = (config["AreaMarking:MarkAreaPath"] ?? "/mark-area").TrimStart('/');
        _markAreaUrl = $"{baseUrl}/{path}";
        _timeoutSeconds = config.GetValue("AreaMarking:TimeoutSeconds", 30);
    }

    /// <summary>
    /// Sends <paramref name="imageBase64"/> and a Florence-2-friendly <paramref name="query"/>
    /// to the area-marking sidecar and returns the annotated image plus the detected outline
    /// bounding box, or <c>null</c> if unavailable, disabled, or no query was derivable.
    /// </summary>
    public async Task<AreaMarkResult?> GetMarkedAreaAsync(string imageBase64, string? query, CancellationToken ct)
    {
        if (!_enabled || string.IsNullOrWhiteSpace(query)) return null;
        _logger.LogInformation("Requesting area marking from {Url} for query '{Query}'", _markAreaUrl, query);
        try
        {
            using var client = _httpFactory.CreateClient("AreaMarking");
            client.Timeout = TimeSpan.FromSeconds(_timeoutSeconds);

            var requestBody = JsonSerializer.Serialize(
                new { imageBase64 = imageBase64, query = query },
                _json);

            using var content = new StringContent(requestBody, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(_markAreaUrl, content, ct);
            response.EnsureSuccessStatusCode();

            var responseText = await response.Content.ReadAsStringAsync(ct);
            var node = JsonNode.Parse(responseText);
            var markedBase64 = node?["imageBase64"]?.GetValue<string>();

            if (markedBase64 is null)
            {
                _logger.LogWarning(
                    "Area marking response missing 'imageBase64' field. Response: {Body}",
                    responseText.Length > 200 ? responseText[..200] + "..." : responseText);
                return null;
            }

            // Strip data-URL prefix if present ("data:image/png;base64,...")
            if (markedBase64.Contains(','))
                markedBase64 = markedBase64[(markedBase64.IndexOf(',') + 1)..];

            _logger.LogInformation("Area marking completed successfully. Marked image size: {Length} bytes", markedBase64.Length);

            AreaBoundingBox? boundingBox = null;
            try
            {
                boundingBox = DetectGreenOutlineBoundingBox(Convert.FromBase64String(markedBase64));
                if (boundingBox is not null)
                    _logger.LogDebug("Detected green outline bounding box: x {XMin}-{XMax}, y {YMin}-{YMax}",
                        boundingBox.XMinPct, boundingBox.XMaxPct, boundingBox.YMinPct, boundingBox.YMaxPct);
                else
                    _logger.LogDebug("No reliable green outline detected in marked-area image — markers will fall back to band heuristics");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decode marked-area image for outline detection");
            }

            return new AreaMarkResult(markedBase64, boundingBox);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Area marking unavailable ({Url}) — proceeding with single-image vision", _markAreaUrl);
            return null;
        }
    }

    /// <summary>
    /// Scans the decoded image for bright-green outline pixels (the SAM2 segmentation
    /// boundary) and returns a percent-of-image bounding box. Coordinates are trimmed to the
    /// 1st/99th percentile on each axis so a handful of stray noise pixels elsewhere in the
    /// image can't blow out the box. Two sanity guards protect against false positives from
    /// sunlit foliage or other naturally green surfaces: too few matching pixels (no real
    /// outline found) or implausibly many (the "outline" is actually a filled natural-green
    /// region, not a thin contour line) both return null so the caller falls back to the
    /// prompt's band heuristics instead of trusting a contaminated box.
    /// </summary>
    private static AreaBoundingBox? DetectGreenOutlineBoundingBox(byte[] imageBytes)
    {
        using var image = Image.Load<Rgba32>(imageBytes);
        var width = image.Width;
        var height = image.Height;

        var xs = new List<int>();
        var ys = new List<int>();

        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < accessor.Height; y++)
            {
                var row = accessor.GetRowSpan(y);
                for (var x = 0; x < row.Length; x++)
                {
                    var p = row[x];
                    if (IsOutlineGreen(p.R, p.G, p.B))
                    {
                        xs.Add(x);
                        ys.Add(y);
                    }
                }
            }
        });

        const int minMatchedPixels = 20;
        if (xs.Count < minMatchedPixels) return null;

        // A real outline is a thin contour line — it should never cover more than a small
        // fraction of total pixels. If matches blow past that, it's almost certainly sunlit
        // foliage or another false-positive surface being misread as the outline color.
        const double maxMatchedPixelFraction = 0.06;
        if (xs.Count > width * height * maxMatchedPixelFraction) return null;

        xs.Sort();
        ys.Sort();

        var xTrim = xs.Count / 100;
        var yTrim = ys.Count / 100;
        var minX = xs[xTrim];
        var maxX = xs[xs.Count - 1 - xTrim];
        var minY = ys[yTrim];
        var maxY = ys[ys.Count - 1 - yTrim];

        return new AreaBoundingBox(
            Math.Round(minX * 100.0 / width, 1),
            Math.Round(maxX * 100.0 / width, 1),
            Math.Round(minY * 100.0 / height, 1),
            Math.Round(maxY * 100.0 / height, 1));
    }

    /// <summary>Matches the bright neon-green (~#00FF00) used for the SAM2 outline, not natural foliage greens.</summary>
    private static bool IsOutlineGreen(byte r, byte g, byte b) =>
        g >= 210 && r <= 90 && b <= 90 && (g - r) >= 130 && (g - b) >= 130;
}
