using System.Text.Json.Nodes;

namespace BegaProductFinder.Infrastructure.Agent;

/// <summary>
/// Produces the 8 Claude tool definitions sent in every request to the Anthropic Messages API.
/// Tool schemas follow JSON Schema Draft-07 as required by the Anthropic API.
/// </summary>
public static class AgentTools
{
    /// <summary>Returns all 8 tool definitions ready for serialization into the Claude API request.</summary>
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

    // ── Tool 1 ────────────────────────────────────────────────────────────────

    private static JsonObject SearchProducts() => Tool(
        name: "search_products",
        description:
            "Natural language product search across the BEGA luminaire catalog. " +
            "Use for any query about finding luminaires by type, feature, application, environment, " +
            "compliance, technology, or photometric spec. Returns matching products with key specs, " +
            "image URLs, spec document URL, and a match score.",
        properties: new JsonObject
        {
            ["query"] = Prop("string", "Natural language description of the required luminaire e.g. 'exterior in-grade 24V dark sky compliant'", required: true),
            ["category"] = Prop("string", "Filter to 'Exterior' or 'Interior'"),
            ["group"] = Prop("string", "Filter to a group name e.g. 'In-grade', 'Recessed-wall', 'Ceiling'"),
            ["family_name"] = Prop("string", "Filter to a family name e.g. 'In-grade luminaire'"),
            ["min_wattage_w"] = Prop("number", "Minimum LED wattage in watts (inclusive)"),
            ["max_wattage_w"] = Prop("number", "Maximum LED wattage in watts (inclusive)"),
            ["min_lumen_output"] = Prop("number", "Minimum lumen output in lumens (inclusive)"),
            ["beam_angle_deg"] = Prop("number", "Exact beam angle in degrees"),
            ["color_temperature_k"] = Prop("integer", "Colour temperature in Kelvin e.g. 2700, 3000, 3500, 4000"),
            ["voltage"] = Prop("string", "Voltage spec substring e.g. '24V DC', '120V'"),
            ["control_protocol"] = Prop("string", "Control protocol e.g. 'DALI', '0-10V', 'Non-Dimming'"),
            ["ada_compliant"] = Prop("boolean", "When true, restrict to ADA-compliant products only"),
            ["express_delivery"] = Prop("boolean", "When true, restrict to express-delivery products only"),
            ["top_k"] = Prop("integer", "Maximum number of results to return. Default 5")
        },
        required: ["query"]);

    // ── Tool 2 ────────────────────────────────────────────────────────────────

    private static JsonObject GetProductDetail() => Tool(
        name: "get_product_detail",
        description:
            "Retrieve the complete specification record for one specific BEGA luminaire or furniture product " +
            "by its catalog number. Use when the user asks about a specific catalog number or when you need " +
            "the full spec after a search. Returns all electrical specs, physical dimensions, " +
            "colour temperature options, voltage, control protocol, accessories, and document URLs.",
        properties: new JsonObject
        {
            ["catalog_number"] = Prop("string", "BEGA catalog number e.g. '77127'", required: true)
        },
        required: ["catalog_number"]);

    // ── Tool 3 ────────────────────────────────────────────────────────────────

    private static JsonObject BrowseByHierarchy() => Tool(
        name: "browse_by_hierarchy",
        description:
            "Navigate the BEGA product hierarchy — Category → Group → Family → Products — " +
            "to help users explore the catalog structure. Use when the user wants to browse or discover " +
            "what product types are available, rather than searching for a specific requirement.",
        properties: new JsonObject
        {
            ["level"] = new JsonObject
            {
                ["type"] = "string",
                ["description"] = "Hierarchy level to retrieve",
                ["enum"] = new JsonArray { "categories", "groups", "families", "products" }
            },
            ["category"] = Prop("string", "Filter by category e.g. 'Exterior'. Required for levels 'groups' and 'families'"),
            ["group"] = Prop("string", "Filter by group name e.g. 'In-grade'. Required for level 'families'"),
            ["family_slug"] = Prop("string", "Family slug identifier. Required for level 'products'")
        },
        required: ["level"]);

    // ── Tool 4 ────────────────────────────────────────────────────────────────

    private static JsonObject FilterBySpecs() => Tool(
        name: "filter_by_specs",
        description:
            "Precise numerical filtering on product specification columns. " +
            "Use when the user has an exact numerical requirement such as 'lumens >= 500', " +
            "'wattage between 5W and 20W', or 'price under $500'. " +
            "Known spec_key values: WattageW, SystemWattageW, LumenOutputLm, BeamAngleDeg, DnpPrice, MsrpPrice.",
        properties: new JsonObject
        {
            ["filters"] = new JsonObject
            {
                ["type"] = "array",
                ["description"] = "One or more filter conditions — all conditions are ANDed together",
                ["items"] = new JsonObject
                {
                    ["type"] = "object",
                    ["properties"] = new JsonObject
                    {
                        ["spec_key"] = Prop("string", "Column name: WattageW | SystemWattageW | LumenOutputLm | BeamAngleDeg | DnpPrice | MsrpPrice"),
                        ["operator"] = new JsonObject
                        {
                            ["type"] = "string",
                            ["enum"] = new JsonArray { "gte", "lte", "eq", "between" }
                        },
                        ["value"] = Prop("number", "Primary comparison value. For 'between', this is the lower bound"),
                        ["value_max"] = Prop("number", "Upper bound — only used with operator 'between'")
                    },
                    ["required"] = new JsonArray { "spec_key", "operator", "value" }
                }
            }
        },
        required: ["filters"]);

