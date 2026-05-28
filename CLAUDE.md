# BEGA — AI-Powered Product Finder Agent

> Complete End-to-End Master Prompt for Claude Code Generation
>
> **.NET 8 • Next.js 16 • Claude API • pgvector • Azure AI Search**
>
> No Docker Required • Local-first • Azure-ready

---

## A. How to Use This Document

> **PURPOSE**
> This document contains a complete master prompt. Paste everything from Section B onward into a Claude.ai Project as the Project Instructions. Claude will generate the full working codebase in 10 phases — one phase per conversation turn.

### Recommended: Claude.ai Projects

Projects keep Claude's memory across all 10 phases so architecture decisions made in Phase 1 are still honoured in Phase 9.

- Go to claude.ai → click **Projects** in the left sidebar
- Click **New Project** → name it: `BEGA AI Product Finder`
- Open **Project Instructions** → paste everything from Section B to end of document
- Start your first conversation inside the project
- Type exactly: `Start with Phase 1. Generate the complete solution structure and all .csproj files with NuGet packages.`
- After each phase: review the output, then type: `Phase N looks good, proceed to Phase N+1`

### Exact Phrases to Use Per Phase

| Phase | What to type |
|-------|-------------|
| **Phase 1** | Start with Phase 1. Generate solution structure and all .csproj files with NuGet packages. |
| **Phase 2** | Phase 1 looks good. Proceed to Phase 2 — all Core models and interfaces. |
| **Phase 3** | Proceed to Phase 3 — EF Core DbContext, entity configurations, and initial migration. |
| **Phase 4** | Proceed to Phase 4 — complete ingestion pipeline with SpecNormalizer, PDF extractor, chunker, and console app. |
| **Phase 5** | Proceed to Phase 5 — Ollama embedding service, pgvector search service, and stubbed Azure implementations. |
| **Phase 6** | Proceed to Phase 6 — AgentTools, SystemPromptBuilder, and full AgentOrchestrator with streaming tool loop. |
| **Phase 7** | Proceed to Phase 7 — ProductSearchService, FamilyBrowseService, ChatSessionService. |
| **Phase 8** | Proceed to Phase 8 — Program.cs with full DI registration and all API endpoint files. |
| **Phase 9** | Proceed to Phase 9 — complete Next.js 16 frontend with all components, hooks, and SSE streaming. |
| **Phase 10** | Proceed to Phase 10 — README.md with full setup instructions and .gitignore. |

> **⚠ IMPORTANT — DO NOT**
> Do NOT paste the entire prompt as a single chat message asking for all phases at once. Work phase by phase. This produces complete, correct, immediately runnable code for each layer. Do NOT skip phases. Each phase builds on the previous one.

### Configuration Values to Change After Code is Generated

These are the only values you update before running. Everything else is code.

| Setting | Where and what to change |
|---------|--------------------------|
| **Anthropic API Key** | `appsettings.Development.json` → `Anthropic:ApiKey` → from console.anthropic.com |
| **SQL Server** | `appsettings.Development.json` → `ConnectionStrings:SqlServer` → your local instance |
| **pgvector (PostgreSQL)** | `appsettings.Development.json` → `ConnectionStrings:VectorDb` → after PostgreSQL installed without Docker |
| **Product JSON path** | `appsettings.Development.json` → `Ingestion:ProductJsonPath` → full path to your products.json |
| **PDF download folder** | `appsettings.Development.json` → `Ingestion:PdfDownloadPath` → local folder for downloaded spec documents |
| **Frontend API URL** | `frontend/.env.local` → `NEXT_PUBLIC_API_URL` → `http://localhost:5000` |
| **Spec mapping config** | `specsMapping.json` → review and extend for all luminaire categories in your catalog |

### PostgreSQL Without Docker

Since Docker is not used, install PostgreSQL with pgvector directly on your Windows machine:

- Download PostgreSQL 16 installer from https://www.postgresql.org/download/windows/
- Run installer — remember the password you set for the `postgres` user
- After install, open pgAdmin or psql and run: `CREATE EXTENSION IF NOT EXISTS vector;`
- Create database: `CREATE DATABASE bega_vectors;`
- Your connection string: `Host=localhost;Port=5432;Database=bega_vectors;Username=postgres;Password=YOUR_PASSWORD`

---

## B. MASTER PROMPT — Paste Everything Below Into Claude Project Instructions

> **COPY START** — Copy from the heading **Role & Context** below all the way to the very end of this document and paste it into your Claude.ai Project Instructions.

---

# Role & Context

You are a senior full-stack .NET and Next.js developer. Build a complete, end-to-end, production-ready AI-powered product finder agent for BEGA. Every file must be fully implemented with zero placeholder comments such as `// TODO` or `// implement here`. Every method body must contain real working code.

I am a Senior Full Stack .NET Developer. I know ASP.NET Core 8, Entity Framework Core, Dapper, SQL Server, Next.js, and Azure. Skip basic explanations. Write production-quality code throughout with proper error handling, logging, dependency injection, and separation of concerns.

---

# Business Context

BEGA has a catalog of approximately 2,500 architectural lighting/furniture/controls products spanning multiple categories and hierarchical classification levels:

- **Category:** Exterior, Interior
- **Group:** e.g. In-grade, Recessed-wall, Ceiling, Wall, Post
- **Family:** e.g. In-grade luminaire, Recessed wall luminaire
- **Sub-Family:** e.g. Location luminaire · 24V DC, Unshielded, Shielded
- **Individual products** identified by CatalogNumber (e.g. `77127`)

The goal is a conversational AI agent that lets lighting designers, architects, and project specifiers:

### 1. Direct Product Finder Queries

- Find specific luminaire types by name, feature, or compliance standard: e.g. *"Find bollard lights with Dark Sky compliance"*
- Search by application: e.g. *"Recommend in-ground luminaires for illuminating palm trees"*
- Filter by technology: e.g. *"Find DALI-compatible lighting fixtures"*
- Search by photometric or environmental spec: e.g. *"Find exterior luminaires with warm white 2700K LEDs"*

### 2. Building / Project Recommendation Queries

- Get product recommendations for a named project type: e.g. *"Recommend lighting products for a 5-star hotel project"*
- Suggest fixture families for building typologies: universities, hospitals, airports, shopping malls, heritage buildings
- Recommend complete product sets for a described project scope

### 3. Area-Based Recommendation Queries

- **Residential spaces:** driveways, patios, swimming pools, garden pathways, rooftop terraces, front entrances
- **Commercial spaces:** hotel receptions, restaurant outdoor seating, corporate lobbies, parking lots, pedestrian walkways
- **Landscape spaces:** large trees, water features, botanical gardens, architectural columns

### 4. Natural Language Design Queries

- Mood and ambiance requests: e.g. *"I want my garden to feel luxurious at night"*
- Design-intent queries: e.g. *"Suggest products that create dramatic shadows on a facade"*
- Style-driven queries: e.g. *"Recommend lighting for a minimalist modern house"*
- Environmental responsibility: e.g. *"Recommend lighting that reduces light pollution"*

### 5. Controls & Smart Lighting Queries

- DALI, 0-10V, and centralized control system recommendations
- Automation and scheduling queries: e.g. *"How can I dim pathway lights after midnight?"*
- Motion sensor and smart system integration queries
- Hotel, residential, and campus-wide lighting management

### 6. Urban Furniture Queries

- Outdoor furniture for public plazas, university campuses, waterfront promenades
- Modular furniture systems for smart city projects
- Illuminated seating, pedestrian rest areas combining lighting and furniture

> **Note:** BEGA also offers outdoor furniture, modular furniture systems, and urban design elements alongside luminaires.

### 7. Image-Based AI Queries

