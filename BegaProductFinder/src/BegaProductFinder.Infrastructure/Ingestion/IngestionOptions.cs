using System.ComponentModel.DataAnnotations;

namespace BegaProductFinder.Infrastructure.Ingestion;

/// <summary>
/// Bound from the <c>Ingestion</c> section of appsettings.json.
/// </summary>
public sealed class IngestionOptions
{
    public const string SectionName = "Ingestion";

    [Required]
    public string ProductJsonPath { get; set; } = string.Empty;

    [Required]
    public string PdfDownloadPath { get; set; } = string.Empty;

    public int ChunkSize { get; set; } = 512;

    public int ChunkOverlap { get; set; } = 64;

    public bool PdfDownloadEnabled { get; set; } = true;

    public int PdfDownloadTimeoutSeconds { get; set; } = 30;

    public int PdfDownloadMaxRetries { get; set; } = 3;

    public string SpecsMappingPath { get; set; } = "specsMapping.json";
}

/// <summary>
/// Runtime flags parsed from the ingestion console app command-line arguments.
/// Configured via <c>services.Configure&lt;IngestionRunOptions&gt;</c>.
/// </summary>
public sealed class IngestionRunOptions
{
    /// <summary>Path override from <c>--source</c> argument; null means use appsettings value.</summary>
    public string? SourceOverride { get; set; }

    /// <summary>When true, PDF download and extraction stages are skipped.</summary>
    public bool SkipPdfs { get; set; }

    /// <summary>When true, all existing records are deleted before re-ingestion.</summary>
    public bool Reset { get; set; }
}
