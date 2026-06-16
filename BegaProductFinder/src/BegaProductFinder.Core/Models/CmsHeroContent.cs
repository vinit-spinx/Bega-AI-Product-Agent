namespace BegaProductFinder.Core.Models;

/// <summary>
/// The hero banner content (title, description, background image) for the chat landing page.
/// There is always exactly one row — Id = 1.
/// </summary>
public class CmsHeroContent
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string BackgroundImageUrl { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}