- Analyze a building photo and recommend facade lighting
- Suggest products matching the style shown in a site photo or architectural rendering
- Identify dark areas in an image and recommend appropriate fixtures
- Create a complete lighting layout from an architectural rendering

### 8. Budget-Based Queries

- Recommend exterior lighting within a stated budget: e.g. *"under $10,000 for a villa"*
- Suggest cost-effective vs. premium options for a given application
- Generate indicative bill of materials with DNP pricing from catalog data

### 9. Technical Queries

- Filter by IP rating: e.g. *"Recommend fixtures with IP66 or higher"*
- Environmental suitability: coastal environments, extreme weather conditions
- Photometric precision: beam angles, glare ratings, Dark Sky compliance, mounting height
- Color specification: CCT options (2700K, 3000K, 3500K, 4000K) per product

### 10. Complete Design Assistant Queries

- Design complete lighting for an entire project: villa, hotel, residential community, park
- Generate a bill of materials for a named project type
- Recommend lighting, controls, and furniture together for a campus or smart city streetscape
- Analyze a floor plan or rendering and generate a full lighting solution

---

# Mandatory Tech Stack

## Backend

- .NET 8 ASP.NET Core — Minimal APIs pattern
- C# 12
- Entity Framework Core 8 for schema management and writes
- Dapper for all read-heavy search queries
- SQL Server (local developer instance) for structured product catalog
- PostgreSQL 16 + pgvector extension (installed natively, no Docker) for local vector search
- Anthropic Claude API — model: `claude-sonnet-4-20250514` — as the AI reasoning layer
- Ollama running locally — model: `nomic-embed-text` — for embedding generation
- UglyToad.PdfPig for spec document PDF text extraction
- Polly for HTTP retry policies on PDF downloads

## Frontend

- Next.js 16 with App Router
- TypeScript throughout
- Tailwind CSS for styling
- Server-Sent Events (SSE) for token-by-token streaming of agent responses

## NO Docker

Do not generate any `docker-compose.yml` or `Dockerfile`. PostgreSQL is installed natively on the developer machine. Provide instructions for native PostgreSQL setup in the README only.

## Swap Architecture — Local vs Azure

Design the vector search and embedding layers behind interfaces so that when the POC is approved and moved to Azure, only configuration values change and one new concrete class per service is activated. No controller, endpoint, or business logic code should need modification.

| Interface | Local Implementation | Azure Implementation |
|-----------|---------------------|---------------------|
| `IVectorSearchService` | `PgVectorSearchService` | `AzureAiSearchService` (stub now, ready for implementation) |
| `IEmbeddingService` | `OllamaEmbeddingService` | `AzureOpenAiEmbeddingService` (stub now, ready for implementation) |
| Registration | `Program.cs` reads `Provider` value from config and registers the correct concrete class via extension methods `AddVectorSearch()` and `AddEmbeddingService()` | |
| Switch to Azure | Change `Provider` values in Azure App Service Application Settings — zero code changes | |

---

# Solution Structure

Generate this exact structure. Every file listed must be created and fully implemented.

```
BegaProductFinder/
├── BegaProductFinder.sln
├── src/
│   ├── BegaProductFinder.API/
│   │   ├── Endpoints/
│   │   │   ├── ChatEndpoints.cs          # POST /api/chat/message (SSE streaming)
│   │   │   ├── ProductEndpoints.cs       # GET /api/products/search, /api/products/{catalogNumber}
│   │   │   └── AdminEndpoints.cs         # POST /api/admin/ingest/trigger (API-key protected)
│   │   ├── Extensions/
│   │   │   ├── ServiceCollectionExtensions.cs  # AddVectorSearch(), AddEmbeddingService()
│   │   │   └── WebApplicationExtensions.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json             # All keys present, empty string values
│   │   └── appsettings.Development.json # REPLACE_WITH values for developer
│   │
│   ├── BegaProductFinder.Core/
│   │   ├── Models/
│   │   │   ├── Product.cs
│   │   │   ├── ProductAccessory.cs
│   │   │   ├── ProductChunk.cs
│   │   │   ├── ChatSession.cs
│   │   │   ├── ChatMessage.cs
│   │   │   ├── SearchResult.cs
│   │   │   ├── ProductSearchFilters.cs
│   │   │   ├── SpecFilter.cs
│   │   │   ├── BomModels.cs               # BomLine, BomReport, ProjectRecommendation
│   │   │   └── AgentModels.cs             # AgentStreamChunk, tool request/response models
│   │   └── Interfaces/
│   │       ├── IVectorSearchService.cs
│   │       ├── IEmbeddingService.cs
│   │       ├── IAgentOrchestrator.cs
│   │       ├── IProductSearchService.cs
│   │       ├── IFamilyBrowseService.cs
│   │       ├── IFurnitureSearchService.cs
│   │       ├── IProjectRecommendationService.cs
│   │       ├── IBillOfMaterialsService.cs
│   │       ├── IChatSessionService.cs
│   │       └── IIngestionPipeline.cs
│   │
│   ├── BegaProductFinder.Infrastructure/
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs            # EF Core — SQL Server
│   │   │   ├── VectorDbContext.cs         # Npgsql — pgvector (PostgreSQL)
│   │   │   ├── Configurations/            # IEntityTypeConfiguration per entity
│   │   │   └── Migrations/                # EF Core auto-generated
│   │   ├── Search/
│   │   │   ├── PgVectorSearchService.cs   # IVectorSearchService — LOCAL
│   │   │   └── AzureAiSearchService.cs    # IVectorSearchService — AZURE (stubbed)
│   │   ├── Embeddings/
│   │   │   ├── OllamaEmbeddingService.cs  # IEmbeddingService — LOCAL
│   │   │   └── AzureOpenAiEmbeddingService.cs  # IEmbeddingService — AZURE (stubbed)
│   │   ├── Agent/
│   │   │   ├── AgentOrchestrator.cs       # Claude API + tool execution loop
│   │   │   ├── AgentTools.cs              # 8 tool definitions sent to Claude
│   │   │   └── SystemPromptBuilder.cs
│   │   ├── Services/
│   │   │   ├── ProductSearchService.cs
│   │   │   ├── FamilyBrowseService.cs
│   │   │   ├── FurnitureSearchService.cs
│   │   │   ├── ProjectRecommendationService.cs
│   │   │   ├── BillOfMaterialsService.cs
│   │   │   └── ChatSessionService.cs
│   │   └── Ingestion/
│   │       ├── IngestionPipeline.cs
│   │       ├── JsonProductParser.cs
│   │       ├── PdfTextExtractor.cs
│   │       ├── TextChunker.cs
│   │       └── SpecNormalizer.cs
│   │
│   └── BegaProductFinder.Ingestion/    # Standalone console app
│       ├── Program.cs
│       └── appsettings.json
│
├── frontend/                          # Next.js 16 App Router
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/chat/route.ts              # Next.js proxy to .NET API
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── StreamingText.tsx
│   │   └── product/
│   │       ├── ProductCard.tsx
│   │       ├── FurnitureCard.tsx
│   │       ├── BomTable.tsx
│   │       ├── DimensionTable.tsx
│   │       └── SuggestedActions.tsx
│   ├── hooks/
│   │   └── useChatSession.ts
│   ├── types/
│   │   └── index.ts
│   ├── lib/
│   │   └── api.ts
│   ├── .env.local                         # NEXT_PUBLIC_API_URL=http://localhost:5000
│   └── next.config.ts
│
├── specsMapping.json                  # Spec key normalisation config
├── README.md
└── .gitignore
```

---

# Real Product JSON Structure

