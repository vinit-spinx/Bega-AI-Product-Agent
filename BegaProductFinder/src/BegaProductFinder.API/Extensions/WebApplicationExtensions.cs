using BegaProductFinder.API.Endpoints;

namespace BegaProductFinder.API.Extensions;

/// <summary>
/// Registers all route groups on the <see cref="WebApplication"/> instance.
/// Keeps <c>Program.cs</c> slim — each feature area owns its endpoint file.
/// </summary>
public static class WebApplicationExtensions
{
    /// <summary>Maps every API endpoint group to the application.</summary>
    public static WebApplication MapApiEndpoints(this WebApplication app)
    {
        ChatEndpoints.Map(app);
        ProductEndpoints.Map(app);
        FurnitureEndpoints.Map(app);
        ProjectEndpoints.Map(app);
        BomEndpoints.Map(app);
        ContactEndpoints.Map(app);
        AdminEndpoints.Map(app);
        ContentEndpoints.Map(app);
        InsightsEndpoints.Map(app);
        InsightsV2Endpoints.Map(app);
        return app;
    }
}
