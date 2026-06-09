namespace BegaProductFinder.Core.Models;

/// <summary>
/// EF Core entity for the ProductProjects table.
/// Each row represents one project reference belonging to a product,
/// deserialized from the BEGA JSON <c>Projects</c> array.
/// </summary>
public class ProductProject
{
    /// <summary>SQL Server identity primary key.</summary>
    public int ProjectId { get; set; }

    /// <summary>FK to <see cref="Product.ProductId"/> — cascades on delete.</summary>
    public int ProductId { get; set; }

    /// <summary>Project name e.g. "FC Krasnodar Soccer Stadium".</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Full project description text.</summary>
    public string? Description { get; set; }

    /// <summary>Comma-separated tags; may be empty string.</summary>
    public string? Tags { get; set; }

    /// <summary>URL slug pointing to the project page on the BEGA website.</summary>
    public string? Slug { get; set; }

    /// <summary>Physical location string e.g. "Krasnodar, Russia".</summary>
    public string? Location { get; set; }

    /// <summary>URL to the project listing/thumbnail image.</summary>
    public string? ListingImage { get; set; }

    /// <summary>Display order within the product's project list.</summary>
    public int SortOrder { get; set; }

    // Navigation
    public Product Product { get; set; } = null!;
}
