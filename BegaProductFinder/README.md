# BEGA AI Product Finder

AI-powered conversational agent for searching and specifying BEGA architectural luminaires, outdoor furniture, and complete lighting solutions. Built on .NET 8, Next.js 15, Claude API, pgvector, and SQL Server.

---

## Prerequisites

Install all tools below before proceeding.

| Tool | Minimum Version | Download |
|------|----------------|---------|
| .NET SDK | 8.0 | https://dotnet.microsoft.com/download/dotnet/8 |
| SQL Server | 2019 or later (Express is sufficient) | https://www.microsoft.com/en-us/sql-server/sql-server-downloads |
| PostgreSQL | 16 | https://www.postgresql.org/download/windows/ |
| Node.js | 20.9 or later | https://nodejs.org/en/download |
| Ollama | 0.3 or later | https://ollama.com/download |
| Git | any recent | https://git-scm.com/downloads |

Verify installed versions:

```
dotnet --version          # must be 8.x
node --version            # must be 20.9+
npm --version
ollama --version
```

---

## 1 — PostgreSQL Setup (No Docker)

1. Run the PostgreSQL 16 installer. When prompted, set a password for the `postgres` user — note it down, you will need it in step 4.

2. After installation, open **pgAdmin 4** (installed alongside PostgreSQL) or the **psql** command-line tool.

3. Connect as the `postgres` user and run the following SQL to enable the pgvector extension and create the database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE bega_vectors;
```

   If pgvector is not found, install it from https://github.com/pgvector/pgvector?tab=readme-ov-file#windows.

4. Verify by running:

```sql
\c bega_vectors
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

   You should see a version string such as `0.7.0`.

---

## 2 — Ollama Setup

1. Download and install Ollama from https://ollama.com/download (Windows installer).

2. Open a new terminal and pull the embedding model:

```
ollama pull nomic-embed-text
```

   This downloads approximately 274 MB. The model produces 768-dimensional vectors.

3. Verify Ollama is running and the model is available:

```
ollama list
```

   You should see `nomic-embed-text` in the list.

4. Ollama starts automatically as a background service on Windows. If it is not running, start it with:

```
ollama serve
```

   It listens on `http://localhost:11434` by default.

---

## 3 — SQL Server Setup

1. In SQL Server Management Studio (SSMS) or the `sqlcmd` CLI, connect to your local instance.

2. Create the application database:

```sql
CREATE DATABASE BegaProductFinder;
```

   The connection string `Server=localhost;Database=BegaProductFinder;Trusted_Connection=True;TrustServerCertificate=True;` uses Windows Authentication. If you use SQL Authentication, adjust the string in step 4.

---

## 4 — Configuration

All secrets and environment-specific values go in `src/BegaProductFinder.API/appsettings.Development.json`. This file is git-ignored and must never be committed.

Open the file and replace every `REPLACE_WITH_*` value:

```
src/BegaProductFinder.API/appsettings.Development.json
```

| Setting | Where to get it | Example value |
|---------|----------------|--------------|
| `Anthropic:ApiKey` | https://console.anthropic.com → API Keys | `sk-ant-api03-...` |
| `ConnectionStrings:SqlServer` | Your SQL Server instance | `Server=localhost;Database=BegaProductFinder;Trusted_Connection=True;TrustServerCertificate=True;` |
| `ConnectionStrings:VectorDb` | PostgreSQL credentials from step 1 | `Host=localhost;Port=5432;Database=bega_vectors;Username=postgres;Password=YOUR_PG_PASSWORD` |
| `Embeddings:Provider` | Always `ollama` for local dev | `ollama` |
| `Embeddings:OllamaBaseUrl` | Ollama default | `http://localhost:11434` |
| `Embeddings:OllamaModel` | Must match the pulled model | `nomic-embed-text` |
| `VectorSearch:Provider` | Always `pgvector` for local dev | `pgvector` |
| `Ingestion:ProductJsonPath` | Absolute path to your BEGA products JSON | `C:\BegaData\products.json` |
| `Ingestion:PdfDownloadPath` | Folder where spec PDFs are cached | `C:\BegaData\Pdfs\` |
| `AdminApiKey` | Any strong random string you choose | `my-secret-admin-key-2025` |

The ingestion console app (`BegaProductFinder.Ingestion`) reads its own copy of these settings. Open the matching file and set the same values:

```
src/BegaProductFinder.Ingestion/appsettings.json
```

### Frontend environment

Open `frontend/.env.local` (created automatically with the correct default):

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

This points the Next.js dev server at the .NET API. Change the port only if you start the API on a different port.

---

## 5 — Database Migration

Run the EF Core migration to create the SQL Server schema (Products, ProductAccessories, ProductChunks, ChatSessions tables):

```
cd BegaProductFinder

