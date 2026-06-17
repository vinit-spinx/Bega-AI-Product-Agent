const API_URL   = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

function adminHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Admin-Api-Key': ADMIN_KEY };
}

async function insightsFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: adminHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Insights API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  trend: number;
  trendLabel: string;
  icon: 'queries' | 'users' | 'actions' | 'suggestions' | 'speed' | 'success';
}

export interface InsightHighlight {
  label: string;
  value: string;
  sub?: string;
}

export interface TimeSeriesPoint {
  date: string;
  queries: number;
  sessions: number;
  // legacy alias so components that read 'users' still work
  users?: number;
}

export interface IntentSlice {
  label: string;
  value: number;
  color: string;
}

export interface ActionUsageSummary {
  name: string;
  clicks: number;
  trend: number;
  percentage: number;
}

export interface OverviewData {
  kpis: KPIMetric[];
  highlights: InsightHighlight[];
  timeSeries: TimeSeriesPoint[];
  intents: IntentSlice[];
  topActions: ActionUsageSummary[];
}

export type TimeRange = '7D' | '30D' | '90D' | '12M';

// ── Overview endpoint ─────────────────────────────────────────────────────────

interface RawOverview {
  kpis: {
    totalSessions: number;
    totalQueries: number;
    actionsTriggered: number;
    suggestionsClicked: number;
    successRate: number;
    avgMessagesPerSession: number;
    trends: {
      sessions: number;
      queries: number;
      actions: number;
      suggestions: number;
    };
  };
  timeSeries: { date: string; queries: number; sessions: number }[];
  topActions: { name: string; clicks: number; percentage: number; trend: number }[];
  popularQueries: { query: string; count: number }[];
  intents: { label: string; value: number; color: string }[];
  highlights: { topAction: string; topQuery: string; topCategory: string; topApplication: string };
}

export async function fetchOverviewData(range: TimeRange): Promise<OverviewData> {
  const raw = await insightsFetch<RawOverview>(`/api/admin/insights/overview?range=${range}`);
  const { kpis, highlights } = raw;

  const formatNum = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : n.toString();

  return {
    kpis: [
      {
        id: 'queries', label: 'Total Queries', icon: 'queries',
        value: formatNum(kpis.totalQueries), rawValue: kpis.totalQueries,
        trend: kpis.trends.queries, trendLabel: 'vs prev period',
      },
      {
        id: 'users', label: 'Active Sessions', icon: 'users',
        value: formatNum(kpis.totalSessions), rawValue: kpis.totalSessions,
        trend: kpis.trends.sessions, trendLabel: 'vs prev period',
      },
      {
        id: 'actions', label: 'Actions Triggered', icon: 'actions',
        value: formatNum(kpis.actionsTriggered), rawValue: kpis.actionsTriggered,
        trend: kpis.trends.actions, trendLabel: 'vs prev period',
      },
      {
        id: 'suggestions', label: 'Suggestions Clicked', icon: 'suggestions',
        value: formatNum(kpis.suggestionsClicked), rawValue: kpis.suggestionsClicked,
        trend: kpis.trends.suggestions, trendLabel: 'vs prev period',
      },
      {
        id: 'speed', label: 'Avg Messages / Session', icon: 'speed',
        value: kpis.avgMessagesPerSession.toFixed(1), rawValue: kpis.avgMessagesPerSession,
        trend: 0, trendLabel: '',
      },
      {
        id: 'success', label: 'Success Rate', icon: 'success',
        value: `${kpis.successRate}%`, rawValue: kpis.successRate,
        trend: 0, trendLabel: '',
      },
    ],
    highlights: [
      { label: 'Most Requested Category',   value: highlights.topCategory,    sub: 'by query volume' },
      { label: 'Most Used AI Action',        value: highlights.topAction,      sub: 'by click count'  },
      { label: 'Most Searched Application', value: highlights.topApplication,  sub: 'detected from queries' },
      { label: 'Most Recent Query',          value: highlights.topQuery,        sub: 'last captured query' },
    ],
    timeSeries: raw.timeSeries.map(p => ({ ...p, users: p.sessions })),
    intents: raw.intents,
    topActions: raw.topActions,
  };
}
