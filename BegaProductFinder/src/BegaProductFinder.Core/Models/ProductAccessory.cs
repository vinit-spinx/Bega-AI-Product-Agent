namespace BegaProductFinder.Core.Models;

/// <summary>
/// EF Core entity for the ProductAccessories table.
/// Each row represents one accessory item belonging to a product,
/// deserialized from the BEGA JSON <c>ProductAccessories</c> string array.
/// </summary>
public class ProductAccessory
{
    /// <summary>SQL Server identity primary key.</summary>
    public int AccessoryId { get; set; }

    /// <summary>FK to <see cref="Product.ProductId"/> — cascades on delete.</summary>
    public int ProductId { get; set; }

    /// <summary>Accessory description as received from BEGA JSON e.g. "Remote driver box · Static white".</summary>
    public string AccessoryName { get; set; } = string.Empty;

    /// <summary>Display order within the product's accessory list.</summary>
    public int SortOrder { get; set; }

    // Navigation
    public Product Product { get; set; } = null!;
}