dotnet ef database update \
  --project src/BegaProductFinder.Infrastructure \
  --startup-project src/BegaProductFinder.API
```

On Windows PowerShell:

```powershell
cd BegaProductFinder

dotnet ef database update `
  --project src/BegaProductFinder.Infrastructure `
  --startup-project src/BegaProductFinder.API
```

Expected output:

```
Build started...
Build succeeded.
Applying migration '20260528044419_InitialCreate'.
Done.
```

The pgvector schema (the `product_chunks` table in PostgreSQL) is created automatically on the first ingestion run — no separate migration step is needed.

If you need to generate a new migration after a model change:

```
dotnet ef migrations add <MigrationName> \
  --project src/BegaProductFinder.Infrastructure \
  --startup-project src/BegaProductFinder.API
```

---

## 6 — Running Ingestion

The ingestion pipeline parses the BEGA products JSON, upserts records into SQL Server, downloads spec PDFs, chunks text, generates embeddings via Ollama, and indexes vectors in pgvector.

**Full ingestion (first run):**

```
dotnet run --project src/BegaProductFinder.Ingestion -- --source "C:\BegaData\products.json"
```

**Skip PDF downloads (fast re-run, e.g. after a code change):**

```
dotnet run --project src/BegaProductFinder.Ingestion -- --source "C:\BegaData\products.json" --skip-pdfs
```

**Reset and re-ingest everything from scratch:**

```
dotnet run --project src/BegaProductFinder.Ingestion -- --source "C:\BegaData\products.json" --reset
```

Expected console output for a full run:

```
[Stage 1/6] Parsing product JSON...              2,500 products found
[Stage 2/6] Upserting SQL Server records...      2,500 / 2,500
[Stage 3/6] Downloading Spec PDFs...             2,100 / 2,500  (400 skipped/failed)
[Stage 4/6] Chunking text...                     8,400 chunks created
[Stage 5/6] Generating embeddings (Ollama)...    8,400 / 8,400
[Stage 6/6] Indexing vectors (pgvector)...       8,400 / 8,400

Ingestion complete in 14m 20s
Products: 2,500 | Chunks: 8,400 | PDFs: 2,100 | Failures: 12
```

A failure log is written to `C:\BegaData\ingestion_failures.log` listing any PDF URLs that could not be downloaded.

> **Note:** Ingestion is idempotent. Re-running without `--reset` only processes records that have not yet been embedded (`IsEmbedded = 0`). It is safe to interrupt and resume.

---

## 7 — Starting the API

From the solution root:

```
dotnet run --project src/BegaProductFinder.API
```

Expected startup output:

```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

The API exposes:

| Endpoint | Description |
|----------|-------------|
| `POST /api/chat/message` | SSE streaming chat (main agent) |
| `GET /api/products/search` | Natural language product search |
| `GET /api/products/{catalogNumber}` | Full product detail |
| `GET /api/products/hierarchy` | Category/group/family tree |
| `GET /api/furniture/search` | Furniture search |
| `POST /api/projects/recommend` | Project area recommendations |
| `POST /api/bom/generate` | Bill of materials |
| `POST /api/admin/ingest/trigger` | Trigger ingestion (X-Admin-Api-Key required) |
| `GET /swagger` | Swagger UI (Development only) |

---

## 8 — Starting the Frontend

In a separate terminal:

```
cd BegaProductFinder/frontend
npm install        # first time only
npm run dev
```

The Next.js development server starts on `http://localhost:3000`.

Open your browser to `http://localhost:3000` to use the chat interface.

For a production build:

```
npm run build
npm start
```

---

## 9 — Verification

With both the API and frontend running, try these queries in the chat interface to confirm everything is working end to end:

1. **Basic product search:**
   > Show me exterior in-grade luminaires

2. **Spec filter:**
   > I need a 24V DC luminaire with at least 30 lumens output

3. **Project recommendation:**
   > Recommend lighting for a 5-star hotel entrance

4. **Budget-bounded project:**
   > Suggest outdoor lighting for a luxury villa under $20,000