The BEGA product JSON is a raw array (no root wrapper key). The array starts directly with `[` and each element is a product object. Design ALL parsers, models, normalizers, and ingestion code based on these real field names and values. Do not invent or assume different field names.

## Root Structure

```json
[
  { /* product object */ },
  { /* product object */ }
]
```

## Complete Product Object — All Fields

```json
{
  "Id": "5596",
  "CatalogNumber": "77127",
  "FamilyName": "In-grade luminaire",
  "FamilySlug": "130033",
  "SubFamilyName": "Location luminaire · 24V DC",
  "FamilyListPageImage": "https://avyre-spinx-test.s3.us-west-2.amazonaws.com/userfiles/images/130033.jpg",
  "FamilyListPageImageOrientation": "1",
  "FamilyTechImage": "https://avyre-spinx-test.s3.us-west-2.amazonaws.com/userfiles/images/FM_130033_tech.jpg",
  "LuminaireType": "In-grade",
  "GroupSlug": "in-grade",
  "CategoryName": "Exterior",
  "Led": "0.6W",
  "Express": "0",
  "LumenOutput_Double": "28",
  "BeamAngle": "74°",
  "Ada": "0",
  "A": "3",           // whole number part of dimension A
  "B": "1",
  "C": "2",
  "D": null,
  "AFraction": null,  // fractional part stored as-is e.g. "3/4" — do NOT convert to decimal
  "BFraction": "3/4",
  "CFraction": "1/2",
  "DFraction": null,
  "E": null,
  "EFraction": null,
  "LeadTime": "4-7 weeks",
  "ColorTemperature": "2700K (K27);3000K (K3);3500K (K35);4000K (K4)",
  "DynamicLight": null,
  "ExtraInfo": "In-grade location luminaries. ...",
  "Dnp": "708",
  "Msrp": "0",
  "ReplacementCatalogNumber": null,
  "Finish": null,
  "Voltage": "24V DC (remote power supply req.)",
  "SystemWattage": null,
  "SystemWattage_Double": "0.6",
  "Application": "unshielded",
  "SocialEnviornmentalHealth": "international dark sky",
  "ControlProtocol": "Non-Dimming",
  "Distribution": null,
  "RatingB": null,
  "RatingU": null,
  "RatingG": null,
  "TechnicalDocument": "https://.../77127_BEGA.zip",
  "SpecDocument": "https://.../77127_BEGA_Spec.pdf",
  "ProductOptions": [
    "CUS - Custom finish",
    "GFCI - GFCI with standard cover (Orientation: 180°; Height: 36\" A.F.G)",
    "MGU - Marine grade undercoat",
    "RAL - RAL Classic, matte finish"
  ],
  "ProductAccessories": [
    "Remote driver box · Static white"
  ],
  "GroupsName": "In-grade"
}
```

---

# Spec Normalisation

Unlike MCC which uses `electricalN`/`electricalN_unit` pairs, BEGA stores specs as discrete named fields. The `SpecNormalizer` must map raw BEGA field names to canonical spec keys. Load the mapping from `specsMapping.json` — never hardcode it — so new fields can be added without code changes.

## Known BEGA Spec Fields

| Raw BEGA Field | Canonical Spec Key | Notes |
|---------------|-------------------|-------|
| `Led` | `WattageW` | W — LED wattage string e.g. `"0.6W"` — parse numeric value |
| `SystemWattage_Double` | `SystemWattageW` | W — total system wattage as decimal string |
| `LumenOutput_Double` | `LumenOutputLm` | lm — lumen output as decimal string |
| `BeamAngle` | `BeamAngleDeg` | deg — nullable |
| `ColorTemperature` | `ColorTemperatureOptions` | string — semicolon-delimited list e.g. `"2700K (K27);3000K (K3)"` |
| `Voltage` | `VoltageSpec` | string — free text e.g. `"24V DC (remote power supply req.)"` |
| `ControlProtocol` | `ControlProtocol` | string — e.g. Non-Dimming, DALI, 0-10V |
| `Application` | `Application` | string — e.g. unshielded, shielded |
| `Dnp` | `DistributorNetPrice` | USD — parse decimal, may be 0 |
| `Msrp` | `Msrp` | USD — parse decimal, may be 0 |
| `LeadTime` | `LeadTime` | string — e.g. `"4-7 weeks"` |
| `Ada` | `AdaCompliant` | bool — `"1"` = true, `"0"` = false |
| `Express` | `ExpressDelivery` | bool — `"1"` = true, `"0"` = false |
| `RatingB` / `RatingU` / `RatingG` | `IpRatings` | string — store as composite field or separate columns |
| `Distribution` | `LightDistribution` | string — nullable |

## Dimension Storage

BEGA dimensions are stored as raw strings exactly as they appear in the JSON. Do NOT convert or compute decimal values. Store the whole-number part and fraction part in separate `nvarchar` columns. The frontend is responsible for display formatting (e.g. rendering `A + AFraction` as `"3-3/4"`).

```
// Store exactly as-is from JSON — no arithmetic, no conversion:
// A = "3", AFraction = "3/4"  =>  DimensionA = "3", DimensionAFraction = "3/4"
// B = "1", BFraction = null   =>  DimensionB = "1", DimensionBFraction = null
// C = null                    =>  DimensionC = null, DimensionCFraction = null
```

## Color Temperature Parsing

The `ColorTemperature` field is a semicolon-delimited string of available CCT options. Parse each option into a `ColorTemperatureOption` record and store as a JSON column on the product row:

```
// Input:  "2700K (K27);3000K (K3);3500K (K35);4000K (K4)"
// Output: List<ColorTemperatureOption>
//   { Kelvin: 2700, Code: "K27" }
//   { Kelvin: 3000, Code: "K3"  }
//   { Kelvin: 3500, Code: "K35" }
//   { Kelvin: 4000, Code: "K4"  }
// Regex to extract: (\d+)K\s*\(([^)]+)\)
```

---

# SQL Server Schema

Generate EF Core models and a single initial migration for these tables. Use `IEntityTypeConfiguration<T>` classes in separate files under `Data/Configurations/`.

## Products Table

```
ProductId                 int             PK identity
BegaId                    nvarchar(20)    unique, not null       -- maps to 'Id' field
CatalogNumber             nvarchar(50)    indexed, not null      -- primary identifier e.g. 77127
FamilyName                nvarchar(200)   indexed
FamilySlug                nvarchar(100)
SubFamilyName             nvarchar(200)
FamilyListPageImage       nvarchar(1000)
FamilyTechImage           nvarchar(1000)
LuminaireType             nvarchar(100)   indexed
GroupSlug                 nvarchar(100)   indexed
GroupsName                nvarchar(100)
CategoryName              nvarchar(100)   indexed                -- Exterior / Interior
LedWattage                nvarchar(20)
WattageW                  decimal(10,4)   nullable               -- parsed numeric from Led field
SystemWattageW            decimal(10,4)   nullable
LumenOutputLm             decimal(10,2)   nullable
BeamAngleDeg              decimal(10,2)   nullable
ColorTemperatureJson      nvarchar(500)                          -- JSON array of CCT options
Voltage                   nvarchar(200)
ControlProtocol           nvarchar(100)
Application               nvarchar(100)
Distribution              nvarchar(100)   nullable
DynamicLight              nvarchar(100)   nullable
Finish                    nvarchar(100)   nullable
LeadTime                  nvarchar(100)
DimensionA                nvarchar(10)    nullable               -- raw whole-number string e.g. "3"
DimensionAFraction        nvarchar(10)    nullable               -- raw fraction string e.g. "3/4"
DimensionB                nvarchar(10)    nullable
DimensionBFraction        nvarchar(10)    nullable
DimensionC                nvarchar(10)    nullable
DimensionCFraction        nvarchar(10)    nullable
DimensionD                nvarchar(10)    nullable
DimensionDFraction        nvarchar(10)    nullable
DimensionE                nvarchar(10)    nullable
DimensionEFraction        nvarchar(10)    nullable
RatingB                   nvarchar(20)    nullable
RatingU                   nvarchar(20)    nullable
RatingG                   nvarchar(20)    nullable
DnpPrice                  decimal(18,4)   nullable
MsrpPrice                 decimal(18,4)   nullable
IsAdaCompliant            bit             default 0
IsExpressDelivery         bit             default 0
ExtraInfo                 nvarchar(max)
SocialEnviornmentalHealth nvarchar(max)   nullable
ReplacementCatalogNumber  nvarchar(50)    nullable
ProductOptionsJson        nvarchar(max)   nullable               -- JSON if present
TechnicalDocumentUrl      nvarchar(1000)
SpecDocumentUrl           nvarchar(1000)
LastUpdated               datetime2
CreatedAt                 datetime2       default getutcdate()
```

