'use client';

import { useState, useEffect } from 'react';
import { fetchActionsData, type ActionsData, type ActionPerformance } from '@/services/insights/actionsService';
import ChartCard from '../ChartCard';
import DataTable, { type Column } from '../DataTable';
import BarChart from '../BarChart';
import TrendIndicator from '../TrendIndicator';
import EmptyState from '../EmptyState';
import LineChart from '../LineChart';

type ActionRow = ActionPerformance & Record<string, unknown>;

const actionColumns: Column<ActionRow>[] = [
  { key: 'name', label: 'Action Name', sortable: false },
  {
    key: 'clicks', label: 'Clicks', sortable: true, align: 'right', width: '90px',
    render: row => <span className="font-semibold">{(row.clicks as number).toLocaleString()}</span>,
  },
  {
    key: 'executions', label: 'Executions', sortable: true, align: 'right', width: '100px',
    render: row => (row.executions as number).toLocaleString(),
  },
  {
    key: 'successRate', label: 'Success Rate', sortable: true, align: 'right', width: '110px',
    render: row => {
      const rate = row.successRate as number;
      return (
        <span className={`text-[12px] font-semibold ${rate >= 95 ? 'text-emerald-600' : rate >= 90 ? 'text-bega-text-1' : 'text-amber-600'}`}>
          {rate.toFixed(1)}%
        </span>
      );
    },
  },
  {
    key: 'trend', label: 'Trend', align: 'right', width: '90px',
    render: row => <TrendIndicator value={row.trend as number} />,
  },
  {
    key: 'lastUsed', label: 'Last Used', align: 'right', width: '110px',
    render: row => <span className="text-bega-text-3 text-[12px]">{row.lastUsed as string}</span>,
  },
];

export default function ActionsTab() {
  const [data, setData] = useState<ActionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActionsData().then(setData).finally(() => setLoading(false));
  }, []);

  const sorted = [...(data?.actions ?? [])].sort((a, b) => b.clicks - a.clicks);
  const top5 = sorted.slice(0, 5);
  const bottom3 = [...sorted].reverse().slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Performance table */}
      <ChartCard title="Action Performance" description="Click-through and execution rates for all AI actions">
        <DataTable
          columns={actionColumns}
          data={sorted as ActionRow[]}
          loading={loading}
          rowKey="id"
          skeletonRows={8}
        />
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        {/* Most used bar chart */}
        <ChartCard title="Most Used Actions" description="Top 5 actions by total clicks">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 bg-bega-bg-2 rounded w-40 mb-1.5" />
                  <div className="h-1.5 bg-bega-bg-1 rounded-full" />
                </div>
              ))}
            </div>
          ) : top5.length ? (
            <BarChart
              items={top5.map(a => ({
                label: a.name,
                value: a.clicks,
                trend: a.trend,
                color: '#1A1A1A',
              }))}
              showTrend
            />
          ) : <EmptyState compact />}
        </ChartCard>

        {/* Least used — improvement opportunities */}
        <ChartCard title="Improvement Opportunities" description="Low-traffic actions that may need attention">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-bega-bg-1 rounded-xl p-4">
                  <div className="h-3 bg-bega-bg-2 rounded w-3/4 mb-2" />
                  <div className="h-2.5 bg-bega-bg-2 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : bottom3.length ? (
            <div className="space-y-3">
              {bottom3.map((a, i) => (
                <div key={i} className="bg-bega-bg-1 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="text-[12px] font-medium text-bega-text-1">{a.name}</p>
                    <TrendIndicator value={a.trend} size="sm" />
                  </div>
                  <p className="text-[11px] text-bega-text-3">{a.clicks.toLocaleString()} clicks · {a.successRate.toFixed(1)}% success</p>
                </div>
              ))}
            </div>
          ) : <EmptyState compact />}
        </ChartCard>
      </div>

      {/* Monthly trend */}
      <ChartCard title="Action Trigger Trend" description="Monthly growth in action usage">
        {loading ? (
          <div className="h-44 bg-bega-bg-1 rounded-xl animate-pulse" />
        ) : data?.monthlyTrend.length ? (
          <LineChart
            data={data.monthlyTrend.map(p => ({ date: p.month, triggers: p.triggers }))}
            series={[{ key: 'triggers', label: 'Triggers', color: '#1A1A1A' }]}
            height={176}
          />
        ) : <EmptyState compact />}
      </ChartCard>
    </div>
  );
}
