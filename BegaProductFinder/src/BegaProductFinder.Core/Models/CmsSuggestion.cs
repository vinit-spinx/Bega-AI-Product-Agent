namespace BegaProductFinder.Core.Models;

/// <summary>
/// A quick-start suggestion chip shown below the chat hero, managed via the admin CMS.
/// </summary>
public class CmsSuggestion
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
