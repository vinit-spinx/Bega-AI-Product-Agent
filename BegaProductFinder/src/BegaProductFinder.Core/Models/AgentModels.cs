namespace BegaProductFinder.Core.Models;

/// <summary>Discriminated event type for SSE chunks streamed from the agent orchestrator.</summary>
public enum AgentStreamEventType
{
    /// <summary>Incremental text token from Claude's response.</summary>
    TextDelta,

    /// <summary>One or more product results from a search or filter tool call.</summary>
    Products,

    /// <summary>One or more furniture results from the search_furniture tool call.</summary>
    Furniture,

    /// <summary>Project-level area recommendations from the recommend_for_project tool call.</summary>
    ProjectRecommendation,

    /// <summary>A priced bill of materials from the generate_bill_of_materials tool call.</summary>
    Bom,

    /// <summary>Suggested follow-up actions rendered as clickable pill buttons.</summary>
    SuggestedActions,

    /// <summary>Stream completed successfully — no further chunks will follow.</summary>
    Done,

    /// <summary>An error occurred during agent processing.</summary>
    Error
}

/// <summary>
/// A single chunk emitted on the SSE stream from <c>IAgentOrchestrator.StreamResponseAsync</c>.
/// The <see cref="Type"/> field acts as a discriminator — only the relevant property for that type is non-null.
/// </summary>
public record AgentStreamChunk
{
    public required AgentStreamEventType Type { get; init; }

    /// <summary>Incremental text content. Set when <see cref="Type"/> is <see cref="AgentStreamEventType.TextDelta"/>.</summary>
    public string? Content { get; init; }

    /// <summary>Product results. Set when <see cref="Type"/> is <see cref="AgentStreamEventType.Products"/>.</summary>
    public List<ProductSearchResult>? Products { get; init; }

    /// <summary>Furniture results. Set when <see cref="Type"/> is <see cref="AgentStreamEventType.Furniture"/>.</summary>
    public List<FurnitureSearchResult>? FurnitureItems { get; init; }

    /// <summary>Project area recommendations. Set when <see cref="Type"/> is <see cref="AgentStreamEventType.ProjectRecommendation"/>.</summary>
    public List<ProjectAreaRecommendation>? ProjectAreas { get; init; }

    /// <summary>Bill of materials report. Set when <see cref="Type"/> is <see cref="AgentStreamEventType.Bom"/>.</summary>
    public BomReport? BomReport { get; init; }

    /// <summary>Follow-up action labels. Set when <see cref="Type"/> is <see cref="AgentStreamEventType.SuggestedActions"/>.</summary>
    public List<string>? SuggestedActions { get; init; }

    /// <summary>Error description. Set when <see cref="Type"/> is <see cref="AgentStreamEventType.Error"/>.</summary>
    public string? ErrorMessage { get; init; }
}
