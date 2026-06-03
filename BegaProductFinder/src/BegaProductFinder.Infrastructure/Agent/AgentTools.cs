using System.Text.Json.Nodes;

namespace BegaProductFinder.Infrastructure.Agent;

/// <summary>
/// Produces the 8 Claude tool definitions sent in every request.
/// Descriptions are kept intentionally concise to minimise prompt tokens.
/// </summary>
public static class AgentTools
{
    public static JsonObject[] GetDefinitions() =>
    [
        SearchProducts(),
        GetProductDetail(),
        BrowseByHierarchy(),
        FilterBySpecs(),
        GetSpecDocumentContext(),
        RecommendForProject(),
        GenerateBillOfMaterials(),
        SearchFurniture()
    ];

    private static JsonObject SearchProducts() => Tool(
        "search_products",
        "Search the Bega luminaire catalog by natural language. Always populate expanded_queries with 3–5 synonym strings for parallel vector retrieval. Pass every stated requirement as a structured filter field — do not embed filters only in the query string.",
        new JsonObject
        {
            ["query"] = Prop("string", "Primary natural language description e.g. 'DALI-2 garden bollard 24V DC'", req: true),
            ["expanded_queries"] = new JsonObject
            {
                ["type"]        = "array",
                ["description"] = "Synonym/related concepts for parallel vector search e.g. ['DALI garden light','DALI landscape luminaire','garden bollard DALI-2']",
                ["items"]       = new JsonObject { ["type"] = "string" }
            },
            // ── Hierarchy ───────────────────────────────────────────────────
            ["category"]    = Prop("string",  "Exact value: 'Exterior' or 'Interior'"),
            ["group"]       = Prop("string",  "Luminaire type group e.g. 'garden', 'in-grade', 'wall'"),
            ["family_name"] = Prop("string",  "Family name e.g. 'Garden bollard'"),
            // ── Wattage ─────────────────────────────────────────────────────
            ["min_wattage_w"] = Prop("number", "Minimum LED wattage (W)"),
            ["max_wattage_w"] = Prop("number", "Maximum LED wattage (W)"),
            // ── Lumen output ────────────────────────────────────────────────
            ["min_lumen_output"] = Prop("number", "Minimum lumen output (lm)"),
            ["max_lumen_output"] = Prop("number", "Maximum lumen output (lm)"),
            // ── Beam angle range ────────────────────────────────────────────
            // Site ranges: Spot 0-10° · Very Narrow 11-20° · Narrow 21-39° · Wide 40-69° · Very Wide 70-90°
            ["min_beam_angle_deg"] = Prop("number", "Minimum beam angle in degrees e.g. 0 for Spot, 40 for Wide"),
            ["max_beam_angle_deg"] = Prop("number", "Maximum beam angle in degrees e.g. 10 for Spot, 69 for Wide"),
            // ── Color temperature ───────────────────────────────────────────
            // Exact DB values: 2200 · 2700 · 3000 · 3500 · 4000
            ["color_temperature_k"] = Prop("integer", "CCT in Kelvin. Exact values: 2200 | 2700 | 3000 | 3500 | 4000"),
            // ── Voltage ─────────────────────────────────────────────────────
            // Exact DB values: "12V AC" · "24V DC" · "120V AC" · "120-277V AC" · "277V AC"
            ["voltage"] = Prop("string", "Exact voltage string: '12V AC' | '24V DC' | '120V AC' | '120-277V AC' | '277V AC'"),
            // ── Control protocol ────────────────────────────────────────────
            // Exact DB values: "0-10V" · "ELV/TRIAC" · "DALI-2" · "DMX"
            ["control_protocol"] = Prop("string", "Exact protocol: '0-10V' | 'ELV/TRIAC' | 'DALI-2' | 'DMX'. 'DALI' also matches 'DALI-2'."),
            // ── Application ─────────────────────────────────────────────────
            // Exact DB values: "Accent" · "Emergency" · "Facade" · "Pathway" · "Roadway" · "Site & Area" · "Unshielded"
            ["application"] = Prop("string", "Exact application: 'Accent' | 'Emergency' | 'Facade' | 'Pathway' | 'Roadway' | 'Site & Area' | 'Unshielded'"),
            // ── Distribution ────────────────────────────────────────────────
            // Exact DB values: "Type I" · "Type II" · "Type III" · "Type IV" · "Type V"
            ["distribution"] = Prop("string", "Light distribution: 'Type I' | 'Type II' | 'Type III' | 'Type IV' | 'Type V'"),
            // ── Dynamic light ───────────────────────────────────────────────
            // Exact DB values: "RGBW" · "Tunable White"
            ["dynamic_light"] = Prop("string", "Dynamic light type: 'RGBW' | 'Tunable White'"),
            // ── Compliance / environmental ──────────────────────────────────
            // DB column: SocialEnviornmentalHealth
            // Exact values: "International Dark Sky" · "Wildlife Friendly" · "EPD Available" · "FSC certified wood"
            ["compliance"] = Prop("string", "Compliance: 'International Dark Sky' | 'Wildlife Friendly' | 'EPD Available' | 'FSC certified wood'"),
            // ── Price range ─────────────────────────────────────────────────────
            // Use when a semantic query also has a price constraint.
            // "under $500" → max_dnp_price=500  |  "above $300" → min_dnp_price=300
            // "between $200–$600" → min=200, max=600  |  "exactly $700" → min=700, max=700
            // Products with no DNP price on file are excluded when either field is set.
            ["min_dnp_price"] = Prop("number", "Minimum DNP price USD — 'above $X' | 'more than $X' | 'higher than $X'"),
            ["max_dnp_price"] = Prop("number", "Maximum DNP price USD — 'under $X' | 'below $X' | 'less than $X' | 'max $X'"),
            // ── Boolean flags ───────────────────────────────────────────────
            ["ada_compliant"]    = Prop("boolean", "ADA compliant products only"),
            ["express_delivery"] = Prop("boolean", "EXPRESS / quick-ship products only (lead time: one week)"),
            // ── Pagination / deduplication ──────────────────────────────────
            ["exclude_catalog_numbers"] = new JsonObject
            {
                ["type"]        = "array",
                ["description"] = "Catalog numbers already shown to the user — pass all previously returned catalog numbers to get a genuinely new page of results.",
                ["items"]       = new JsonObject { ["type"] = "string" }
            },
            ["top_k"]            = Prop("integer", "Max results — always pass 3")
        },
        ["query"]);

