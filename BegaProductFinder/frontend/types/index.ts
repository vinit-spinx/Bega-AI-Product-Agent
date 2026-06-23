// ── Product catalog types (mirrors C# models) ─────────────────────────────────

export interface ColorTemperatureOption {
  kelvin: number;
  code: string;
}

/** A real-world BEGA installation project that features a product. slug is a full URL when present. */
export interface ProductProject {
  name: string | null;
  location: string | null;
  listingImage: string | null;
  slug: string | null;
}

export interface ProductSearchResult {
  productId: number;
  catalogNumber: string;
  familyName?: string;
  familySlug?: string;
  subFamilyName?: string;
  categoryName?: string;
  groupSlug?: string;
  groupsName?: string;
  luminaireType?: string;
  familyListPageImage?: string;
  familyTechImage?: string;
  ledWattage?: string;
  wattageW?: number;
  systemWattageW?: number;
  lumenOutputLm?: number;
  beamAngleDeg?: number;
  /** JSON string: ColorTemperatureOption[] */
  colorTemperatureJson?: string;
  voltage?: string;
  controlProtocol?: string;
  application?: string;
  distribution?: string;
  isAdaCompliant: boolean;
  isExpressDelivery: boolean;
  leadTime?: string;
  dimensionA?: string;
  dimensionAFraction?: string;
  dimensionB?: string;
  dimensionBFraction?: string;
  dimensionC?: string;
  dimensionCFraction?: string;
  dnpPrice?: number;
  msrpPrice?: number;
  specDocumentUrl?: string;
  technicalDocumentUrl?: string;
  matchScore: number;
  /** Real-world projects featuring this product. Up to 3 for search results, all for detail. */
  projects?: ProductProject[];
}

export interface ProductDetail extends ProductSearchResult {
  dynamicLight?: string;
  finish?: string;
  ratingB?: string;
  ratingU?: string;
  ratingG?: string;
  dimensionD?: string;
  dimensionDFraction?: string;
  dimensionE?: string;
  dimensionEFraction?: string;
  socialEnviornmentalHealth?: string;
  replacementCatalogNumber?: string;
  extraInfo?: string;
  /** JSON string: string[] */
  productOptionsJson?: string;
  accessories: string[];
}

export interface FurnitureSearchResult {
  productId: number;
  catalogNumber: string;
  familyName?: string;
  subFamilyName?: string;
  groupsName?: string;
  categoryName?: string;
  familyListPageImage?: string;
  application?: string;
  finish?: string;
  leadTime?: string;
  dimensionA?: string;
  dimensionAFraction?: string;
  dimensionB?: string;
  dimensionBFraction?: string;
  dimensionC?: string;
  dimensionCFraction?: string;
  dimensionD?: string;
  dimensionDFraction?: string;
  dimensionE?: string;
  dimensionEFraction?: string;
  specDocumentUrl?: string;
  technicalDocumentUrl?: string;
  matchScore: number;
  /** Real-world projects featuring this furniture item. Up to 3 entries. */
  projects?: ProductProject[];
}

export interface FamilyBrowseResult {
  familyName: string;
  familySlug: string;
  subFamilyName?: string;
  categoryName: string;
  groupSlug: string;
  groupsName: string;
  productCount: number;
}

// ── BOM types ─────────────────────────────────────────────────────────────────

export interface BomLineItem {
  catalogNumber: string;
  description?: string;
  familyName?: string;
  areaLabel?: string;
  quantity: number;
  unitDnp?: number;
  lineTotalDnp?: number;
  unitMsrp?: number;
  lineTotalMsrp?: number;
  leadTime?: string;
  /** System wattage per fixture (W). Null for furniture or products without electrical data. */
  systemWattageW?: number;
}

export interface BomReport {
  projectName?: string;
  lineItems: BomLineItem[];
  subtotalDnp: number;
  subtotalMsrp: number;
  currency: string;
  itemCount: number;
  notFoundItems: string[];
  /** Sum of (systemWattageW × quantity) across all lighting line items. 0 for furniture-only BOMs. */
  totalSystemWattageW: number;
}

// ── Project recommendation types ──────────────────────────────────────────────

export interface ProjectAreaRecommendation {
  areaName: string;
  recommendedProducts: ProductSearchResult[];
  rationale: string;
  estimatedTotalDnp: number;
}

// ── SSE event types ───────────────────────────────────────────────────────────

// ── Vision placement map types ────────────────────────────────────────────────

/**
 * A single product placement annotation on a vision-analysed image.
 * x and y are image percentages (0 = left/top, 100 = right/bottom).
 */
export interface PlacementMapItem {
  id: number;
  catalogNumber: string;
  label: string;
  x: number;
  y: number;
  zone: string;
}

// ── SSE event types ───────────────────────────────────────────────────────────

export type SseEventType =
  | 'text_delta'
  | 'products'
  | 'furniture'
  | 'project_recommendation'
  | 'bom'
  | 'suggested_actions'
  | 'placement_map'
  | 'done'
  | 'error';

export type SseEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'products'; products: ProductSearchResult[] }
  | { type: 'furniture'; items: FurnitureSearchResult[] }
  | { type: 'project_recommendation'; areas: ProjectAreaRecommendation[] }
  | { type: 'bom'; report: BomReport }
  | { type: 'suggested_actions'; actions: string[] }
  | { type: 'placement_map'; markers: PlacementMapItem[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

// ── Chat UI types ─────────────────────────────────────────────────────────────

/** Attached image shown in the user bubble (data URL for preview only, never stored). */
export interface ImageAttachment {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

// ── In-conversation flow cards ─────────────────────────────────────────────────
// Deterministic, client-driven steps that follow shortlisting: compare → BOM →
// quote/connect. Rendered inline inside the assistant bubble that carries them
// rather than as a separate modal/drawer.

export type FlowCard =
  | { kind: 'comparison' }
  | { kind: 'quote'; bomReport?: BomReport }
  | { kind: 'connect' }
  | { kind: 'find_rep' };

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Set on user messages that were sent with an image attachment. */
  imagePreview?: string;
  /** Set on assistant messages triggered by a vision query — the user's image preview URL for the annotated placement overlay. */
  contextImagePreview?: string;
  /** Placement marker annotations parsed from Claude's <placement_map> tag. */
  placementMap?: PlacementMapItem[];
  products?: ProductSearchResult[];
  furnitureItems?: FurnitureSearchResult[];
  projectAreas?: ProjectAreaRecommendation[];
  bomReport?: BomReport;
  suggestedActions?: string[];
  /** Set on synthetic, locally-pushed messages that drive the compare/BOM/quote flow. */
  flowCard?: FlowCard;
  isStreaming: boolean;
  error?: string;
}