## ProductAccessories Table

```
AccessoryId    int            PK identity
ProductId      int            FK -> Products.ProductId  (cascade delete)
AccessoryName  nvarchar(500)  not null                  -- e.g. "Remote driver box · Static white"
SortOrder      int            default 0
```

## ChatSessions Table

```
SessionId        uniqueidentifier  PK  default newsequentialid()
CreatedAt        datetime2         default getutcdate()
LastActivityAt   datetime2
MessagesJson     nvarchar(max)     -- JSON serialised List<ChatMessage>
ContextJson      nvarchar(max)     -- JSON serialised session context object
```

## ProductChunks Table (SQL Server — chunk metadata only)

```
ChunkId        int           PK identity
ProductId      int           FK -> Products.ProductId
CatalogNumber  nvarchar(50)
ChunkSource    nvarchar(50)  -- 'json_summary' | 'specpdf' | 'extrainfo'
ChunkText      nvarchar(max)
PageNumber     int           nullable
ChunkIndex     int
IsEmbedded     bit           default 0
VectorId       nvarchar(200) nullable
CreatedAt      datetime2
```

---

# PostgreSQL pgvector Schema

This schema is created by the ingestion pipeline on first run via Npgsql. It is NOT managed by EF Core migrations. The ingestion console app creates the table and index if they do not exist.

```sql
-- Run once: enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- product_chunks table
CREATE TABLE IF NOT EXISTS product_chunks (
  chunk_id        SERIAL PRIMARY KEY,
  product_id      INTEGER NOT NULL,
  catalog_number  VARCHAR(50) NOT NULL,
  chunk_source    VARCHAR(50) NOT NULL,
  chunk_text      TEXT NOT NULL,
  embedding       vector(768),
  page_number     INTEGER,
  chunk_index     INTEGER,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_chunk_embedding
  ON product_chunks USING hnsw (embedding vector_cosine_ops);
```

`nomic-embed-text` produces 768-dimensional vectors. If Ollama is replaced by Azure OpenAI `text-embedding-3-small`, that produces 1536 dimensions. The vector column size and HNSW index must match the model dimension. Make the dimension configurable via `Embeddings:Dimensions` in appsettings.

---

# Configuration Files

## appsettings.json (committed to git — no secrets, all empty defaults)

```json
{
  "Anthropic": {
    "ApiKey": "",
    "Model": "claude-sonnet-4-20250514",
    "MaxTokens": 2048,
    "MaxToolIterations": 5
  },
  "ConnectionStrings": {
    "SqlServer": "",
    "VectorDb": ""
  },
  "Embeddings": {
    "Provider": "",
    "Dimensions": 768,
    "OllamaBaseUrl": "",
    "OllamaModel": "",
    "AzureOpenAiEndpoint": "",
    "AzureOpenAiApiKey": "",
    "AzureOpenAiDeploymentName": ""
  },
  "VectorSearch": {
    "Provider": "",
    "AzureSearchEndpoint": "",
    "AzureSearchApiKey": "",
    "AzureSearchIndexName": "bega-products"
  },
  "Ingestion": {
    "ProductJsonPath": "",
    "PdfDownloadPath": "",
    "ChunkSize": 512,
    "ChunkOverlap": 64,
    "PdfDownloadEnabled": true,
    "PdfDownloadTimeoutSeconds": 30,
    "PdfDownloadMaxRetries": 3,
    "SpecsMappingPath": "specsMapping.json"
  },
  "AdminApiKey": "",
  "Cors": {
    "AllowedOrigins": []
  }
}
```

## appsettings.Development.json (git ignored — developer fills in real values)

```json
{
  "Anthropic": {
    "ApiKey": "REPLACE_WITH_YOUR_ANTHROPIC_API_KEY"
  },
  "ConnectionStrings": {
    "SqlServer": "Server=localhost;Database=BegaProductFinder;Trusted_Connection=True;TrustServerCertificate=True;",
    "VectorDb": "Host=localhost;Port=5432;Database=bega_vectors;Username=postgres;Password=REPLACE_WITH_YOUR_POSTGRES_PASSWORD"
  },
  "Embeddings": {
    "Provider": "ollama",
    "Dimensions": 768,
    "OllamaBaseUrl": "http://localhost:11434",
    "OllamaModel": "nomic-embed-text"
  },
  "VectorSearch": {
    "Provider": "pgvector"
  },
  "Ingestion": {
    "ProductJsonPath": "C:\\BegaData\\products.json",
    "PdfDownloadPath": "C:\\BegaData\\Pdfs\\"
  },
  "AdminApiKey": "REPLACE_WITH_ANY_STRONG_RANDOM_STRING",
  "Cors": {
    "AllowedOrigins": ["http://localhost:3000"]
  }
}
```

## specsMapping.json (root of solution — committed to git)

```json
{
  "mappings": [
    { "field": "Led",                 "canonicalKey": "WattageW",                "parseMode": "numeric_strip_unit" },
    { "field": "SystemWattage_Double","canonicalKey": "SystemWattageW",          "parseMode": "decimal" },
    { "field": "LumenOutput_Double",  "canonicalKey": "LumenOutputLm",           "parseMode": "decimal" },
    { "field": "BeamAngle",           "canonicalKey": "BeamAngleDeg",            "parseMode": "decimal_nullable" },
    { "field": "ColorTemperature",    "canonicalKey": "ColorTemperatureOptions", "parseMode": "cct_list" },
    { "field": "Voltage",             "canonicalKey": "VoltageSpec",             "parseMode": "string" },
    { "field": "ControlProtocol",     "canonicalKey": "ControlProtocol",         "parseMode": "string" },
    { "field": "Application",         "canonicalKey": "Application",             "parseMode": "string" },
    { "field": "Distribution",        "canonicalKey": "LightDistribution",       "parseMode": "string_nullable" },
    { "field": "DynamicLight",        "canonicalKey": "DynamicLight",            "parseMode": "string_nullable" },
    { "field": "Finish",              "canonicalKey": "Finish",                  "parseMode": "string_nullable" },
    { "field": "LeadTime",            "canonicalKey": "LeadTime",                "parseMode": "string" },
    { "field": "Dnp",                 "canonicalKey": "DistributorNetPrice",     "parseMode": "decimal_nullable" },
    { "field": "Msrp",                "canonicalKey": "Msrp",                    "parseMode": "decimal_nullable" },
    { "field": "Ada",                 "canonicalKey": "AdaCompliant",            "parseMode": "bool_from_int" },
    { "field": "Express",             "canonicalKey": "ExpressDelivery",         "parseMode": "bool_from_int" }
  ],
  "furniture_group_slugs": [
    "bench", "seating", "litter-bin", "planter", "bollard-furniture",
    "modular-furniture", "urban-elements", "cycle-stand"
  ]
}
```

