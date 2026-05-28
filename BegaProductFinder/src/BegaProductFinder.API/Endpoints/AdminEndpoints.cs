using BegaProductFinder.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Admin endpoints protected by an <c>X-Admin-Api-Key</c> header.
/// Exposes ingestion pipeline trigger and status reporting.
/// </summary>
public static class AdminEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/admin").WithTags("Admin");

        group.MapPost("/ingest/trigger", TriggerIngestionAsync)
            .WithName("TriggerIngestion")
            .WithSummary("Trigger a full ingestion pipeline run. Requires X-Admin-Api-Key header.");

        group.MapGet("/ingest/status", GetIngestionStatusAsync)
            .WithName("GetIngestionStatus")
            .WithSummary("Return the report from the most recent completed ingestion run.");
    }

    // ── POST /api/admin/ingest/trigger ────────────────────────────────────────

    private static async Task<IResult> TriggerIngestionAsync(
        HttpContext httpContext,
        [FromBody] TriggerIngestionRequest? request,
        IIngestionPipeline ingestionPipeline,
        IConfiguration config,
        ILogger<TriggerIngestionRequest> logger,
        CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config))
            return Results.Unauthorized();

        var jsonPath = request?.ProductJsonPath
            ?? config["Ingestion:ProductJsonPath"]
            ?? string.Empty;

        if (string.IsNullOrWhiteSpace(jsonPath))
            return Results.BadRequest(
                "productJsonPath must be supplied in the request body or configured in Ingestion:ProductJsonPath.");

        if (!File.Exists(jsonPath))
            return Results.BadRequest($"File not found at path: {jsonPath}");

        logger.LogInformation("Admin triggered ingestion pipeline for: {Path}", jsonPath);

        // Run in background — the pipeline is long-running (minutes)
        _ = Task.Run(async () =>
        {
            try
            {
                await ingestionPipeline.RunAsync(jsonPath);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background ingestion failed for: {Path}", jsonPath);
            }
        }, CancellationToken.None);

        return Results.Accepted(value: new
        {
            message = "Ingestion pipeline started in background.",
            productJsonPath = jsonPath
        });
    }

    // ── GET /api/admin/ingest/status ──────────────────────────────────────────

    private static async Task<IResult> GetIngestionStatusAsync(
        HttpContext httpContext,
        IIngestionPipeline ingestionPipeline,
        IConfiguration config,
        CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config))
            return Results.Unauthorized();

        var report = await ingestionPipeline.GetLastReportAsync(ct);
        return Results.Ok(report);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static bool IsAuthorized(HttpContext httpContext, IConfiguration config)
    {
        var expectedKey = config["AdminApiKey"] ?? string.Empty;
        if (string.IsNullOrWhiteSpace(expectedKey))
            return false;

        httpContext.Request.Headers.TryGetValue("X-Admin-Api-Key", out var providedKey);
        return string.Equals(expectedKey, providedKey.ToString(), StringComparison.Ordinal);
    }
}

/// <summary>Optional request body for <c>POST /api/admin/ingest/trigger</c>.</summary>
public sealed record TriggerIngestionRequest(string? ProductJsonPath);
