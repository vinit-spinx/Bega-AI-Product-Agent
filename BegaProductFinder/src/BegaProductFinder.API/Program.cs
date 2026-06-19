using BegaProductFinder.API.Extensions;
using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Infrastructure.Agent;
using BegaProductFinder.Infrastructure.Data;
using BegaProductFinder.Infrastructure.Ingestion;
using BegaProductFinder.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
            policy.WithOrigins(allowedOrigins);
        else
            policy.AllowAnyOrigin();

        policy.AllowAnyHeader().AllowAnyMethod();
    });
});

// ── OpenAPI / Swagger ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "BEGA AI Product Finder API", Version = "v1" });
});

// ── EF Core — SQL Server ──────────────────────────────────────────────────────
var sqlConnStr = config.GetConnectionString("SqlServer")
    ?? throw new InvalidOperationException("ConnectionStrings:SqlServer is required.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(sqlConnStr));

// ── HTTP clients ──────────────────────────────────────────────────────────────
builder.Services.AddHttpClient("Anthropic", client =>
{
    client.BaseAddress = new Uri("https://api.anthropic.com");
    client.Timeout = Timeout.InfiniteTimeSpan;
    client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    client.DefaultRequestHeaders.Add("x-api-key", config["Anthropic:ApiKey"] ?? string.Empty);
});

// Named client for Depth Anything V2 sidecar — timeout set per-request from config
builder.Services.AddHttpClient("DepthAnalysis", client =>
{
    client.Timeout = TimeSpan.FromMinutes(2);
});

// ── Swap-architecture services ────────────────────────────────────────────────
builder.Services.AddEmbeddingService(config);
builder.Services.AddVectorSearch(config);

// ── Business services ─────────────────────────────────────────────────────────
builder.Services.AddScoped<IProductSearchService, ProductSearchService>();
builder.Services.AddScoped<IFamilyBrowseService, FamilyBrowseService>();
builder.Services.AddScoped<IFurnitureSearchService, FurnitureSearchService>();
builder.Services.AddScoped<IProjectRecommendationService, ProjectRecommendationService>();
builder.Services.AddScoped<IBillOfMaterialsService, BillOfMaterialsService>();
builder.Services.AddScoped<IChatSessionService, ChatSessionService>();

// ── Depth analysis sidecar (Depth Anything V2) ───────────────────────────────
builder.Services.AddScoped<DepthAnalysisService>();

// ── Agent ─────────────────────────────────────────────────────────────────────
builder.Services.AddScoped<SystemPromptBuilder>();
builder.Services.AddScoped<IAgentOrchestrator, AgentOrchestrator>();

// ── Ingestion (used by admin endpoint) ────────────────────────────────────────
var ingestionOptions = config.GetSection(IngestionOptions.SectionName).Get<IngestionOptions>()
    ?? new IngestionOptions();
builder.Services.AddSingleton(ingestionOptions);
builder.Services.AddSingleton(new IngestionRunOptions()); // no CLI flags in API context

builder.Services.AddScoped<SpecNormalizer>(sp => new SpecNormalizer(
    ingestionOptions.SpecsMappingPath,
    sp.GetRequiredService<ILogger<SpecNormalizer>>()));
builder.Services.AddScoped<JsonProductParser>();
builder.Services.AddScoped<PdfTextExtractor>();
builder.Services.AddScoped<TextChunker>(_ => new TextChunker(
    ingestionOptions.ChunkSize,
    ingestionOptions.ChunkOverlap));
builder.Services.AddScoped<IIngestionPipeline, IngestionPipeline>();

// ── Email (MailKit / Mailtrap) ────────────────────────────────────────────────
builder.Services.Configure<SmtpSettings>(config.GetSection(SmtpSettings.SectionName));
builder.Services.AddScoped<IEmailService, MailKitEmailService>();

// ── Logging ───────────────────────────────────────────────────────────────────
builder.Logging.AddConsole();

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapApiEndpoints();

app.Run();
