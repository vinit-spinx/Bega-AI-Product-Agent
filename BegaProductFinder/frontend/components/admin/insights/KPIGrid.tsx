import type { KPIMetric } from '@/services/insights/insightsService';
import TrendIndicator from './TrendIndicator';

function KPIIcon({ type }: { type: KPIMetric['icon'] }) {
  const icons: Record<KPIMetric['icon'], React.ReactNode> = {
    queries: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-4 h-4">
        <circle cx="9" cy="9" r="6" /><path d="M15 15l3 3" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <circle cx="8" cy="7" r="3" /><path d="M2 18c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M14 5c1.7 0 3 1.3 3 3s-1.3 3-3 3" /><path d="M18 18c0-2.5-1.5-4.5-3.5-5.5" />
      </svg>
    ),
    actions: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M10 2l2.4 7.4H20l-6.2 4.5 2.4 7.4L10 17l-6.2 4.3 2.4-7.4L0 9.4h7.6z" />
      </svg>
    ),
    suggestions: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-4 h-4">
        <path d="M3 5h14M3 9h10M3 13h12M3 17h7" />
      </svg>
    ),
    speed: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" /><path d="M10 6v4l3 2" />
      </svg>
    ),
    success: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <circle cx="10" cy="10" r="8" /><path d="M7 10l2.5 2.5 4-5" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
}

function KPICard({ metric }: { metric: KPIMetric }) {
  const isSpeedMetric = metric.icon === 'speed';
  return (
    <div className="bg-white rounded-2xl border border-bega-border-1 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-bega-text-3">
          <KPIIcon type={metric.icon} />
        </span>
      </div>
      <p className="text-[26px] font-bold text-bega-text-1 leading-none mb-1.5 tracking-tight">
        {metric.value}
      </p>
      <p className="text-[11px] font-semibold text-bega-text-2 uppercase tracking-wider mb-2">{metric.label}</p>
      <TrendIndicator value={metric.trend} label={metric.trendLabel} invertColors={isSpeedMetric} />
    </div>
  );
}

interface KPIGridProps {
  metrics: KPIMetric[];
  loading?: boolean;
  /** Number of skeleton cards shown while loading. Defaults to metrics length or 2. */
  skeletonCount?: number;
}

export default function KPIGrid({ metrics, loading, skeletonCount }: KPIGridProps) {
  const count = skeletonCount ?? (metrics.length || 2);
  const colClass = count === 2
    ? 'grid-cols-2'
    : count <= 3
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6';

  if (loading) {
    return (
      <div className={`grid ${colClass} gap-4`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-bega-border-1 p-5 animate-pulse">
            <div className="w-7 h-7 bg-bega-bg-2 rounded-lg mb-4" />
            <div className="h-7 bg-bega-bg-2 rounded w-3/4 mb-2" />
            <div className="h-2.5 bg-bega-bg-2 rounded w-1/2 mb-3" />
            <div className="h-3 bg-bega-bg-2 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${colClass} gap-4`}>
      {metrics.map(m => <KPICard key={m.id} metric={m} />)}
    </div>
  );
}
