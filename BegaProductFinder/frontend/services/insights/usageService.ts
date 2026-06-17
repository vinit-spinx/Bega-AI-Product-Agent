const API_URL   = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

function adminHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Admin-Api-Key': ADMIN_KEY };
}

export interface UsageMetric {
  label: string;
  value: string;
  sub: string;
  trend: number;
}

export interface PopularQuery {
  query: string;
  count: number;
  trend: number;
}

export interface UsageData {
  metrics: UsageMetric[];
  popularQueries: PopularQuery[];
  searchVsAction: { label: string; value: number; color: string }[];
  dailyVolume: { date: string; queries: number }[];
}

export async function fetchUsageData(): Promise<UsageData> {
  const res = await fetch(`${API_URL}/api/admin/insights/usage`, { headers: adminHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Usage API ${res.status}: ${text}`);
  }
  const raw = await res.json();
  return {
    metrics: raw.metrics,
    popularQueries: (raw.popularQueries as { query: string; count: number }[]).map(q => ({
      ...q, trend: 0,
    })),
    searchVsAction: raw.searchVsAction,
    dailyVolume: raw.dailyVolume,
  };
}