    private static JsonObject GetProductDetail() => Tool(
        "get_product_detail",
        "Full specification for one BEGA product by catalog number.",
        new JsonObject
        {
            ["catalog_number"] = Prop("string", "BEGA catalog number e.g. '77127'", req: true)
        },
        ["catalog_number"]);

    private static JsonObject BrowseByHierarchy() => Tool(
        "browse_by_hierarchy",
        "Explore the BEGA catalog hierarchy: categories → groups → families → products. Use to discover available product types.",
        new JsonObject
        {
            ["level"] = new JsonObject
            {
                ["type"] = "string",
                ["description"] = "Hierarchy level",
                ["enum"] = new JsonArray { "categories", "groups", "families", "products" }
            },
            ["category"]    = Prop("string", "Filter by category. Required for 'groups' and 'families'"),
            ["group"]       = Prop("string", "Filter by group. Required for 'families'"),
            ["family_slug"] = Prop("string", "Family slug. Required for 'products'")
        },
        ["level"]);

    private static JsonObject FilterBySpecs() => Tool(
        "filter_by_specs",
        "Exact numerical filter on product specs. Keys: WattageW | SystemWattageW | LumenOutputLm | BeamAngleDeg | DnpPrice | MsrpPrice.",
        new JsonObject
        {
            ["filters"] = new JsonObject
            {
                ["type"] = "array",
                ["description"] = "Filter conditions (ANDed)",
                ["items"] = new JsonObject
                {
                    ["type"] = "object",
                    ["properties"] = new JsonObject
                    {
                        ["spec_key"]  = Prop("string", "WattageW|SystemWattageW|LumenOutputLm|BeamAngleDeg|DnpPrice|MsrpPrice"),
                        ["operator"]  = new JsonObject
                        {
                            ["type"] = "string",
                            ["enum"] = new JsonArray { "gte", "lte", "eq", "between" }
                        },
                        ["value"]     = Prop("number", "Comparison value (lower bound for 'between')"),
                        ["value_max"] = Prop("number", "Upper bound for 'between'")
                    },
                    ["required"] = new JsonArray { "spec_key", "operator", "value" }
                }
            }
        },
        ["filters"]);