---

# Core Interface Contracts

Implement all interfaces exactly as specified. These are the architectural swap points.

```csharp
// IVectorSearchService.cs
public interface IVectorSearchService
{
    Task EnsureIndexExistsAsync(CancellationToken ct = default);
    Task IndexChunkAsync(int productId, string catalogNumber, string chunkSource,
        string chunkText, float[] embedding, int? pageNumber, int chunkIndex,
        CancellationToken ct = default);
    Task<List<VectorSearchResult>> SearchAsync(float[] queryVector,
        int topK = 10, int[]? filterProductIds = null,
        CancellationToken ct = default);
    Task DeleteByProductIdAsync(int productId, CancellationToken ct = default);
    Task<bool> HealthCheckAsync(CancellationToken ct = default);
}

// IEmbeddingService.cs
public interface IEmbeddingService
{
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
    Task<List<float[]>> EmbedBatchAsync(List<string> texts,
        CancellationToken ct = default);
    int Dimensions { get; }
}

// IAgentOrchestrator.cs
public interface IAgentOrchestrator
{
    IAsyncEnumerable<AgentStreamChunk> StreamResponseAsync(
        string sessionId, string userMessage, CancellationToken ct = default);
}

// IProductSearchService.cs
public interface IProductSearchService
{
    Task<List<ProductSearchResult>> SearchByNaturalLanguageAsync(
        string query, ProductSearchFilters? filters = null,
        CancellationToken ct = default);
    Task<List<ProductSearchResult>> FilterBySpecsAsync(
        List<SpecFilter> filters, CancellationToken ct = default);
    Task<ProductDetail?> GetProductDetailAsync(
        string catalogNumber, CancellationToken ct = default);
}

// IFamilyBrowseService.cs
public interface IFamilyBrowseService
{
    Task<List<string>> GetCategoriesAsync(CancellationToken ct = default);
    Task<List<string>> GetGroupsAsync(string? category = null, CancellationToken ct = default);
    Task<List<FamilyBrowseResult>> GetFamiliesAsync(
        string? category = null, string? group = null, CancellationToken ct = default);
    Task<List<ProductSearchResult>> GetProductsByFamilyAsync(
        string familySlug, CancellationToken ct = default);
}

// IFurnitureSearchService.cs
public interface IFurnitureSearchService
{
    Task<List<FurnitureSearchResult>> SearchAsync(
        string query,
        string? furnitureType = null,
        string? application = null,
        string? material = null,
        bool? illuminated = null,
        int topK = 5,
        CancellationToken ct = default);
}

// IProjectRecommendationService.cs
public interface IProjectRecommendationService
{
    Task<List<ProjectAreaRecommendation>> RecommendAsync(
        string projectType,
        List<string>? areas = null,
        decimal? budgetUsd = null,
        List<string>? styleKeywords = null,
        string? category = null,
        CancellationToken ct = default);
}

// IBillOfMaterialsService.cs
public interface IBillOfMaterialsService
{
    Task<BomReport> GenerateAsync(
        List<BomLineRequest> items,
        string? projectName = null,
        CancellationToken ct = default);
}

// IChatSessionService.cs
public interface IChatSessionService
{
    Task<ChatSession> GetOrCreateAsync(string sessionId, CancellationToken ct = default);
    Task SaveAsync(ChatSession session, CancellationToken ct = default);
    Task<List<ChatMessage>> GetHistoryAsync(
        string sessionId, int lastN = 10, CancellationToken ct = default);
}

// IIngestionPipeline.cs
public interface IIngestionPipeline
{
    Task RunAsync(string productJsonPath, CancellationToken ct = default);
    Task<IngestionReport> GetLastReportAsync(CancellationToken ct = default);
}
```

---

# Agent Orchestrator — Full Specification

## Claude API Integration

- Call Anthropic Messages API directly using `IHttpClientFactory` — do NOT use any third-party Anthropic SDK
- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Required headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`
- Set `stream: true` in the request body
- Model: read from `Anthropic:Model` config value
- Parse SSE stream events: `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`
- Handle `input_json_delta` events for streaming tool call arguments

## Full Tool Execution Loop

- Build `messages` array from session history (last 10 turns) plus current user message
- Send to Claude API with all 8 tool definitions
- If response contains `tool_use` blocks: execute each tool by calling the matching service method
- Append Claude's response (with `tool_use`) as an `assistant` message to conversation
- Append tool results as a `user` message with `role: user` and `type: tool_result`
- Send updated full conversation back to Claude — repeat from step 2
- Stop when Claude returns a text response with no `tool_use` blocks, OR after `MaxToolIterations` (default 5) iterations
- Stream the final text delta tokens to the frontend via SSE as they arrive

## Eight Tool Definitions Sent to Claude

---

**Tool 1: `search_products`**

**Purpose:** Natural language product search across the BEGA luminaire catalog.

**Inputs:** `query` (string, required), `category` (string: Exterior/Interior), `group` (string), `family_name` (string), `min_wattage_w` (number), `max_wattage_w` (number), `min_lumen_output` (number), `beam_angle_deg` (number), `color_temperature_k` (integer), `voltage` (string), `control_protocol` (string), `ada_compliant` (boolean), `express_delivery` (boolean), `top_k` (integer, default 5)

**Returns:** Array of matching luminaires with key specs, image URLs, spec document URL, and match score.

---

**Tool 2: `get_product_detail`**

**Purpose:** Retrieve complete specifications for one specific BEGA luminaire by catalog number.

**Inputs:** `catalog_number` (string, required) — e.g. `77127`

**Returns:** Full product record including all electrical specs, physical dimensions, color temperature options, voltage, control protocol, accessory list, technical document URL, spec document URL.

---

**Tool 3: `browse_by_hierarchy`**

**Purpose:** Navigate the BEGA product hierarchy to help users explore categories, groups, and families.

**Inputs:** `level` (string, required: `'categories'` | `'groups'` | `'families'` | `'products'`), `category` (string), `group` (string), `family_slug` (string)

**Returns:** List of items at the requested hierarchy level with names, slugs, and product counts.

---

**Tool 4: `filter_by_specs`**

**Purpose:** Precise numerical filtering on photometric and electrical specifications.

**Inputs:** `filters` (array of objects, each with `spec_key`, `operator` [gte/lte/eq/between], `value`, `value_max`)

**Known `spec_key` values:** `WattageW`, `SystemWattageW`, `LumenOutputLm`, `BeamAngleDeg`, `DnpPrice`, `MsrpPrice`

**Returns:** Products matching all filter conditions with their spec values.

---

**Tool 5: `get_spec_document_context`**

**Purpose:** Search the extracted spec document text for a specific luminaire to answer deep technical questions about installation, certifications, photometric data, or mounting requirements.

**Inputs:** `product_id` (integer, required), `question` (string, required)

**Returns:** Most relevant spec document text chunks for the question.

---

**Tool 6: `recommend_for_project`**

**Purpose:** Generate a curated multi-area product recommendation set for a named project type or building typology. Covers building/project queries (cat. 2) and budget-bounded design queries (cat. 8).

**Inputs:** `project_type` (string, required — e.g. `'5-star hotel'`, `'university campus'`, `'luxury villa'`, `'public park'`), `areas` (array of strings — e.g. `['entrance', 'pathways', 'facade', 'parking']`), `budget_usd` (number, nullable — upper ceiling for total DNP), `style_keywords` (array of strings — e.g. `['minimalist', 'warm', 'dark sky']`), `category` (string: Exterior/Interior/Both)

**Behavior:** Calls `search_products` and `filter_by_specs` internally per area, then assembles a structured recommendation grouping products by area. If `budget_usd` is set, prioritise lower-DNP options and flag if the total exceeds the budget.

**Returns:** List of `ProjectAreaRecommendation` objects, each with `area_name`, `recommended_products[]`, `rationale` (1-2 sentences), and `estimated_total_dnp`.

---

**Tool 7: `generate_bill_of_materials`**

**Purpose:** Assemble a structured, priced bill of materials from a list of catalog numbers and quantities. Covers budget queries (cat. 8) and complete design assistant queries (cat. 10).

**Inputs:** `items` (array of objects, each with `catalog_number` (string, required), `quantity` (integer, required), `area_label` (string — e.g. `'Main entrance'`)), `project_name` (string, nullable)

**Behavior:** For each item, look up DNP and MSRP from the Products table, multiply by quantity, sum totals. Flag any `catalog_number` not found in the database.

**Returns:** `BomReport` with `line_items[]` (catalog_number, description, family_name, quantity, unit_dnp, line_total_dnp, unit_msrp, line_total_msrp, lead_time), `subtotal_dnp`, `subtotal_msrp`, `currency` (`'USD'`), `item_count`, and any `not_found_items[]`.

---

**Tool 8: `search_furniture`**

**Purpose:** Search BEGA's outdoor furniture and urban design element catalog — separate from luminaires since furniture has no wattage, lumen, or CCT attributes. Covers urban furniture queries (cat. 6).

**Inputs:** `query` (string, required — e.g. `'outdoor benches for a plaza'`), `furniture_type` (string — e.g. `'bench'`, `'bollard'`, `'planter'`, `'modular seating'`, `'litter bin'`), `application` (string — e.g. `'public plaza'`, `'campus'`, `'waterfront'`, `'smart city'`), `material` (string — e.g. `'steel'`, `'concrete'`, `'wood'`), `illuminated` (boolean — true = furniture with integrated lighting), `top_k` (integer, default 5)

**Note:** BEGA furniture products share the same database table as luminaires but have no LED/lumen/wattage fields. The service filters by `GroupSlug` values that correspond to furniture families. The `specsMapping.json` must include a `furniture_group_slugs` array listing all known BEGA furniture `GroupSlug`s so new furniture families can be added without code changes.

**Returns:** Array of matching furniture products with name, family, image URL, dimensions, and spec document URL.

---

## System Prompt Content

Build this dynamically in `SystemPromptBuilder.cs`. Inject via DI so it can be tested independently.

```
You are an expert architectural lighting and urban design advisor for BEGA.
Your role is to help lighting designers, architects, specifiers, and project
managers find the right luminaires, furniture, and complete lighting solutions.

