using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Admin endpoints protected by an <c>X-Admin-Api-Key</c> header.
/// Exposes ingestion pipeline trigger, status reporting, and CMS content management.
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

        // ── CMS: Actions ──────────────────────────────────────────────────────
        var cms = group.MapGroup("/cms");

        cms.MapGet("/actions", GetAllCmsActionsAsync).WithName("AdminGetCmsActions");
        cms.MapPost("/actions", CreateCmsActionAsync).WithName("AdminCreateCmsAction");
        cms.MapPatch("/actions/{id:int}", UpdateCmsActionAsync).WithName("AdminUpdateCmsAction");
        cms.MapDelete("/actions/{id:int}", DeleteCmsActionAsync).WithName("AdminDeleteCmsAction");
        cms.MapPost("/actions/reorder", ReorderCmsActionsAsync).WithName("AdminReorderCmsActions");

        // ── CMS: Suggestions ──────────────────────────────────────────────────
        cms.MapGet("/suggestions", GetAllCmsSuggestionsAsync).WithName("AdminGetCmsSuggestions");
        cms.MapPost("/suggestions", CreateCmsSuggestionAsync).WithName("AdminCreateCmsSuggestion");
        cms.MapPatch("/suggestions/{id:int}", UpdateCmsSuggestionAsync).WithName("AdminUpdateCmsSuggestion");
        cms.MapDelete("/suggestions/{id:int}", DeleteCmsSuggestionAsync).WithName("AdminDeleteCmsSuggestion");
        cms.MapPost("/suggestions/reorder", ReorderCmsSuggestionsAsync).WithName("AdminReorderCmsSuggestions");

        // ── CMS: Hero Content ─────────────────────────────────────────────────
        cms.MapGet("/hero-content", GetCmsHeroContentAsync).WithName("AdminGetCmsHeroContent");
        cms.MapPut("/hero-content", SaveCmsHeroContentAsync).WithName("AdminSaveCmsHeroContent");
        cms.MapPost("/upload-image", UploadImageAsync).WithName("AdminUploadImage")
            .DisableAntiforgery();

        // ── Inquiries ─────────────────────────────────────────────────────────
        cms.MapGet("/inquiries", GetInquiriesAsync).WithName("AdminGetInquiries");
        cms.MapDelete("/inquiries/{id:int}", DeleteInquiryAsync).WithName("AdminDeleteInquiry");

    }

    // ── CMS Actions ───────────────────────────────────────────────────────────

    private static async Task<IResult> GetAllCmsActionsAsync(
        HttpContext httpContext, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var actions = await db.CmsActions.AsNoTracking().OrderBy(a => a.SortOrder).ToListAsync(ct);
        return Results.Ok(actions);
    }

    private static async Task<IResult> CreateCmsActionAsync(
        HttpContext httpContext, [FromBody] CmsActionUpsertRequest req,
        AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var now = DateTime.UtcNow;
        var action = new CmsAction
        {
            Title = req.Title, Description = req.Description, Prompt = req.Prompt,
            Icon = req.Icon, IsActive = req.IsActive, IsFeatured = req.IsFeatured,
            SortOrder = req.SortOrder, CreatedAt = now, UpdatedAt = now,
        };
        db.CmsActions.Add(action);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/cms/actions/{action.Id}", action);
    }

    private static async Task<IResult> UpdateCmsActionAsync(
        int id, HttpContext httpContext, [FromBody] CmsActionUpsertRequest req,
        AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var action = await db.CmsActions.FindAsync([id], ct);
        if (action is null) return Results.NotFound();
        action.Title = req.Title; action.Description = req.Description;
        action.Prompt = req.Prompt; action.Icon = req.Icon;
        action.IsActive = req.IsActive; action.IsFeatured = req.IsFeatured;
        action.SortOrder = req.SortOrder; action.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(action);
    }

    private static async Task<IResult> DeleteCmsActionAsync(
        int id, HttpContext httpContext, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var action = await db.CmsActions.FindAsync([id], ct);
        if (action is null) return Results.NotFound();
        db.CmsActions.Remove(action);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ReorderCmsActionsAsync(
        HttpContext httpContext, [FromBody] ReorderRequest req,
        AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var actions = await db.CmsActions.Where(a => req.Ids.Contains(a.Id)).ToListAsync(ct);
        for (var i = 0; i < req.Ids.Count; i++)
        {
            var action = actions.FirstOrDefault(a => a.Id == req.Ids[i]);
            if (action is not null) { action.SortOrder = i + 1; action.UpdatedAt = DateTime.UtcNow; }
        }
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    // ── CMS Suggestions ───────────────────────────────────────────────────────

    private static async Task<IResult> GetAllCmsSuggestionsAsync(
        HttpContext httpContext, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var suggestions = await db.CmsSuggestions.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(ct);
        return Results.Ok(suggestions);
    }

    private static async Task<IResult> CreateCmsSuggestionAsync(
        HttpContext httpContext, [FromBody] CmsSuggestionUpsertRequest req,
        AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var now = DateTime.UtcNow;
        var suggestion = new CmsSuggestion
        {
            Text = req.Text, IsActive = req.IsActive, SortOrder = req.SortOrder,
            CreatedAt = now, UpdatedAt = now,
        };
        db.CmsSuggestions.Add(suggestion);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/admin/cms/suggestions/{suggestion.Id}", suggestion);
    }

    private static async Task<IResult> UpdateCmsSuggestionAsync(
        int id, HttpContext httpContext, [FromBody] CmsSuggestionUpsertRequest req,
        AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var suggestion = await db.CmsSuggestions.FindAsync([id], ct);
        if (suggestion is null) return Results.NotFound();
        suggestion.Text = req.Text; suggestion.IsActive = req.IsActive;
        suggestion.SortOrder = req.SortOrder; suggestion.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(suggestion);
    }

    private static async Task<IResult> DeleteCmsSuggestionAsync(
        int id, HttpContext httpContext, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var suggestion = await db.CmsSuggestions.FindAsync([id], ct);
        if (suggestion is null) return Results.NotFound();
        db.CmsSuggestions.Remove(suggestion);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ReorderCmsSuggestionsAsync(
        HttpContext httpContext, [FromBody] ReorderRequest req,
        AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var suggestions = await db.CmsSuggestions.Where(s => req.Ids.Contains(s.Id)).ToListAsync(ct);
        for (var i = 0; i < req.Ids.Count; i++)
        {
            var s = suggestions.FirstOrDefault(x => x.Id == req.Ids[i]);
            if (s is not null) { s.SortOrder = i + 1; s.UpdatedAt = DateTime.UtcNow; }
        }
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    // ── CMS Hero Content ──────────────────────────────────────────────────────

    private static async Task<IResult> GetCmsHeroContentAsync(
        HttpContext httpContext, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var hero = await db.CmsHeroContent.AsNoTracking().FirstOrDefaultAsync(ct);
        return Results.Ok(hero ?? new CmsHeroContent { Id = 1, Title = "Find the Perfect Lighting Solution", Description = "", BackgroundImageUrl = "", UpdatedAt = DateTime.UtcNow });
    }

    private static async Task<IResult> SaveCmsHeroContentAsync(
        HttpContext httpContext, [FromBody] CmsHeroUpsertRequest req,
        AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var hero = await db.CmsHeroContent.FirstOrDefaultAsync(ct);
        if (hero is null)
        {
            hero = new CmsHeroContent { Id = 1 };
            db.CmsHeroContent.Add(hero);
        }
        hero.Title = req.Title; hero.Description = req.Description;
        hero.BackgroundImageUrl = req.BackgroundImageUrl; hero.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(hero);
    }

    // ── Image Upload (hero background) ───────────────────────────────────────

    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private static readonly string[] AllowedImageContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxUploadSizeBytes = 5 * 1024 * 1024; // 5 MB

    private static async Task<IResult> UploadImageAsync(
        HttpContext httpContext, IConfiguration config, IWebHostEnvironment env,
        IFormFile? file, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();

        if (file is null || file.Length == 0)
            return Results.BadRequest(new { error = "No file was uploaded." });

        if (file.Length > MaxUploadSizeBytes)
            return Results.BadRequest(new { error = "File exceeds the 5MB size limit." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(ext) || !AllowedImageContentTypes.Contains(file.ContentType))
            return Results.BadRequest(new { error = "Only JPG, PNG, and WEBP images are allowed." });

        var webRoot = string.IsNullOrEmpty(env.WebRootPath)
            ? Path.Combine(env.ContentRootPath, "wwwroot")
            : env.WebRootPath;
        var uploadsDir = Path.Combine(webRoot, "uploads", "hero");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, ct);
        }

        var url = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}/uploads/hero/{fileName}";
        return Results.Ok(new { url });
    }

    // ── Inquiries ─────────────────────────────────────────────────────────────

    private static async Task<IResult> GetInquiriesAsync(
        HttpContext httpContext, AppDbContext db, IConfiguration config,
        CancellationToken ct,
        int page = 1, int pageSize = 50)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var total = await db.ContactInquiries.CountAsync(ct);
        var items = await db.ContactInquiries
            .AsNoTracking()
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new
            {
                i.InquiryId, i.Name, i.Email, i.Query, i.SessionId,
                CreatedAt = i.CreatedAt.ToString("o"),
            })
            .ToListAsync(ct);
        return Results.Ok(new { total, page, pageSize, items });
    }

    private static async Task<IResult> DeleteInquiryAsync(
        int id, HttpContext httpContext, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!IsAuthorized(httpContext, config)) return Results.Unauthorized();
        var inquiry = await db.ContactInquiries.FindAsync([id], ct);
        if (inquiry is null) return Results.NotFound();
        db.ContactInquiries.Remove(inquiry);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
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

public sealed record CmsActionUpsertRequest(
    string Title, string Description, string Prompt,
    string Icon, bool IsActive, bool IsFeatured, int SortOrder);

public sealed record CmsSuggestionUpsertRequest(
    string Text, bool IsActive, int SortOrder);

public sealed record CmsHeroUpsertRequest(
    string Title, string Description, string BackgroundImageUrl);

public sealed record ReorderRequest(List<int> Ids);
