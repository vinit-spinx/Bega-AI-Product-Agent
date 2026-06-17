'use client';

import TrendIndicator from './TrendIndicator';

interface BarItem {
  label: string;
  value: number;
  sub?: string;
  trend?: number;
  color?: string;
}

interface BarChartProps {
  items: BarItem[];
  maxValue?: number;
  valueFormatter?: (v: number) => string;
  showTrend?: boolean;
}

export default function BarChart({ items, maxValue, valueFormatter, showTrend = false }: BarChartProps) {
  const max = maxValue ?? Math.max(...items.map(i => i.value), 1);
  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString());

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="group">
          <div className="flex items-center justify-between mb-1.5 gap-3">
            <span className="text-[12px] font-medium text-bega-text-1 truncate">{item.label}</span>
            <div className="flex items-center gap-3 flex-shrink-0">
              {showTrend && item.trend != null && <TrendIndicator value={item.trend} />}
              <span className="text-[12px] font-semibold text-bega-text-1">{fmt(item.value)}</span>
            </div>
          </div>
          <div className="h-1.5 bg-bega-bg-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color ?? '#1A1A1A',
              }}
            />
          </div>
          {item.sub && <p className="text-[10px] text-bega-text-3 mt-1">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}
