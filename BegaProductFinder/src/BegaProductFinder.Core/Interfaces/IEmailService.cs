namespace BegaProductFinder.Core.Interfaces;

/// <summary>
/// Sends transactional emails. Failures are logged but never thrown,
/// so email issues never block the HTTP response pipeline.
/// </summary>
public interface IEmailService
{
    /// <summary>True when SMTP host, credentials, and Enabled flag are all set.</summary>
    bool IsConfigured { get; }

    /// <summary>Send an HTML email. Any transport error is swallowed after logging.</summary>
    Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken ct = default);
}