STRICT RULES:
1. NEVER fabricate catalog numbers, photometric data, or specifications.
2. ALWAYS use the provided tools to search the real BEGA catalog before answering.
3. When recommending a product, ALWAYS cite the specific BEGA catalog number.
4. If the catalog has no suitable product, say so honestly.
5. Ask one clarifying question if the requirement is ambiguous.
6. You may call multiple tools in sequence if needed.
7. For budget queries, always use generate_bill_of_materials to compute totals
   — never estimate prices from memory.

TOOL USAGE RULES:
- Natural language luminaire requirements -> use search_products
- Specific catalog number question -> use get_product_detail
- User wants to browse by category/group/family -> use browse_by_hierarchy
- Precise numerical spec requirement (IP rating, lumens, wattage) -> use filter_by_specs
- Deep technical question about installation or photometrics -> use get_spec_document_context
- Project type or building typology mentioned -> use recommend_for_project
  (e.g. hotel, campus, villa, park, airport, hospital — any named project type)
- Budget ceiling mentioned alongside a project -> use recommend_for_project with budget_usd,
  then pipe results into generate_bill_of_materials
- User asks for a BOM, cost estimate, or quantities -> use generate_bill_of_materials
- User asks about benches, seating, urban furniture, or non-luminaire products -> use search_furniture

RESPONSE FORMAT FOR PRODUCT RECOMMENDATIONS:
- Lead with the best matching catalog number and why it fits the application
- List the key specs relevant to the user's requirement
  (wattage, lumens, CCT options, voltage, beam angle, IP rating, dimensions)
- Note any caveats (voltage requirements, accessory dependencies, lead time)
- Suggest 1-2 alternatives if applicable
- Offer follow-up actions (e.g. 'Would you like a bill of materials for this selection?')

RESPONSE FORMAT FOR PROJECT RECOMMENDATIONS:
- Group recommendations by area (entrance, pathways, facade, etc.)
- For each area: catalog number, brief rationale, key specs
- End with an offer to generate a full priced BOM

RESPONSE FORMAT FOR BILL OF MATERIALS:
- Trigger the 'bom' SSE event so the frontend renders the BomTable component
- Summarise total DNP and MSRP in the text response
- Note any items not found in the catalog

SCOPE:
You assist with BEGA luminaire selection, furniture selection, project-level
recommendations, technical questions, and bill of materials generation.
For final pricing confirmation and availability, direct users to a BEGA representative.
Do not answer questions unrelated to architectural lighting, urban design, or BEGA products.
```

> **⚠ Image-Based AI Queries — Phase 2 Enhancement (Not in Current Scope)**
>
> Query category 7 (analyze a photo and recommend products) requires vision input support. This is intentionally excluded from the current build and documented here for the next phase.
>
> **What is needed:**
> 1. **Frontend:** add image upload button to `ChatInput.tsx`; encode uploaded image as base64 and include in the `POST /api/chat/message` body alongside the text message.
> 2. **API:** update `ChatEndpoints.cs` to accept an optional `imageBase64` + `imageMimeType` field on the request body.
> 3. **Agent:** update `AgentOrchestrator` to include the image as a vision content block in the Claude API messages array when present (`type: 'image'`, `source: { type: 'base64', media_type, data }`).
> 4. **System Prompt:** add a rule: *"When an image is provided, first describe the scene and identify the architectural context, then call `search_products` with a query derived from that description."*
> 5. **No new tool is needed** — Claude's vision capability combined with `search_products` handles the lookup once the image is visible to the model.

---

# Ingestion Pipeline — Full Specification

## JsonProductParser.cs

Parse the BEGA product JSON array exactly. The root element is a JSON array — deserialize directly as `List<BegaProductJson>` with no root wrapper key. Handle these field-level data quality issues:

- `Id` and `CatalogNumber` are strings — store `Id` as string `BegaId`, `CatalogNumber` as string (primary identifier)
- `Led` field contains unit string e.g. `"0.6W"` — strip `"W"` and parse to decimal for `WattageW`
- `SystemWattage_Double` is a string decimal e.g. `"0.6"` — parse to decimal, may be null or `"0"`
- `LumenOutput_Double` is a string decimal — parse to decimal, may be null
- `BeamAngle` may be null — nullable decimal
- `Ada` and `Express` are string `"0"` / `"1"` — convert: `"1"` = true, `"0"` = false
- `Dnp` and `Msrp` are string decimals — `"0"` means no price available, store as null
- `ColorTemperature` is a semicolon-delimited string — parse into `List<ColorTemperatureOption>`
- `ProductAccessories` is a JSON string array — deserialize and map to `ProductAccessory` rows
- `ProductOptions` may be null or a JSON array — serialize back to `nvarchar(max)` if present
- `A`/`B`/`C`/`D`/`E` and `AFraction`/`BFraction`/`CFraction`/`DFraction`/`EFraction` are stored as raw `nvarchar` strings exactly as received — do NOT perform any arithmetic or decimal conversion
- `FamilyListPageImageOrientation` is a string int — parse to int, not stored in main table but available for front-end image rendering hints

## PdfTextExtractor.cs

- Use `UglyToad.PdfPig` NuGet package
- Download from `SpecDocument` URL (PDF) using `IHttpClientFactory`
- `TechnicalDocument` URL is a ZIP file — do NOT attempt to extract it; log its URL and skip PDF parsing for that asset
- Retry policy: 3 attempts, exponential backoff 2s / 4s / 8s via Polly
- Timeout per download: read from `Ingestion:PdfDownloadTimeoutSeconds` config
- Skip pages with fewer than 50 characters of extracted text
- Return `List<(int PageNumber, string Text)>`
- On download failure: log warning, return empty list, continue pipeline

## TextChunker.cs

- Sliding window: `ChunkSize` tokens, `ChunkOverlap` tokens (read from config)
- Token approximation: 1 token = 4 characters

Generate one `json_summary` chunk per product using this template:

```
BEGA Catalog: {CatalogNumber} | Family: {FamilyName} | SubFamily: {SubFamilyName} |
Category: {CategoryName} | Group: {GroupsName} | Type: {LuminaireType} |
LED: {LedWattage} | System Wattage: {SystemWattageW}W | Lumens: {LumenOutputLm}lm |
Beam Angle: {BeamAngleDeg}deg | CCT Options: {ColorTemperature} |
Voltage: {Voltage} | Control: {ControlProtocol} | Application: {Application} |
ADA: {IsAdaCompliant} | Express: {IsExpressDelivery} | Lead Time: {LeadTime} |
Dimensions: A={DimensionA} {DimensionAFraction} B={DimensionB} {DimensionBFraction} C={DimensionC} {DimensionCFraction} |
ExtraInfo: {ExtraInfo}
```

Generate one `extrainfo` chunk per product if `ExtraInfo` is non-empty (use `chunk_source = 'extrainfo'`).

Generate spec document chunks from PDF text pages if `SpecDocument` PDF download succeeded (use `chunk_source = 'specpdf'`).

## Ingestion Console App (BegaProductFinder.Ingestion)

- Accept `--source <path>` argument for products.json path
- Accept `--skip-pdfs` flag to skip PDF download stage (useful for fast re-runs)
- Accept `--reset` flag to clear and re-ingest all records

Run 6 stages in sequence with progress output:

```
[Stage 1/6] Parsing product JSON...              2,500 products found
[Stage 2/6] Upserting SQL Server records...      2,500 / 2,500
[Stage 3/6] Downloading Spec PDFs...             2,100 / 2,500  (400 skipped/failed)
[Stage 4/6] Chunking text...                     8,400 chunks created
[Stage 5/6] Generating embeddings (Ollama)...    8,400 / 8,400
[Stage 6/6] Indexing vectors (pgvector)...       8,400 / 8,400