    // ── Tool 5 ────────────────────────────────────────────────────────────────

    private static JsonObject GetSpecDocumentContext() => Tool(
        name: "get_spec_document_context",
        description:
            "Search the extracted spec document text for a specific luminaire to answer deep technical questions " +
            "about installation procedures, certifications, photometric data, mounting requirements, " +
            "wiring diagrams, or safety ratings. Use when the user asks a question that requires " +
            "information beyond the structured catalog data.",
        properties: new JsonObject
        {
            ["product_id"] = Prop("integer", "Internal product ID from a previous search or product detail call", required: true),
            ["question"] = Prop("string", "The specific technical question to answer e.g. 'What is the mounting depth?'", required: true)
        },
        required: ["product_id", "question"]);

    // ── Tool 6 ────────────────────────────────────────────────────────────────

    private static JsonObject RecommendForProject() => Tool(
        name: "recommend_for_project",
        description:
            "Generate a curated multi-area product recommendation set for a named project type or building typology. " +
            "Use whenever the user mentions a project type (hotel, campus, villa, park, airport, hospital, " +
            "residential community, shopping mall) or asks for lighting recommendations for a named building use. " +
            "Also use when a budget ceiling is provided alongside a project description.",
        properties: new JsonObject
        {
            ["project_type"] = Prop("string", "Named project type e.g. '5-star hotel', 'university campus', 'luxury villa', 'public park'", required: true),
            ["areas"] = new JsonObject
            {
                ["type"] = "array",
                ["description"] = "Project areas to recommend for e.g. ['entrance', 'pathways', 'facade', 'parking', 'pool area']",
                ["items"] = new JsonObject { ["type"] = "string" }
            },
            ["budget_usd"] = Prop("number", "Upper ceiling on total DNP in USD. Lower-price options are prioritised when set"),
            ["style_keywords"] = new JsonObject
            {
                ["type"] = "array",
                ["description"] = "Design style hints e.g. ['minimalist', 'warm white', 'dark sky compliant']",
                ["items"] = new JsonObject { ["type"] = "string" }
            },
            ["category"] = Prop("string", "Scope to 'Exterior', 'Interior', or omit for both")
        },
        required: ["project_type"]);

    // ── Tool 7 ────────────────────────────────────────────────────────────────

    private static JsonObject GenerateBillOfMaterials() => Tool(
        name: "generate_bill_of_materials",
        description:
            "Assemble a structured, priced bill of materials from a list of catalog numbers and quantities. " +
            "Use when the user asks for a BOM, cost estimate, price breakdown, or quantity list. " +
            "Never estimate prices from memory — always call this tool to get real DNP/MSRP from the catalog database.",
        properties: new JsonObject
        {
            ["items"] = new JsonObject
            {
                ["type"] = "array",
                ["description"] = "Line items for the BOM",
                ["items"] = new JsonObject
                {
                    ["type"] = "object",
                    ["properties"] = new JsonObject
                    {
                        ["catalog_number"] = Prop("string", "BEGA catalog number e.g. '77127'"),
                        ["quantity"] = Prop("integer", "Number of units"),
                        ["area_label"] = Prop("string", "Area or location label e.g. 'Main entrance'")
                    },
                    ["required"] = new JsonArray { "catalog_number", "quantity" }
                }
            },
            ["project_name"] = Prop("string", "Optional project name included in the BOM header")
        },
        required: ["items"]);

    // ── Tool 8 ────────────────────────────────────────────────────────────────

    private static JsonObject SearchFurniture() => Tool(
        name: "search_furniture",
        description:
            "Search BEGA's outdoor furniture and urban design element catalog — separate from luminaires. " +
            "Use when the user asks about benches, seating, litter bins, planters, bollard-furniture, " +
            "modular furniture, cycle stands, or any non-luminaire BEGA product. " +
            "Furniture products have no wattage, lumen, or CCT attributes.",
        properties: new JsonObject
        {
            ["query"] = Prop("string", "Natural language description e.g. 'outdoor benches for a waterfront plaza'", required: true),
            ["furniture_type"] = Prop("string", "Product type e.g. 'bench', 'bollard', 'planter', 'modular seating', 'litter bin', 'cycle stand'"),
            ["application"] = Prop("string", "Application context e.g. 'public plaza', 'campus', 'waterfront', 'smart city'"),
            ["material"] = Prop("string", "Material preference e.g. 'steel', 'concrete', 'wood'"),
            ["illuminated"] = Prop("boolean", "When true, restrict to furniture with integrated lighting"),
            ["top_k"] = Prop("integer", "Maximum number of results to return. Default 5")
        },
        required: ["query"]);

    // ── Schema helpers ────────────────────────────────────────────────────────

    private static JsonObject Tool(
        string name,
        string description,
        JsonObject properties,
        string[] required) => new()
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

    private static JsonObject Prop(string type, string description, bool required = false) => new()
    {
        ["type"] = type,
        ["description"] = description
    };
}
