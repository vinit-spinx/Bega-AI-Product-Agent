// ── Product catalog types (mirrors C# models) ─────────────────────────────────

export interface ColorTemperatureOption {
  kelvin: number;
  code: string;
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
}

export interface BomReport {
  projectName?: string;
  lineItems: BomLineItem[];
  subtotalDnp: number;
  subtotalMsrp: number;
  currency: string;
  itemCount: number;
  notFoundItems: string[];
}

// ── Project recommendation types ──────────────────────────────────────────────

export interface ProjectAreaRecommendation {
  areaName: string;
  recommendedProducts: ProductSearchResult[];
  rationale: string;
  estimatedTotalDnp: number;
}

// ── SSE event types ───────────────────────────────────────────────────────────

export type SseEventType =
  | 'text_delta'
  | 'products'
  | 'furniture'
  | 'project_recommendation'
  | 'bom'
  | 'suggested_actions'
  | 'done'
  | 'error';

export type SseEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'products'; products: ProductSearchResult[] }
  | { type: 'furniture'; items: FurnitureSearchResult[] }
  | { type: 'project_recommendation'; areas: ProjectAreaRecommendation[] }
  | { type: 'bom'; report: BomReport }
  | { type: 'suggested_actions'; actions: string[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

// ── Chat UI types ─────────────────────────────────────────────────────────────

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: ProductSearchResult[];
  furnitureItems?: FurnitureSearchResult[];
  projectAreas?: ProjectAreaRecommendation[];
  bomReport?: BomReport;
  suggestedActions?: string[];
  isStreaming: boolean;
  error?: string;
}
