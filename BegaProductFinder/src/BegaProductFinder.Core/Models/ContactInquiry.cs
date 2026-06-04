namespace BegaProductFinder.Core.Models;

/// <summary>
/// Records a visitor's request to be contacted by a BEGA representative.
/// Captured via the "Connect with BEGA Team" panel shown after product recommendations.
/// </summary>
public class ContactInquiry
{
    /// <summary>Auto-incremented primary key.</summary>
    public int InquiryId { get; set; }

    /// <summary>Browser session that originated the inquiry — links to ChatSessions.SessionId.</summary>
    public string SessionId { get; set; } = string.Empty;

    /// <summary>Visitor's full name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Visitor's email address.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>The visitor's lighting or product question / project brief.</summary>
    public string Query { get; set; } = string.Empty;

    /// <summary>UTC timestamp when the inquiry was submitted.</summary>
    public DateTime CreatedAt { get; set; }
}
