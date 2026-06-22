const API_URL   = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

function h(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Admin-Api-Key': ADMIN_KEY };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: h() });
  if (!res.ok) throw new Error(`InsightsV2 ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OverviewKPIs {
  totalConversations: number;
  totalLeads: number;
  conversionRate: number;
  totalQueries: number;
  mostActiveCategory: string;
  mostActiveProject: string;
  trends: { conversations: number; leads: number; queries: number; conversion: number };
}

export interface RadarItem {
  topic: string;
  growth: number;
  mentions: number;
}

export interface ActivityPoint {
  date: string;
  queries: number;
  leads: number;
  [key: string]: string | number;
}

export interface OverviewData {
  kpis: OverviewKPIs;
  opportunityRadar: RadarItem[];
  activity: ActivityPoint[];
}

export interface BriefData {
  text: string | null;
  generatedAt: string;
  cached: boolean;
}

export interface FunnelStage {
  stage: string;
  count: number;
  pct: number;
}

// Matches backend: { totalLeads, newThisWeek, conversionRate, trend }
export interface LeadMetrics {
  totalLeads: number;
  newThisWeek: number;
  conversionRate: number;
  trend: number;
}

// Matches backend: { name, email, preview, date }
export interface RecentLead {
  name: string;
  email: string;
  preview: string;
  date: string;
}

export interface LeadData {
  funnel: FunnelStage[];
  metrics: LeadMetrics;
  recentLeads: RecentLead[];
  topLeadQueries: { query: string; count: number }[];
  leadsByDay: { date: string; leads: number; [key: string]: string | number }[];
}

// Matches backend: { category, mentions, share, growth }
export interface CategoryData {
  category: string;
  mentions: number;
  share: number;
  growth: number;
}

export interface ProductData {
  categories: CategoryData[];
  comparisons: { pattern: string; count: number }[];
  familyDemand: { family: string; mentioned: number }[];
  totalQueries: number;
}

// Matches backend: { type, count, share, growth }
export interface ProjectTypeData {
  type: string;
  count: number;
  share: number;
  growth: number;
}

// Matches backend: { projectTypes, stages, emerging }
export interface SpecData {
  projectTypes: ProjectTypeData[];
  stages: { stage: string; count: number }[];
  emerging: { term: string; total: number; growth: number }[];
}

// Matches backend: { repeatedQueries, contentGaps, topSuggestions, totalAnalysed }
export interface ContentData {
  repeatedQueries: { query: string; count: number; priority: string; priorityScore: number }[];
  contentGaps: { topic: string; demand: number; action: string }[];
  topSuggestions: { text: string; clicks: number }[];
  totalAnalysed: number;
}

export interface OpportunityCard {
  category: 'SALES' | 'REVENUE' | 'PRODUCT' | 'CONTENT' | 'AI QUALITY' | 'SPECIFICATION';
  title: string;
  evidence: string;
  action: string;
  priority: number;
  growth: number;
}

export interface OpportunityData {
  cards: OpportunityCard[];
  total: number;
  hasData: boolean;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'category' | 'topic' | 'lead';
  size: number;
  color: string;
  count: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

// ── Lead Insights (AI opportunity feed) ──────────────────────────────────────

export interface LeadInsightCard {
  category: string;
  score: number;
  title: string;
  summary: string;
  evidence: string;
  action: string;
  impact: string;
  trend: number;
}

export interface LeadTopOpportunity {
  label: string;
  category: string;
  title: string;
  score: number;
  detail: string;
}

export interface LeadInsightsData {
  summary: string | null;
  topOpportunities: LeadTopOpportunity[];
  cards: LeadInsightCard[];
  hasData: boolean;
  totalLeads: number;
  totalSessions: number;
  conversionRate: number;
}

/** 'cold' | 'warm' | 'hot' — AI-classified lead temperature, replaces the old numeric score. */
export type LeadTemperature = 'cold' | 'warm' | 'hot';

export interface LeadTableRow {
  id: number;
  sessionId: string;
  name: string;
  email: string;
  query: string;
  preview: string;
  date: string;
  temperature: LeadTemperature;
  /** 'inquiry' (generic "Connect with BEGA Team") | 'quote_request' (shortlist/BOM-backed) | null (AI-only lead, no form). */
  source: string | null;
  company: string | null;
  /** Raw JSON string — parse with JSON.parse, same pattern as colorTemperatureJson elsewhere. */
  shortlistJson: string | null;
  /** Raw JSON string — parse with JSON.parse to get a BomReport-shaped object. */
  bomReportJson: string | null;
}

export interface LeadTableParams {
  page?: number;
  pageSize?: number;
  temperature?: LeadTemperature | '';
  source?: string;
  search?: string;
}

export interface ConversationRow {
  sessionId: string;
  name: string;
  email: string | null;
  stage: string;
  isLead: boolean;
  temperature: LeadTemperature | null;
  summary: string | null;
  messageCount: number;
  lastActivityAt: string;
}

export interface ConversationTableParams {
  page?: number;
  pageSize?: number;
  stage?: string;
  temperature?: LeadTemperature | '';
  isLead?: boolean;
  search?: string;
  from?: string;
  to?: string;
}

// ── Conversion funnel ─────────────────────────────────────────────────────────

export interface FunnelStageData {
  stage: string;
  count: number;
  dropOffPct: number | null;
}

export interface FunnelData {
  stages: FunnelStageData[];
  worstDropOffStage: string | null;
  range: string;
}

export interface LeadTableData {
  leads: LeadTableRow[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
}

export interface ConversationTableData {
  items: ConversationRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export type TimeRange = '7D' | '30D' | '90D' | '12M';

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const fetchLeadTable = (params: LeadTableParams = {}) =>
  get<LeadTableData>(`/api/admin/insights/v2/lead-table${toQueryString(params)}`);

export const fetchConversations = (params: ConversationTableParams = {}) =>
  get<ConversationTableData>(`/api/admin/insights/v2/conversations${toQueryString(params)}`);
export const fetchFunnel         = (range: TimeRange = '30D')  => get<FunnelData>(`/api/admin/insights/v2/funnel?range=${range}`);

export async function fetchSessionConversation(sessionId: string): Promise<{ messages: ChatMessage[] }> {
  const res = await fetch(`${API_URL}/api/chat/session/${sessionId}`);
  if (!res.ok) throw new Error(`Session ${res.status}`);
  return res.json() as Promise<{ messages: ChatMessage[] }>;
}

export const fetchOverviewV2     = (range: TimeRange = '30D') => get<OverviewData>(`/api/admin/insights/v2/overview?range=${range}`);
export const fetchBrief          = ()                          => get<BriefData>('/api/admin/insights/v2/brief');
export const fetchLeads          = ()                          => get<LeadData>('/api/admin/insights/v2/leads');
export const fetchProducts       = ()                          => get<ProductData>('/api/admin/insights/v2/products');
export const fetchSpecifications = ()                          => get<SpecData>('/api/admin/insights/v2/specifications');
export const fetchContentIntel   = ()                          => get<ContentData>('/api/admin/insights/v2/content');
export const fetchOpportunities  = ()                          => get<OpportunityData>('/api/admin/insights/v2/opportunities');
export const fetchNetwork        = ()                          => get<NetworkData>('/api/admin/insights/v2/network');

// ── Lead Insights cache ───────────────────────────────────────────────────────
// Two-layer cache so no LLM call is made for 30 days regardless of page refreshes,
// browser restarts, or project stops:
//   Layer 1 — module variable: instant, lives for the current JS bundle lifetime
//   Layer 2 — localStorage: survives everything until the 30-day TTL expires

const LS_KEY    = 'bega_lead_insights_v1';
const TTL_MS    = 30 * 24 * 60 * 60 * 1000; // 30 days

interface LeadInsightsEntry {
  data:      LeadInsightsData;
  fetchedAt: number; // Unix ms
}

let _memCache: LeadInsightsData | null = null;
let _memCachedAt = 0;

function readLocalStorage(): LeadInsightsData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const entry: LeadInsightsEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt < TTL_MS) return entry.data;
    localStorage.removeItem(LS_KEY); // expired — clean up
  } catch { localStorage.removeItem(LS_KEY); }
  return null;
}

function writeLocalStorage(data: LeadInsightsData): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: LeadInsightsEntry = { data, fetchedAt: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(entry));
  } catch { /* quota exceeded or private mode — ignore */ }
}

export async function fetchLeadInsights(): Promise<LeadInsightsData> {
  // Layer 1: in-memory (tab switches within the same page load)
  if (_memCache && Date.now() - _memCachedAt < TTL_MS) return _memCache;

  // Layer 2: localStorage (survives refresh / browser restart / project stop)
  const stored = readLocalStorage();
  if (stored) {
    _memCache    = stored;
    _memCachedAt = Date.now();
    return stored;
  }

  // Cache miss — fetch from backend (backend itself won't call LLM if its disk cache is warm)
  const data = await get<LeadInsightsData>('/api/admin/insights/v2/lead-insights');
  _memCache    = data;
  _memCachedAt = Date.now();
  writeLocalStorage(data);
  return data;
}
