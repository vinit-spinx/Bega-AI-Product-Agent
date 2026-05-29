import type { ProductSearchResult, ProductDetail, FurnitureSearchResult, BomLineItem, BomReport, ProjectAreaRecommendation } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://localhost:58581';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductSearchParams {
  q: string;
  category?: string;
  group?: string;
  family?: string;
  minWattage?: number;
  maxWattage?: number;
  minLumens?: number;
  voltage?: string;
  controlProtocol?: string;
  adaCompliant?: boolean;
  expressDelivery?: boolean;
  topK?: number;
}

export async function searchProducts(params: ProductSearchParams): Promise<ProductSearchResult[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  return apiFetch<ProductSearchResult[]>(`/api/products/search?${qs.toString()}`);
}

export async function getProductDetail(catalogNumber: string): Promise<ProductDetail | null> {
  try {
    return await apiFetch<ProductDetail>(`/api/products/${encodeURIComponent(catalogNumber)}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('404')) return null;
    throw err;
  }
}

export async function getHierarchy(): Promise<{
  categories: string[];
  groups: string[];
  families: { familyName: string; familySlug: string; categoryName: string; groupsName: string; productCount: number }[];
}> {
  return apiFetch('/api/products/hierarchy');
}

// ── Furniture ─────────────────────────────────────────────────────────────────

export interface FurnitureSearchParams {
  q: string;
  type?: string;
  application?: string;
  material?: string;
  illuminated?: boolean;
  topK?: number;
}

export async function searchFurniture(params: FurnitureSearchParams): Promise<FurnitureSearchResult[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  return apiFetch<FurnitureSearchResult[]>(`/api/furniture/search?${qs.toString()}`);
}

// ── Project recommendations ───────────────────────────────────────────────────

export interface ProjectRecommendParams {
  projectType: string;
  areas?: string[];
  budgetUsd?: number;
  styleKeywords?: string[];
  category?: string;
}

export async function recommendForProject(params: ProjectRecommendParams): Promise<{
  projectType: string;
  areas: ProjectAreaRecommendation[];
}> {
  return apiFetch('/api/projects/recommend', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── BOM ───────────────────────────────────────────────────────────────────────

export interface BomGenerateParams {
  projectName?: string;
  items: { catalogNumber: string; quantity: number; areaLabel?: string }[];
}

export async function generateBom(params: BomGenerateParams): Promise<BomReport> {
  return apiFetch('/api/bom/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Chat session ──────────────────────────────────────────────────────────────

export async function clearChatSession(sessionId: string): Promise<void> {
  await apiFetch(`/api/chat/session/${sessionId}`, { method: 'DELETE' });
}
