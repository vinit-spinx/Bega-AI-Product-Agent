'use client';

import { useState, useEffect } from 'react';
import { fetchContentData, type ContentData, type SuggestionPerformance } from '@/services/insights/contentService';
import ChartCard from '../ChartCard';
import DataTable, { type Column } from '../DataTable';
import TrendIndicator from '../TrendIndicator';
import EmptyState from '../EmptyState';

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
    render: row => <span className="font-semibold">{(row.clicks as number).toLocaleString()}</span>,
  },
  {
    key: 'conversionRate', label: 'Conv. Rate', sortable: true, align: 'right', width: '100px',
    render: row => {
      const rate = row.conversionRate as number;
      return (
        <span className={`text-[12px] font-semibold ${rate >= 60 ? 'text-emerald-600' : rate >= 40 ? 'text-bega-text-1' : 'text-amber-600'}`}>
          {rate.toFixed(1)}%
        </span>
      );
    },
  },
  {
    key: 'trend', label: 'Trend', align: 'right', width: '90px',
    render: row => <TrendIndicator value={row.trend as number} />,
  },
];

export default function ContentTab() {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContentData().then(setData).finally(() => setLoading(false));
  }, []);

  const suggestions = data?.suggestions ?? [];
  const top = suggestions.filter(s => s.status === 'top');
  const low = suggestions.filter(s => s.status === 'low');

  return (
    <div className="space-y-5">
      {/* Hero Performance */}
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-bega-text-3 mb-3 px-0.5">Hero Banner Performance</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-bega-border-1 p-5 animate-pulse">
                <div className="h-2.5 bg-bega-bg-2 rounded w-2/5 mb-4" />
                <div className="h-7 bg-bega-bg-2 rounded w-3/5" />
              </div>
            ))
          ) : (data?.heroMetrics ?? []).map((m, i) => (
            <div key={i} className="bg-white rounded-2xl border border-bega-border-1 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bega-text-3 mb-3">{m.label}</p>
              <p className="text-[26px] font-bold text-bega-text-1 leading-none mb-2 tracking-tight">{m.value}</p>
              <TrendIndicator value={m.trend} label="vs last period" />
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <ChartCard title="All Suggestion Performance" description="Click and conversion data for every active suggestion">
          <DataTable
            columns={suggColumns}
            data={suggestions as SuggRow[]}
            loading={loading}
            rowKey="id"
            skeletonRows={8}
          />
        </ChartCard>

        <div className="space-y-4">
          {/* Top performers */}
          <ChartCard title="Top Performers" description="Driving the most conversions">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-bega-bg-1 rounded-xl p-3">
                    <div className="h-3 bg-bega-bg-2 rounded w-4/5 mb-1.5" />
                    <div className="h-2.5 bg-bega-bg-2 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : top.length ? (
              <div className="space-y-2.5">
                {top.map((s, i) => (
                  <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                    <p className="text-[12px] font-medium text-bega-text-1 mb-1.5 leading-snug">{s.text}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-emerald-700 font-semibold">{s.conversionRate.toFixed(1)}% conv.</span>
                      <span className="text-[11px] text-bega-text-3">{s.clicks.toLocaleString()} clicks</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState compact />}
          </ChartCard>

          {/* Low performers */}
          <ChartCard title="Needs Attention" description="Low engagement — consider replacing">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-bega-bg-1 rounded-xl p-3">
                    <div className="h-3 bg-bega-bg-2 rounded w-4/5 mb-1.5" />
                    <div className="h-2.5 bg-bega-bg-2 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : low.length ? (
              <div className="space-y-2.5">
                {low.map((s, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                    <p className="text-[12px] font-medium text-bega-text-1 mb-1.5 leading-snug">{s.text}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-amber-700 font-semibold">{s.conversionRate.toFixed(1)}% conv.</span>
                      <TrendIndicator value={s.trend} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState compact />}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