5. **Furniture:**
   > Find outdoor benches suitable for a waterfront promenade

6. **BOM generation:**
   > Generate a bill of materials for catalog numbers 77127 (qty 4) and 77211 (qty 8)

7. **Technical spec query:**
   > Find luminaires with DALI control and 3000K color temperature for a university campus

Each query should produce a streamed text response. Queries involving product searches return `ProductCard` panels. Project queries return area cards grouped by zone. BOM queries render the sortable `BomTable` with a CSV export button.

If the agent returns "No suitable BEGA products were found", the ingestion pipeline may not have completed successfully. Check the API logs and re-run ingestion.

---

## 10 — Switching to Azure

When you are ready to move from the local POC to a hosted Azure environment, no code changes are required. Only configuration values change.

In Azure App Service → Configuration → Application Settings, set the following environment variables (ASP.NET Core reads double-underscore `__` as a nested config separator):

### Embedding service

| App Setting Name | Value |
|-----------------|-------|
| `Embeddings__Provider` | `azureopenai` |
| `Embeddings__AzureOpenAiEndpoint` | Your Azure OpenAI endpoint URL |
| `Embeddings__AzureOpenAiApiKey` | Your Azure OpenAI API key |
| `Embeddings__AzureOpenAiDeploymentName` | Your deployment name (e.g. `text-embedding-3-small`) |
| `Embeddings__Dimensions` | `1536` (for `text-embedding-3-small`) or `768` (for `text-embedding-ada-002`) |

### Vector search

| App Setting Name | Value |
|-----------------|-------|
| `VectorSearch__Provider` | `azureaisearch` |
| `VectorSearch__AzureSearchEndpoint` | Your Azure AI Search endpoint URL |
| `VectorSearch__AzureSearchApiKey` | Your Azure AI Search admin key |
| `VectorSearch__AzureSearchIndexName` | `bega-products` (or your chosen index name) |

### Other settings

| App Setting Name | Value |
|-----------------|-------|
| `Anthropic__ApiKey` | Your Anthropic API key |
| `ConnectionStrings__SqlServer` | Azure SQL Database connection string |
| `AdminApiKey` | A strong random string for the admin endpoint |
| `Cors__AllowedOrigins__0` | Your frontend domain, e.g. `https://bega-finder.azurewebsites.net` |

> **Important:** The `VectorDb` connection string (PostgreSQL) is no longer needed when using Azure AI Search. Leave it empty or remove it from the configuration.

After setting these values and redeploying the application, run the ingestion pipeline once against Azure AI Search (or re-index from SQL Server). The API and agent layers require no modifications.

### Uncommenting the Azure implementations

The Azure concrete classes (`AzureAiSearchService.cs` and `AzureOpenAiEmbeddingService.cs`) contain the full implementation in commented blocks. When the provider switch activates them via DI, uncomment the method bodies and add the required NuGet packages listed at the top of each file.

---

## Project Structure

```
BegaProductFinder/
├── src/
│   ├── BegaProductFinder.API/          # ASP.NET Core Minimal API
│   │   ├── Endpoints/                  # ChatEndpoints, ProductEndpoints, etc.
│   │   ├── Extensions/                 # DI extensions, endpoint mapping
│   │   └── Program.cs
│   ├── BegaProductFinder.Core/         # Domain models and interfaces
│   ├── BegaProductFinder.Infrastructure/
│   │   ├── Agent/                      # Claude API orchestrator, tools, system prompt
│   │   ├── Data/                       # EF Core DbContext, migrations
│   │   ├── Embeddings/                 # Ollama + Azure OpenAI
│   │   ├── Ingestion/                  # 6-stage ingestion pipeline
│   │   ├── Search/                     # pgvector + Azure AI Search
│   │   └── Services/                   # Business services (search, BOM, project rec.)
│   └── BegaProductFinder.Ingestion/    # Console app for pipeline runs
├── frontend/                           # Next.js 15 chat UI
│   ├── app/                            # App Router pages and API proxy
│   ├── components/
│   │   ├── chat/                       # ChatWindow, MessageBubble, ChatInput
│   │   └── product/                    # ProductCard, FurnitureCard, BomTable
│   ├── hooks/                          # useChatSession (SSE streaming hook)
│   ├── lib/                            # API client functions
│   └── types/                          # TypeScript type definitions
└── specsMapping.json                   # Spec field normalisation config
```
