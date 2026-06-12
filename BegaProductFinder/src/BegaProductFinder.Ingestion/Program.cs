using BegaProductFinder.Core.Interfaces;
using BegaProductFinder.Infrastructure.Data;
using BegaProductFinder.Infrastructure.Embeddings;
using BegaProductFinder.Infrastructure.Ingestion;
using BegaProductFinder.Infrastructure.Search;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

// ── Argument parsing ──────────────────────────────────────────────────────────

var runOptions = new IngestionRunOptions();
string? sourceArg = null;

for (int i = 0; i < args.Length; i++)
{
    switch (args[i])
    {
        case "--source" when i + 1 < args.Length:
            sourceArg = args[++i];
            break;
        case "--skip-pdfs":
            runOptions.SkipPdfs = true;
            break;
        case "--reset":
            runOptions.Reset = true;
            break;
    }
}

runOptions.SourceOverride = sourceArg;

// ── Host configuration ────────────────────────────────────────────────────────

var host = Host.CreateDefaultBuilder(args)
    .ConfigureAppConfiguration((ctx, cfg) =>
    {
        cfg.SetBasePath(AppContext.BaseDirectory)
           .AddJsonFile("appsettings.json", optional: false)
           .AddJsonFile($"appsettings.{ctx.HostingEnvironment.EnvironmentName}.json", optional: true)
           .AddEnvironmentVariables();
    })
    .ConfigureLogging(logging =>
    {
        logging.ClearProviders();
        logging.AddConsole();
        logging.SetMinimumLevel(LogLevel.Warning); // suppress noisy EF Core SQL during bulk ops
    })
    .ConfigureServices((ctx, services) =>
    {
        var config = ctx.Configuration;

        // ── EF Core — PostgreSQL ─────────────────────────────────────────────
        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(config.GetConnectionString("Database")
                ?? throw new InvalidOperationException("ConnectionStrings:Database is required."))
               .UseLowerCaseNamingConvention());

        // ── Ingestion options ────────────────────────────────────────────────
        services.Configure<IngestionOptions>(config.GetSection(IngestionOptions.SectionName));
        services.AddSingleton(runOptions);

        // ── HTTP client for PDF downloads ────────────────────────────────────
        services.AddHttpClient("PdfDownload");

        // ── Ingestion services ───────────────────────────────────────────────
        services.AddSingleton(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<IngestionOptions>>().Value;
            var logger = sp.GetRequiredService<ILogger<SpecNormalizer>>();

            var path = opts.SpecsMappingPath;
            if (!Path.IsPathRooted(path))
                path = Path.Combine(AppContext.BaseDirectory, path);

            if (!File.Exists(path))
                throw new FileNotFoundException($"specsMapping.json not found at: {path}");

            return new SpecNormalizer(path, logger);
        });

        services.AddScoped<JsonProductParser>();
        services.AddScoped(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<IngestionOptions>>().Value;
            var http = sp.GetRequiredService<IHttpClientFactory>();
            var logger = sp.GetRequiredService<ILogger<PdfTextExtractor>>();
            return new PdfTextExtractor(http, opts, logger);
        });
        services.AddScoped(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<IngestionOptions>>().Value;
            return new TextChunker(opts.ChunkSize, opts.ChunkOverlap);
        });

        // ── Embedding service ────────────────────────────────────────────────
        services.AddHttpClient("Ollama", (sp, client) =>
        {
            var baseUrl = config["Embeddings:OllamaBaseUrl"] ?? "http://localhost:11434";
            client.BaseAddress = new Uri(baseUrl);
        });

        services.AddSingleton<IEmbeddingService>(sp =>
        {
            var provider = config["Embeddings:Provider"] ?? string.Empty;
            var dimensions = config.GetValue<int>("Embeddings:Dimensions", 768);
            var logger = sp.GetRequiredService<ILogger<OllamaEmbeddingService>>();

            return provider.ToLowerInvariant() switch
            {
                "ollama" => new OllamaEmbeddingService(
                    sp.GetRequiredService<IHttpClientFactory>(),
                    config["Embeddings:OllamaBaseUrl"] ?? "http://localhost:11434",
                    config["Embeddings:OllamaModel"] ?? "nomic-embed-text",
                    dimensions,
                    logger),
                "azureopenai" => new AzureOpenAiEmbeddingService(
                    config["Embeddings:AzureOpenAiEndpoint"] ?? string.Empty,
                    config["Embeddings:AzureOpenAiDeploymentName"] ?? string.Empty,
                    dimensions),
                _ => throw new InvalidOperationException(
                    $"Unknown Embeddings:Provider '{provider}'. Valid values: 'ollama', 'azureopenai'.")
            };
        });

        // ── Vector search ────────────────────────────────────────────────────
        services.AddSingleton<VectorDbContext>(sp =>
        {
            var connStr = config.GetConnectionString("Database")
                ?? throw new InvalidOperationException("ConnectionStrings:Database is required.");
            var dimensions = config.GetValue<int>("Embeddings:Dimensions", 768);
            return new VectorDbContext(connStr, dimensions);
        });

        services.AddScoped<IVectorSearchService>(sp =>
        {
            var provider = config["VectorSearch:Provider"] ?? string.Empty;
            var vectorSearchLogger = sp.GetRequiredService<ILogger<PgVectorSearchService>>();

            return provider.ToLowerInvariant() switch
            {
                "pgvector" => new PgVectorSearchService(
                    sp.GetRequiredService<VectorDbContext>(),
                    vectorSearchLogger),
                "azureaisearch" => new AzureAiSearchService(
                    config["VectorSearch:AzureSearchEndpoint"] ?? string.Empty,
                    config["VectorSearch:AzureSearchIndexName"] ?? "bega-products"),
                _ => throw new InvalidOperationException(
                    $"Unknown VectorSearch:Provider '{provider}'. Valid values: 'pgvector', 'azureaisearch'.")
            };
        });

        // ── Pipeline ─────────────────────────────────────────────────────────
        services.AddScoped<IIngestionPipeline>(sp =>
        {
            var opts = sp.GetRequiredService<IOptions<IngestionOptions>>().Value;
            return new IngestionPipeline(
                sp.GetRequiredService<AppDbContext>(),
                sp.GetRequiredService<JsonProductParser>(),
                sp.GetRequiredService<PdfTextExtractor>(),
                sp.GetRequiredService<TextChunker>(),
                sp.GetRequiredService<IEmbeddingService>(),
                sp.GetRequiredService<IVectorSearchService>(),
                opts,
                runOptions,
                sp.GetRequiredService<ILogger<IngestionPipeline>>());
        });
    })
    .Build();

// ── Run ───────────────────────────────────────────────────────────────────────

using var scope = host.Services.CreateScope();
var pipeline = scope.ServiceProvider.GetRequiredService<IIngestionPipeline>();
var ingestionOptions = scope.ServiceProvider.GetRequiredService<IOptions<IngestionOptions>>().Value;

var sourcePath = runOptions.SourceOverride ?? ingestionOptions.ProductJsonPath;

if (string.IsNullOrWhiteSpace(sourcePath))
{
    Console.Error.WriteLine("ERROR: Product JSON path not specified. Use --source <path> or set Ingestion:ProductJsonPath in appsettings.");
    return 1;
}

if (!File.Exists(sourcePath))
{
    Console.Error.WriteLine($"ERROR: Product JSON file not found: {sourcePath}");
    return 1;
}

Console.WriteLine("BEGA Product Ingestion Pipeline");
Console.WriteLine($"Source: {sourcePath}");
Console.WriteLine($"Skip PDFs: {runOptions.SkipPdfs}  |  Reset: {runOptions.Reset}");
Console.WriteLine(new string('-', 60));

try
{
    await pipeline.RunAsync(sourcePath, CancellationToken.None);
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"FATAL: {ex.Message}");
    return 1;
}