    private static JsonObject GetSpecDocumentContext() => Tool(
        "get_spec_document_context",
        "Search spec PDF text for installation, certification, photometric, or mounting details.",
        new JsonObject
        {
            ["product_id"] = Prop("integer", "Product ID from a prior search", req: true),
            ["question"]   = Prop("string",  "Technical question e.g. 'What is the mounting depth?'", req: true)
        },
        ["product_id", "question"]);

    private static JsonObject RecommendForProject() => Tool(
        "recommend_for_project",
        "Multi-area product recommendations for a named project type (hotel, villa, campus, park, hospital, airport, etc.).",
        new JsonObject
        {
            ["project_type"]   = Prop("string", "e.g. '5-star hotel', 'university campus', 'luxury villa'", req: true),
            ["areas"]          = new JsonObject
            {
                ["type"] = "array",
                ["description"] = "Areas to cover e.g. ['entrance','pathways','facade']",
                ["items"] = new JsonObject { ["type"] = "string" }
            },
            ["budget_usd"]     = Prop("number", "Total DNP budget ceiling in USD"),
            ["style_keywords"] = new JsonObject
            {
                ["type"] = "array",
                ["description"] = "Style hints e.g. ['minimalist','warm white','dark sky']",
                ["items"] = new JsonObject { ["type"] = "string" }
            },
            ["category"] = Prop("string", "'Exterior' | 'Interior' | omit for both")
        },
        ["project_type"]);

    private static JsonObject GenerateBillOfMaterials() => Tool(
        "generate_bill_of_materials",
        "Priced BOM from catalog numbers and quantities. Always call this — never estimate prices from memory.",
        new JsonObject
        {
            ["items"] = new JsonObject
            {
                ["type"] = "array",
                ["description"] = "Line items",
                ["items"] = new JsonObject
                {
                    ["type"] = "object",
                    ["properties"] = new JsonObject
                    {
                        ["catalog_number"] = Prop("string",  "BEGA catalog number"),
                        ["quantity"]       = Prop("integer", "Units"),
                        ["area_label"]     = Prop("string",  "Location label e.g. 'Main entrance'")
                    },
                    ["required"] = new JsonArray { "catalog_number", "quantity" }
                }
            },
            ["project_name"] = Prop("string", "Optional project name")
        },
        ["items"]);

    private static JsonObject SearchFurniture() => Tool(
        "search_furniture",
        "Search BEGA outdoor furniture: benches, chairs, tables, planters, bike racks, litter bins, modular furniture. " +
        "Always include the space/location context in query (e.g. 'outdoor benches for a public plaza'). " +
        "Use furniture_type only to filter by a specific furniture category. Never pass a space name as application.",
        new JsonObject
        {
            ["query"]          = Prop("string",  "Natural language description including space context e.g. 'outdoor seating for a university campus plaza'", req: true),
            ["furniture_type"] = Prop("string",  "bench|chair|table|planter|bike rack|litter bin|modular furniture|partition — omit to search all types"),
            ["material"]       = Prop("string",  "Finish or material e.g. 'steel', 'concrete', 'wood' — omit unless user specifies"),
            ["illuminated"]    = Prop("boolean", "true = furniture with integrated lighting only"),
            ["exclude_catalog_numbers"] = new JsonObject
            {
                ["type"]        = "array",
                ["description"] = "Catalog numbers already shown to the user — pass all previously returned catalog numbers to get a genuinely new page of results.",
                ["items"]       = new JsonObject { ["type"] = "string" }
            },
            ["top_k"]          = Prop("integer", "Max results — always pass 6")
        },
        ["query"]);

    // ── Schema helpers ────────────────────────────────────────────────────────

    private static JsonObject Tool(string name, string description, JsonObject properties, string[] required) =>
        new()
        {
            ["name"] = name,
            ["description"] = description,
            ["input_schema"] = new JsonObject
            {
                ["type"] = "object",
                ["properties"] = properties,
                ["required"] = new JsonArray(required.Select(r => (JsonNode)r!).ToArray())
            }
        };

    private static JsonObject Prop(string type, string description, bool req = false) =>
        new() { ["type"] = type, ["description"] = description };
}
