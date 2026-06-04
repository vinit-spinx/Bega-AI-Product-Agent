using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

namespace BegaProductFinder.API.Endpoints;

/// <summary>
/// Handles "Connect with BEGA Team" contact form submissions.
/// Persists visitor name, email, and query to the ContactInquiries SQL table.
/// </summary>
public static class ContactEndpoints
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/contact").WithTags("Contact");

        group.MapPost("/submit", SubmitAsync)
            .WithName("SubmitContactInquiry")
            .WithSummary("Save a visitor contact inquiry captured from the chat UI.");
    }

    // ── POST /api/contact/submit ──────────────────────────────────────────────

    private static async Task<IResult> SubmitAsync(
        [FromBody] ContactInquiryRequest request,
        AppDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { error = "Name is required." });

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
            return Results.BadRequest(new { error = "A valid email address is required." });

        if (string.IsNullOrWhiteSpace(request.Query))
            return Results.BadRequest(new { error = "Query is required." });

        var inquiry = new ContactInquiry
        {
            SessionId = request.SessionId?.Trim() ?? string.Empty,
            Name      = request.Name.Trim(),
            Email     = request.Email.Trim().ToLowerInvariant(),
            Query     = request.Query.Trim(),
        };

        var logger = loggerFactory.CreateLogger("ContactEndpoints");
        try
        {
            db.ContactInquiries.Add(inquiry);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Contact inquiry saved: Id={Id} Email={Email}", inquiry.InquiryId, inquiry.Email);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save contact inquiry for email {Email}", request.Email);
            // Return a plain JSON error so the frontend can display the message directly.
            // Results.Problem() returns ProblemDetails (no "error" key) which the UI can't parse.
            return Results.Json(
                new { error = "Unable to save your inquiry — please try again." },
                statusCode: 500);
        }

        return Results.Ok(new
        {
            success = true,
            inquiryId = inquiry.InquiryId,
            message = "Thank you! A BEGA representative will be in touch with you shortly."
        });
    }
}

/// <summary>Request body for <c>POST /api/contact/submit</c>.</summary>
public sealed record ContactInquiryRequest(
    string? SessionId,
    string Name,
    string Email,
    string Query
);
