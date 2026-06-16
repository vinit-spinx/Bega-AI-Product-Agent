using BegaProductFinder.Core.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;

namespace BegaProductFinder.Infrastructure.Services;

/// <summary>
/// SMTP configuration bound from the <c>Smtp</c> section of appsettings.
/// </summary>
public sealed class SmtpSettings
{
    public const string SectionName = "Smtp";

    public bool Enabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "noreply@bega.com";
    public string FromName { get; set; } = "BEGA Lighting";
    /// <summary>Address that receives a notification for every new contact inquiry. Leave blank to disable.</summary>
    public string NotificationEmail { get; set; } = string.Empty;
    /// <summary>When true, an auto-reply confirmation is sent to the visitor after they submit the form.</summary>
    public bool SendReplyToVisitor { get; set; }
}

/// <summary>
/// Sends HTML emails via any SMTP relay. Configured for Mailtrap sandbox in development.
/// </summary>
public sealed class MailKitEmailService : IEmailService
{
    private readonly SmtpSettings _smtp;
    private readonly ILogger<MailKitEmailService> _log;

    public MailKitEmailService(IOptions<SmtpSettings> options, ILogger<MailKitEmailService> log)
    {
        _smtp = options.Value;
        _log = log;
    }

    /// <inheritdoc/>
    public bool IsConfigured =>
        _smtp.Enabled &&
        !string.IsNullOrWhiteSpace(_smtp.Host) &&
        !string.IsNullOrWhiteSpace(_smtp.Username);

    /// <inheritdoc/>
    public async Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken ct = default)
    {
        if (!IsConfigured)
        {
            _log.LogDebug("SMTP disabled — skipping email to {Email} ({Subject})", toEmail, subject);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_smtp.FromName, _smtp.FromEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new TextPart(TextFormat.Html) { Text = htmlBody };

        using var client = new SmtpClient();
        try
        {
            await client.ConnectAsync(_smtp.Host, _smtp.Port, SecureSocketOptions.StartTls, ct);
            await client.AuthenticateAsync(_smtp.Username, _smtp.Password, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(quit: true, ct);
            _log.LogInformation("Email sent → {Email} | {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            // Swallow — email failure must never block the HTTP response
            _log.LogError(ex, "SMTP send failed → {Email} | {Subject}", toEmail, subject);
        }
    }
}
