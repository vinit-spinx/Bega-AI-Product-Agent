using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Core.Models;
using BegaProductFinder.Infrastructure.Data;
using BegaProductFinder.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Text.Json;


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

        group.MapPost("/submit-quote", SubmitQuoteAsync)
            .WithName("SubmitQuoteRequest")
            .WithSummary("Save a higher-intent quote request backed by a shortlist and/or generated BOM.");
    }

    // ── POST /api/contact/submit ──────────────────────────────────────────────

    private static async Task<IResult> SubmitAsync(
        [FromBody] ContactInquiryRequest request,
        AppDbContext db,
        IEmailService emailService,
        IOptions<SmtpSettings> smtpOptions,
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
            return Results.Json(
                new { error = "Unable to save your inquiry — please try again." },
                statusCode: 500);
        }

        // ── Send emails (non-blocking — failures logged, never thrown) ────────
        var smtp = smtpOptions.Value;

        // 1. Notification to BEGA team
        if (!string.IsNullOrWhiteSpace(smtp.NotificationEmail))
        {
            await emailService.SendAsync(
                smtp.NotificationEmail,
                "BEGA Team",
                $"New Inquiry from {inquiry.Name}",
                BuildNotificationHtml(inquiry),
                ct);
        }

        // 2. Confirmation reply to the visitor (controlled by appsettings Smtp:SendReplyToVisitor)
        if (smtp.SendReplyToVisitor)
        {
            await emailService.SendAsync(
                inquiry.Email,
                inquiry.Name,
                "Your BEGA Lighting Inquiry Has Been Received",
                BuildConfirmationHtml(inquiry),
                ct);
        }

        return Results.Ok(new
        {
            success = true,
            inquiryId = inquiry.InquiryId,
            message = "Thank you! A BEGA representative will be in touch with you shortly."
        });
    }

    // ── POST /api/contact/submit-quote ────────────────────────────────────────

    private static async Task<IResult> SubmitQuoteAsync(
        [FromBody] SubmitQuoteRequest request,
        AppDbContext db,
        IEmailService emailService,
        IOptions<SmtpSettings> smtpOptions,
        ILoggerFactory loggerFactory,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { error = "Name is required." });

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
            return Results.BadRequest(new { error = "A valid email address is required." });

        if (string.IsNullOrWhiteSpace(request.Location))
            return Results.BadRequest(new { error = "Location is required." });

        if (string.IsNullOrWhiteSpace(request.Message))
            return Results.BadRequest(new { error = "Message is required." });

        var shortlist = request.Shortlist ?? [];
        if (shortlist.Count == 0 && request.BomReport == null)
            return Results.BadRequest(new { error = "A shortlist or BOM must be attached to a quote request." });

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        // Synthesize a one-line summary so `Query` reads sensibly anywhere it's displayed
        // (Lead Pipeline table preview) without those call sites needing changes. `Message`
        // (the visitor's actual freeform text) is stored separately.
        var querySummary = request.BomReport != null
            ? $"Quote request for {request.BomReport.ItemCount} item(s) (BOM total: ${request.BomReport.SubtotalDnp:N0})"
            : $"Quote request for {shortlist.Count} shortlisted item(s)";

        var inquiry = new ContactInquiry
        {
            SessionId     = request.SessionId?.Trim() ?? string.Empty,
            Name          = request.Name.Trim(),
            Email         = request.Email.Trim().ToLowerInvariant(),
            Company       = request.Company?.Trim(),
            Query         = querySummary,
            Source        = "quote_request",
            ShortlistJson = shortlist.Count > 0 ? JsonSerializer.Serialize(shortlist, jsonOptions) : null,
            BomReportJson = request.BomReport != null ? JsonSerializer.Serialize(request.BomReport, jsonOptions) : null,
            Designation   = request.Designation?.Trim(),
            ProjectType   = request.ProjectType?.Trim(),
            Location      = request.Location.Trim(),
            Contact       = request.Contact?.Trim(),
            Message       = request.Message.Trim(),
            Latitude      = request.Latitude,
            Longitude     = request.Longitude,
            City          = request.City?.Trim(),
            Country       = request.Country?.Trim(),
            CountryCode   = request.CountryCode?.Trim().ToLowerInvariant(),
        };

        var logger = loggerFactory.CreateLogger("ContactEndpoints");
        try
        {
            db.ContactInquiries.Add(inquiry);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Quote request saved: Id={Id} Email={Email}", inquiry.InquiryId, inquiry.Email);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save quote request for email {Email}", request.Email);
            return Results.Json(
                new { error = "Unable to save your quote request — please try again." },
                statusCode: 500);
        }

        var smtp = smtpOptions.Value;

        if (!string.IsNullOrWhiteSpace(smtp.NotificationEmail))
        {
            await emailService.SendAsync(
                smtp.NotificationEmail,
                "BEGA Team",
                $"New Quote Request from {inquiry.Name}",
                BuildQuoteNotificationHtml(inquiry, shortlist, request.BomReport),
                ct);
        }

        if (smtp.SendReplyToVisitor)
        {
            await emailService.SendAsync(
                inquiry.Email,
                inquiry.Name,
                "Your BEGA Quote Request Has Been Received",
                BuildQuoteConfirmationHtml(inquiry, shortlist, request.BomReport),
                ct);
        }

        return Results.Ok(new
        {
            success = true,
            inquiryId = inquiry.InquiryId,
            message = "Thank you! A BEGA representative will follow up with pricing and availability shortly."
        });
    }

    // ── Email templates ───────────────────────────────────────────────────────

    private static string BuildNotificationHtml(ContactInquiry i) => $"""
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="font-size:18px;margin-bottom:4px">New Inquiry — BEGA AI Product Finder</h2>
          <p style="color:#666;font-size:13px;margin-top:0">{i.CreatedAt:dddd, dd MMMM yyyy · HH:mm} UTC</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;width:120px">Name</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;font-weight:600">{System.Net.WebUtility.HtmlEncode(i.Name)}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px"><a href="mailto:{i.Email}" style="color:#1a1a1a">{i.Email}</a></td></tr>
            <tr><td style="padding:10px 0;color:#666;font-size:13px;vertical-align:top">Message</td>
                <td style="padding:10px 0;font-size:13px;line-height:1.6">{System.Net.WebUtility.HtmlEncode(i.Query)}</td></tr>
          </table>
          <a href="mailto:{i.Email}?subject=Re: Your BEGA Lighting Inquiry"
             style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;
                    border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">
            Reply to {System.Net.WebUtility.HtmlEncode(i.Name)}
          </a>
          <p style="margin-top:32px;font-size:11px;color:#999">
            Sent from the BEGA AI Product Finder · Session: {i.SessionId[..Math.Min(8, i.SessionId.Length)]}…
          </p>
        </body>
        </html>
        """;

    private static string BuildConfirmationHtml(ContactInquiry i) => $"""
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
          <div style="border-bottom:2px solid #1a1a1a;padding-bottom:16px;margin-bottom:24px">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px">BEGA</span>
          </div>
          <h2 style="font-size:18px;margin-bottom:8px">Thank you, {System.Net.WebUtility.HtmlEncode(i.Name)}!</h2>
          <p style="font-size:14px;color:#444;line-height:1.6">
            We've received your lighting inquiry and a BEGA representative will be in touch
            at <strong>{i.Email}</strong> shortly.
          </p>
          <div style="background:#f7f5f2;border-radius:8px;padding:16px;margin:20px 0">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;
                      color:#999;margin:0 0 8px">Your message</p>
            <p style="font-size:13px;color:#444;line-height:1.6;margin:0">
              {System.Net.WebUtility.HtmlEncode(i.Query)}
            </p>
          </div>
          <p style="font-size:13px;color:#666;line-height:1.6">
            In the meantime, you can continue exploring the BEGA catalog using our AI assistant.
          </p>
          <p style="margin-top:32px;font-size:11px;color:#bbb">
            © BEGA · You received this because you submitted an inquiry via the BEGA AI Product Finder.
          </p>
        </body>
        </html>
        """;

    // ── Quote request itemized table (shared by notification + confirmation emails) ──

    private static string BuildItemizedTableHtml(List<QuoteShortlistItem> shortlist, BomReport? bom)
    {
        if (bom != null && bom.LineItems.Count > 0)
        {
            var rows = string.Join("", bom.LineItems.Select(li => $"""
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px;font-weight:600">{System.Net.WebUtility.HtmlEncode(li.CatalogNumber)}</td>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px">{System.Net.WebUtility.HtmlEncode(li.Description ?? li.FamilyName ?? "—")}</td>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px;text-align:center">{li.Quantity}</td>
                  <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px;text-align:right">{(li.LineTotalDnp.HasValue ? $"${li.LineTotalDnp:N2}" : "—")}</td>
                </tr>
                """));

            return $"""
                <table style="width:100%;border-collapse:collapse;margin:16px 0">
                  <tr>
                    <th style="padding:8px 0;border-bottom:2px solid #1a1a1a;font-size:11px;text-align:left;color:#666">Catalog #</th>
                    <th style="padding:8px 0;border-bottom:2px solid #1a1a1a;font-size:11px;text-align:left;color:#666">Description</th>
                    <th style="padding:8px 0;border-bottom:2px solid #1a1a1a;font-size:11px;text-align:center;color:#666">Qty</th>
                    <th style="padding:8px 0;border-bottom:2px solid #1a1a1a;font-size:11px;text-align:right;color:#666">Line Total</th>
                  </tr>
                  {rows}
                  <tr>
                    <td colspan="3" style="padding:10px 0;font-size:13px;font-weight:700;text-align:right">Subtotal (DNP)</td>
                    <td style="padding:10px 0;font-size:13px;font-weight:700;text-align:right">${bom.SubtotalDnp:N2}</td>
                  </tr>
                </table>
                """;
        }

        var shortlistRows = string.Join("", shortlist.Select(s => $"""
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px;font-weight:600">{System.Net.WebUtility.HtmlEncode(s.CatalogNumber)}</td>
              <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px;text-transform:capitalize">{System.Net.WebUtility.HtmlEncode(s.Kind)}</td>
              <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px;text-align:center">{s.Quantity}</td>
            </tr>
            """));

        return $"""
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr>
                <th style="padding:8px 0;border-bottom:2px solid #1a1a1a;font-size:11px;text-align:left;color:#666">Catalog #</th>
                <th style="padding:8px 0;border-bottom:2px solid #1a1a1a;font-size:11px;text-align:left;color:#666">Type</th>
                <th style="padding:8px 0;border-bottom:2px solid #1a1a1a;font-size:11px;text-align:center;color:#666">Qty</th>
              </tr>
              {shortlistRows}
            </table>
            """;
    }

    // Optional-field table row — omitted entirely when the value is blank, so the email
    // never shows empty "—" rows for fields the visitor skipped.
    private static string OptionalRow(string label, string? value) =>
        string.IsNullOrWhiteSpace(value) ? "" : $"""
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">{label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px">{System.Net.WebUtility.HtmlEncode(value)}</td></tr>
        """;

    private static string BuildQuoteNotificationHtml(ContactInquiry i, List<QuoteShortlistItem> shortlist, BomReport? bom) => $"""
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="font-size:18px;margin-bottom:4px">New Quote Request — BEGA AI Product Finder</h2>
          <p style="color:#666;font-size:13px;margin-top:0">{i.CreatedAt:dddd, dd MMMM yyyy · HH:mm} UTC</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;width:130px">Name</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;font-weight:600">{System.Net.WebUtility.HtmlEncode(i.Name)}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px"><a href="mailto:{i.Email}" style="color:#1a1a1a">{i.Email}</a></td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;font-weight:700">Location</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;font-weight:700">{System.Net.WebUtility.HtmlEncode(i.Location)}</td></tr>
            {OptionalRow("Designation", i.Designation)}
            {OptionalRow("Company", i.Company)}
            {OptionalRow("Project Type", i.ProjectType)}
            {OptionalRow("Contact", i.Contact)}
          </table>

          <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#666;margin:24px 0 8px">
            Message
          </p>
          <div style="background:#f7f5f2;border-radius:8px;padding:16px;margin:0 0 8px">
            <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0;white-space:pre-wrap">{System.Net.WebUtility.HtmlEncode(i.Message)}</p>
          </div>

          <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#666;margin:24px 0 0">
            Requested Items
          </p>
          {BuildItemizedTableHtml(shortlist, bom)}
          <a href="mailto:{i.Email}?subject=Re: Your BEGA Quote Request"
             style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;
                    border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">
            Reply to {System.Net.WebUtility.HtmlEncode(i.Name)}
          </a>
          <p style="margin-top:32px;font-size:11px;color:#999">
            Sent from the BEGA AI Product Finder · Session: {i.SessionId[..Math.Min(8, i.SessionId.Length)]}…
          </p>
        </body>
        </html>
        """;

    private static string BuildQuoteConfirmationHtml(ContactInquiry i, List<QuoteShortlistItem> shortlist, BomReport? bom) => $"""
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
          <div style="border-bottom:2px solid #1a1a1a;padding-bottom:16px;margin-bottom:24px">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px">BEGA</span>
          </div>
          <h2 style="font-size:18px;margin-bottom:8px">Thank you, {System.Net.WebUtility.HtmlEncode(i.Name)}!</h2>
          <p style="font-size:14px;color:#444;line-height:1.6">
            We've received your quote request for <strong>{System.Net.WebUtility.HtmlEncode(i.Location)}</strong>
            and a BEGA representative will follow up at <strong>{i.Email}</strong> with pricing and availability shortly.
          </p>
          <div style="background:#f7f5f2;border-radius:8px;padding:16px;margin:20px 0">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;
                      color:#999;margin:0 0 8px">Your message</p>
            <p style="font-size:13px;color:#444;line-height:1.6;margin:0;white-space:pre-wrap">
              {System.Net.WebUtility.HtmlEncode(i.Message)}
            </p>
          </div>
          {BuildItemizedTableHtml(shortlist, bom)}
          <p style="font-size:13px;color:#666;line-height:1.6">
            In the meantime, you can continue exploring the BEGA catalog using our AI assistant.
          </p>
          <p style="margin-top:32px;font-size:11px;color:#bbb">
            © BEGA · You received this because you submitted a quote request via the BEGA AI Product Finder.
          </p>
        </body>
        </html>
        """;
}

/// <summary>Request body for <c>POST /api/contact/submit</c>.</summary>
public sealed record ContactInquiryRequest(
    string? SessionId,
    string Name,
    string Email,
    string Query
);

/// <summary>One shortlisted item attached to a quote request.</summary>
public sealed record QuoteShortlistItem(
    string CatalogNumber,
    int Quantity,
    string Kind
);

/// <summary>Request body for <c>POST /api/contact/submit-quote</c>.</summary>
public sealed record SubmitQuoteRequest(
    string? SessionId,
    string Name,
    string Email,
    string? Designation,
    string? Company,
    string? ProjectType,
    string Location,
    string? Contact,
    string Message,
    List<QuoteShortlistItem>? Shortlist,
    BomReport? BomReport,
    double? Latitude = null,
    double? Longitude = null,
    string? City = null,
    string? Country = null,
    string? CountryCode = null
);
