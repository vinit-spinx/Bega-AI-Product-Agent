namespace BegaProductFinder.Core.Models;

/// <summary>A country a BEGA representative can be located in.</summary>
public class Country
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? ShortCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public List<State> States { get; set; } = [];
    public List<Representative> Representatives { get; set; } = [];
}

/// <summary>A state/province within a country.</summary>
public class State
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int CountryId { get; set; }

    public Country? Country { get; set; }
    public List<Representative> Representatives { get; set; } = [];
}

/// <summary>A BEGA sales representative / agency, optionally scoped to a state.</summary>
public class Representative
{
    public int Id { get; set; }
    public int? StateId { get; set; }
    public string AgencyName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Latitude { get; set; }
    public string? Longitude { get; set; }
    public string? Phone { get; set; }
    public string? Fax { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public int? SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int CountryId { get; set; }

    /// <summary>Free-text state name — used when <see cref="StateId"/> isn't set (e.g. non-US/CA regions).</summary>
    public string? StateText { get; set; }

    /// <summary>Canadian province code, when applicable.</summary>
    public string? Provinces { get; set; }

    public Country? Country { get; set; }
    public State? State { get; set; }
    public List<RepresentativeDetail> Details { get; set; } = [];
}

/// <summary>City/Zip detail row for a representative — one-to-one in practice, modeled as one-to-many.</summary>
public class RepresentativeDetail
{
    public int Id { get; set; }
    public int RepresentativeId { get; set; }
    public string? Zip { get; set; }
    public string? City { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Representative? Representative { get; set; }
}
