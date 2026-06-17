const API_URL   = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

function adminHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Admin-Api-Key': ADMIN_KEY };
}

export interface ActionPerformance {
  id: string;
  name: string;
  clicks: number;
  executions: number;
  successRate: number;
  lastUsed: string;
  trend: number;
  isActive?: boolean;
}

export interface ActionsData {
  actions: ActionPerformance[];
  monthlyTrend: { month: string; triggers: number }[];
}

export async function fetchActionsData(): Promise<ActionsData> {
  const res = await fetch(`${API_URL}/api/admin/insights/actions`, { headers: adminHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Actions API ${res.status}: ${text}`);
  }
  return res.json() as Promise<ActionsData>;
}