Ingestion complete in 14m 20s
Products: 2,500 | Chunks: 8,400 | PDFs: 2,100 | Failures: 12
Failure log: C:\BegaData\ingestion_failures.log
```

- Idempotent: check `IsEmbedded` flag before re-embedding; check `CatalogNumber` for existing records before re-upserting
- Write failure log file listing all failed PDF URLs with error messages

---

# API Endpoints — Full Specification

## Chat Endpoints

```
POST /api/chat/message
  Content-Type: application/json
  Body: { "sessionId": "uuid", "message": "I need an exterior in-grade at 24V with 30+ lumens" }
  Response: text/event-stream (SSE)

  SSE event types emitted:
  data: {"type":"text_delta","content":"Based on your requirements..."}
  data: {"type":"products","products":[{...}]}
  data: {"type":"furniture","items":[{...}]}
  data: {"type":"project_recommendation","areas":[{"area_name":"Entrance","products":[...],"rationale":"...","estimated_total_dnp":1240}]}
  data: {"type":"bom","report":{"line_items":[...],"subtotal_dnp":4800,"subtotal_msrp":0,"currency":"USD"}}
  data: {"type":"suggested_actions","actions":["Show interior options","Filter by DALI control","Generate BOM"]}
  data: {"type":"done"}
  data: {"type":"error","message":"..."}

GET    /api/chat/session/{sessionId}   -- returns session history
DELETE /api/chat/session/{sessionId}   -- clears session
```

## Product Endpoints

```
GET /api/products/search?q={query}&category={cat}&group={group}&family={family}
GET /api/products/{catalogNumber}
GET /api/products/families?category={cat}&group={group}
GET /api/products/hierarchy
```

## Furniture Endpoints

```
GET /api/furniture/search?q={query}&type={type}&application={app}&illuminated={bool}
```

## Project & BOM Endpoints

```
POST /api/projects/recommend
     Body: {
       "projectType": "5-star hotel",
       "areas": ["entrance", "pathways"],
       "budgetUsd": 50000,
       "styleKeywords": ["warm", "dark sky"]
     }

POST /api/bom/generate
     Body: {
       "projectName": "Villa Rossi",
       "items": [{ "catalogNumber": "77127", "quantity": 4, "areaLabel": "Driveway" }]
     }
     Returns: BomReport with line items, DNP totals, MSRP totals, lead times
```

## Admin Endpoints

```
POST /api/admin/ingest/trigger
     Header: X-Admin-Api-Key: {AdminApiKey from config}
     Body: { "productJsonPath": "optional override path" }

GET  /api/admin/ingest/status
```

---

# Frontend — Next.js 16 Specification

## Chat UI Requirements

- Professional chat interface with clean architectural/lighting industry aesthetic — dark background preferred, warm accent tones
- Token-by-token streaming text rendering as SSE events arrive
- `ProductCard` for `products` SSE events; `FurnitureCard` for `furniture` events; `BomTable` for `bom` events; project area cards for `project_recommendation` events
- `SuggestedActions` render as clickable pill buttons — clicking sends as next user message
- Session UUID created on page load via `crypto.randomUUID()`, stored in `sessionStorage`
- Reconnect automatically if SSE connection drops
- Show typing indicator (three dots) while agent is reasoning and calling tools
- Error state with retry button
- Responsive layout — works on mobile and desktop

## ProductCard Component

| Field | Display |
|-------|---------|
| `FamilyListPageImage` | Product family image — lazy loaded, fallback placeholder if 404; respect `FamilyListPageImageOrientation` for portrait/landscape display |
| `FamilyTechImage` | Technical line drawing thumbnail |
| `CatalogNumber` | Bold, large — the primary identifier |
| `FamilyName` + `SubFamilyName` | Badge pills e.g. *In-grade luminaire · Location luminaire 24V DC* |
| `CategoryName` + `GroupsName` | Category breadcrumb e.g. *Exterior › In-grade* |
| Key specs | Small table: LED wattage, lumens, CCT options, voltage, beam angle, control protocol |
| Dimensions | Raw strings: `A` + `AFraction`, `B` + `BFraction`, `C` + `CFraction` rendered as e.g. `3-3/4" x 1-3/4" x 2-1/2"` — formatted by the frontend, not pre-computed |
| `IsAdaCompliant` / `IsExpressDelivery` | Green/grey compliance and delivery badges |
| `LeadTime` | Lead time label |
| `SpecDocumentUrl` | Button: **View Spec Sheet** — opens PDF in new tab |
| `TechnicalDocumentUrl` | Button: **Download Technical Package** — downloads ZIP |
| `ProductAccessories` | Scrollable accessory chip list if present |

## FurnitureCard Component

Rendered when the `furniture` SSE event is received. Furniture products have no electrical specs:

