'use client';

import { useState, useEffect } from 'react';
import { fetchUsageData, type UsageData, type PopularQuery } from '@/services/insights/usageService';
import { fetchActionsData, type ActionPerformance } from '@/services/insights/actionsService';
import { fetchContentData, type SuggestionPerformance } from '@/services/insights/contentService';
import ChartCard from '../ChartCard';
import DataTable, { type Column } from '../DataTable';
import LineChart from '../LineChart';
import TrendIndicator from '../TrendIndicator';
import EmptyState from '../EmptyState';

// ── Popular queries table ──────────────────────────────────────────────────────

const queryColumns: Column<PopularQuery & Record<string, unknown>>[] = [
  { key: 'query', label: 'Query', sortable: false },
  {
    key: 'count', label: 'Count', sortable: true, align: 'right', width: '100px',
    render: row => <span className="font-semibold text-bega-text-1">{(row.count as number).toLocaleString()}</span>,
  },
];

// ── Action clicks table ────────────────────────────────────────────────────────

type ActionRow = ActionPerformance & Record<string, unknown>;

const actionColumns: Column<ActionRow>[] = [
  { key: 'name', label: 'AI Action', sortable: false },
  {
    key: 'clicks', label: 'Clicks', sortable: true, align: 'right', width: '90px',
    render: row => <span className="font-semibold text-bega-text-1">{(row.clicks as number).toLocaleString()}</span>,
  },
  {
    key: 'lastUsed', label: 'Last Used', align: 'right', width: '120px',
    render: row => <span className="text-bega-text-3 text-[12px]">{row.lastUsed as string}</span>,
  },
];

// ── Suggestion clicks table ───────────────────────────────────────────────────

type SuggRow = SuggestionPerformance & Record<string, unknown>;

const suggColumns: Column<SuggRow>[] = [
  {
    key: 'text', label: 'Suggestion',
    render: row => (
      <div className="flex items-center gap-2.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          row.status === 'top' ? 'bg-emerald-500' : row.status === 'low' ? 'bg-amber-400' : 'bg-bega-border-3'
        }`} />
        <span className="text-[13px] text-bega-text-1">{row.text as string}</span>
      </div>
    ),
  },
  {
    key: 'clicks', label: 'Clicks', sortable: true, align: 'right', width: '80px',
    render: row => <span className="font-semibold text-bega-text-1">{(row.clicks as number).toLocaleString()}</span>,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsageTab() {
  const [usageData,   setUsageData]   = useState<UsageData | null>(null);
  const [actionsData, setActionsData] = useState<ActionPerformance[]>([]);
  const [suggData,    setSuggData]    = useState<SuggestionPerformance[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetchUsageData(),
      fetchActionsData(),
      fetchContentData(),
    ]).then(([u, a, c]) => {
      setUsageData(u);
      setActionsData(a.actions);
      setSuggData(c.suggestions);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">

      {/* ── Engagement Metrics ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-bega-border-1 p-5 animate-pulse">
              <div className="h-2.5 bg-bega-bg-2 rounded w-2/5 mb-4" />
              <div className="h-7 bg-bega-bg-2 rounded w-3/5 mb-2" />
              <div className="h-2.5 bg-bega-bg-2 rounded w-4/5 mb-3" />
              <div className="h-3 bg-bega-bg-2 rounded w-1/3" />
            </div>
          ))
        ) : (usageData?.metrics ?? []).map((m, i) => (
          <div key={i} className="bg-white rounded-2xl border border-bega-border-1 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bega-text-3 mb-3">{m.label}</p>
            <p className="text-[28px] font-bold text-bega-text-1 leading-none mb-1.5 tracking-tight">{m.value}</p>
            <p className="text-[11px] text-bega-text-3 mb-2">{m.sub}</p>
            <TrendIndicator value={m.trend} label="vs last period" />
          </div>
        ))}
      </div>

      {/* ── Daily Volume + Search vs Actions ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <ChartCard title="Daily Query Volume" description="Queries received per day over the past 30 days">
          {loading ? (
            <div className="h-44 bg-bega-bg-1 rounded-xl animate-pulse" />
          ) : usageData?.dailyVolume.length ? (
            <LineChart
              data={usageData.dailyVolume}
              series={[{ key: 'queries', label: 'Queries', color: '#1A1A1A' }]}
              height={176}
              showDots={false}
            />
          ) : <EmptyState compact />}
        </ChartCard>

        <ChartCard title="Interaction Breakdown" description="How users interact with BEGA AI">
          {loading ? (
            <div className="h-44 bg-bega-bg-1 rounded-xl animate-pulse" />
          ) : usageData?.searchVsAction.length ? (
            <div className="space-y-4 pt-2">
              {usageData.searchVsAction.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-[12px] text-bega-text-2">{item.label}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-bega-text-1">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-bega-bg-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState compact />}
        </ChartCard>
      </div>

      {/* ── Popular Queries ────────────────────────────────────────────── */}
      <ChartCard title="Popular Queries" description="Most frequently asked questions to BEGA AI">
        <DataTable
          columns={queryColumns}
          data={(usageData?.popularQueries ?? []) as (PopularQuery & Record<string, unknown>)[]}
          loading={loading}
          rowKey="query"
          skeletonRows={8}
        />
      </ChartCard>

      {/* ── AI Action Clicks ───────────────────────────────────────────── */}
      <ChartCard title="AI Action Clicks" description="How many times each action card was triggered">
        <DataTable
          columns={actionColumns}
          data={[...actionsData].sort((a, b) => b.clicks - a.clicks) as ActionRow[]}
          loading={loading}
          rowKey="id"
          skeletonRows={5}
        />
      </ChartCard>

      {/* ── Suggestion Clicks ──────────────────────────────────────────── */}
      <ChartCard title="Suggestion Clicks" description="Which suggestion chips users clicked most">
        <DataTable
          columns={suggColumns}
          data={[...suggData].sort((a, b) => b.clicks - a.clicks) as SuggRow[]}
          loading={loading}
          rowKey="id"
          skeletonRows={5}
        />
      </ChartCard>

    </div>
  );
}
