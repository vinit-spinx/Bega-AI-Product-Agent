const API_URL   = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

function adminHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Admin-Api-Key': ADMIN_KEY };
}

export interface SuggestionPerformance {
  id: string;
  text: string;
  clicks: number;
  conversionRate: number;
  trend: number;
  status: 'top' | 'normal' | 'low';
}

export interface ContentData {
  suggestions: SuggestionPerformance[];
  heroMetrics: { label: string; value: string; trend: number }[];
}

export async function fetchContentData(): Promise<ContentData> {
  const res = await fetch(`${API_URL}/api/admin/insights/content`, { headers: adminHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Content API ${res.status}: ${text}`);
  }
  const raw = await res.json();
  return {
    heroMetrics: raw.heroMetrics,
    suggestions: (raw.suggestions as {
      id: number; text: string; clicks: number; conversionRate: number; trend: number; status: string;
    }[]).map(s => ({
      ...s,
      id: String(s.id),
      status: s.status as 'top' | 'normal' | 'low',
    })),
  };
}