| Field | Display |
|-------|---------|
| `FamilyListPageImage` | Product image — lazy loaded with fallback placeholder |
| `CatalogNumber` | Bold, large — primary identifier |
| `FamilyName` + `SubFamilyName` | Product family badges |
| `GroupsName` | Furniture type label e.g. *Bench*, *Bollard*, *Planter* |
| `CategoryName` | Exterior / Interior badge |
| Dimensions | `A` + `AFraction` through `E` + `EFraction` rendered as fraction strings |
| `Application` | Application label if present |
| `Finish` | Finish/material label if present |
| `LeadTime` | Lead time badge |
| `SpecDocumentUrl` | Button: **View Spec Sheet** — opens PDF in new tab |
| `TechnicalDocumentUrl` | Button: **Download Technical Package** |

## BomTable Component

Rendered when the `bom` SSE event is received:

| Element | Specification |
|---------|--------------|
| Line items table | Columns: Area, Catalog No., Description, Family, Qty, Unit DNP, Line Total DNP — sortable by any column |
| Lead time column | Per-line lead time from catalog data |
| Not found items | Red-highlighted rows for any catalog numbers not found in the database |
| Totals row | Subtotal DNP, Subtotal MSRP (if non-zero), item count — pinned at bottom |
| Export button | Download as CSV — generates client-side CSV from the `BomReport` data |
| Print button | Opens a clean print-friendly view of the BOM |

## Environment Variable

```
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

# Dependency Injection Registration

All DI registration in `Program.cs` driven by config. No hardcoding.

```csharp
// In ServiceCollectionExtensions.cs:

public static IServiceCollection AddVectorSearch(
    this IServiceCollection services, IConfiguration config)
{
    var provider = config["VectorSearch:Provider"];
    return provider switch {
        "pgvector"      => services.AddScoped<IVectorSearchService, PgVectorSearchService>(),
        "azureaisearch" => services.AddScoped<IVectorSearchService, AzureAiSearchService>(),
        _ => throw new InvalidOperationException($"Unknown VectorSearch provider: {provider}")
    };
}

public static IServiceCollection AddEmbeddingService(
    this IServiceCollection services, IConfiguration config)
{
    var provider = config["Embeddings:Provider"];
    return provider switch {
        "ollama"      => services.AddScoped<IEmbeddingService, OllamaEmbeddingService>(),
        "azureopenai" => services.AddScoped<IEmbeddingService, AzureOpenAiEmbeddingService>(),
        _ => throw new InvalidOperationException($"Unknown Embeddings provider: {provider}")
    };
}

// Remaining services registered as scoped in Program.cs:
// services.AddScoped<IProductSearchService,         ProductSearchService>();
// services.AddScoped<IFamilyBrowseService,          FamilyBrowseService>();
// services.AddScoped<IFurnitureSearchService,       FurnitureSearchService>();
// services.AddScoped<IProjectRecommendationService, ProjectRecommendationService>();
// services.AddScoped<IBillOfMaterialsService,       BillOfMaterialsService>();
// services.AddScoped<IChatSessionService,           ChatSessionService>();
// services.AddScoped<IAgentOrchestrator,            AgentOrchestrator>();
```

---

# Code Quality Standards

Apply throughout every single file without exception:

- All public methods have XML doc comments
- All async methods accept `CancellationToken` as the last parameter
- All `HttpClient` usage goes through `IHttpClientFactory` — never `new HttpClient()`
- All database operations wrapped in `try/catch` with `ILogger<T>` error logging
- No `async void` methods anywhere
- No `.Result` or `.Wait()` blocking calls on tasks
- EF Core read queries use `.AsNoTracking()`
- Complex search queries use Dapper, not EF Core LINQ
- All secrets and config values read from `IConfiguration` — never hardcoded
- `appsettings.Development.json` listed in `.gitignore`
- Use C# `record`s for immutable DTOs and response models
- Use C# primary constructors where appropriate

---

# Azure Stub Implementations

`AzureAiSearchService` and `AzureOpenAiEmbeddingService` must be written as proper stubs — not empty shells. They must:

- Have all interface methods implemented with the correct Azure SDK calls commented inline
- Include the required NuGet package references in comments at the top of each file
- Include the Azure configuration keys they will read from appsettings
- Throw `NotImplementedException` with a clear message pointing to the README Azure setup section
- Include a comment block at the top of each file: `// AZURE IMPLEMENTATION — uncomment when moving to hosted environment`

---

# Generation Phase Order

> **⚠ MANDATORY**
> Generate phases in exact order. Complete every file in a phase before starting the next. Never use `// TODO`, `// placeholder`, or empty method bodies. Every method must have complete, working implementation.

| Phase | Deliverables |
|-------|-------------|
| **Phase 1** | `BegaProductFinder.sln` and all `.csproj` files with complete NuGet package references |
| **Phase 2** | All files in `BegaProductFinder.Core`: models (including `BomModels.cs`), interfaces (all 9), DTOs, `AgentModels` |
| **Phase 3** | `AppDbContext`, `VectorDbContext`, all entity configurations, EF Core initial migration |
| **Phase 4** | `SpecNormalizer`, `JsonProductParser` (using real BEGA field names), `PdfTextExtractor` (SpecDocument only), `TextChunker`, `IngestionPipeline`, ingestion console app `Program.cs` |
| **Phase 5** | `OllamaEmbeddingService` (fully working), `PgVectorSearchService` (fully working), `AzureOpenAiEmbeddingService` (stub), `AzureAiSearchService` (stub) |
| **Phase 6** | `AgentTools` (all 8 tool JSON definitions), `SystemPromptBuilder`, `AgentOrchestrator` (full Claude API streaming + tool execution loop) |
| **Phase 7** | `ProductSearchService` (hybrid SQL+vector), `FamilyBrowseService`, `FurnitureSearchService`, `ProjectRecommendationService`, `BillOfMaterialsService`, `ChatSessionService` |
| **Phase 8** | `Program.cs` with full DI, `ChatEndpoints` (SSE streaming — all 5 event types), `ProductEndpoints`, `FurnitureEndpoints`, `ProjectEndpoints`, `BomEndpoints`, `AdminEndpoints`, `ServiceCollectionExtensions` |
| **Phase 9** | All Next.js 16 frontend files: `ProductCard`, `FurnitureCard`, `BomTable` (with CSV export), project area cards, hooks, types, `lib/api.ts`, SSE handling, `.env.local` |
| **Phase 10** | `README.md` with complete numbered setup steps, `.gitignore` |

---

# README.md Requirements

The README must contain exactly these sections with complete numbered instructions:

- **Prerequisites** — all tools with download links and minimum versions
- **PostgreSQL Setup Without Docker** — step by step Windows installation and pgvector extension setup
- **Ollama Setup** — install, pull `nomic-embed-text`, verify running
- **Configuration** — numbered list of every value to change in `appsettings.Development.json` and `frontend/.env.local`
- **Database Migration** — exact `dotnet ef` commands with `--project` and `--startup-project` flags
- **Running Ingestion** — exact `dotnet run` command with `--source` argument
- **Starting the API** — exact command and expected output confirming startup
- **Starting the Frontend** — exact commands
- **Verification** — test queries to confirm the agent is working (e.g. *"Show me exterior in-grade luminaires"*, *"I need a 24V DC luminaire with 30+ lumens"*)
- **Switching to Azure** — the exact environment variable names to set in Azure App Service when moving from local to hosted

---

# Final Instruction

> **START HERE**
>
> Begin with Phase 1. After completing each phase, state exactly: **"Phase N complete — ready for Phase N+1"** and wait for my confirmation before proceeding. If a single phase produces more files than fit in one response, output part 1, say *"Phase N part 1 of 2 — continuing"*, then output part 2, then mark the phase complete. Do not start Phase 2 until Phase 1 is confirmed. Every file in every phase must be completely implemented with no placeholder code.
