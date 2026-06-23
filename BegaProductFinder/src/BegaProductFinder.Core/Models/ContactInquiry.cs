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

    /// <summary>Visitor's company name. Only populated for "Request a Quote" submissions.</summary>
    public string? Company { get; set; }

    /// <summary>JSON array of shortlist entries ({ catalogNumber, quantity, kind }) attached at submission time.</summary>
    public string? ShortlistJson { get; set; }

    /// <summary>JSON-serialized <c>BomReport</c> attached at submission time, if a BOM had been generated.</summary>
    public string? BomReportJson { get; set; }

    /// <summary>'inquiry' (generic "Connect with BEGA Team") | 'quote_request' (shortlist/BOM-backed).</summary>
    public string Source { get; set; } = "inquiry";

    /// <summary>Visitor's role e.g. Architect, Electrician, Contractor. Only populated for quote requests.</summary>
    public string? Designation { get; set; }

    /// <summary>Project type e.g. Hospitality, Residential. Only populated for quote requests.</summary>
    public string? ProjectType { get; set; }

    /// <summary>Project or site location. Only populated for quote requests.</summary>
    public string? Location { get; set; }

    /// <summary>Phone number or other contact detail, distinct from Email. Only populated for quote requests.</summary>
    public string? Contact { get; set; }

    /// <summary>Visitor's freeform message. Only populated for quote requests — distinct from the synthesized Query summary.</summary>
    public string? Message { get; set; }

    /// <summary>Latitude resolved from the Location field via geocoding. Null if the visitor's text was never geocoded.</summary>
    public double? Latitude { get; set; }

    /// <summary>Longitude resolved from the Location field via geocoding. Null if the visitor's text was never geocoded.</summary>
    public double? Longitude { get; set; }

    /// <summary>City resolved from the Location field via geocoding.</summary>
    public string? City { get; set; }

    /// <summary>Country resolved from the Location field via geocoding.</summary>
    public string? Country { get; set; }

    /// <summary>ISO country code (e.g. "ae", "us") resolved from the Location field via geocoding.</summary>
    public string? CountryCode { get; set; }
}
