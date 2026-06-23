'use client';
import { useCountUp } from '@/hooks/useCountUp';
import { useGSAPTilt } from '@/hooks/useGSAPTilt';

interface Props {
  label: string;
  value: number;
  format?: 'number' | 'percent' | 'text';
  textValue?: string;
  trend?: number;
  sub?: string;
  icon: React.ReactNode;
  active?: boolean;
}

export default function KPICardV2({ label, value, format = 'number', textValue, trend, sub, icon, active = true }: Props) {
  const numRef = useCountUp(format !== 'text' ? value : 0, 1.2, active && format !== 'text');
  const tiltRef = useGSAPTilt<HTMLDivElement>(5);

  const trendColor = trend === undefined ? '' : trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-bega-text-3';
  const trendArrow = trend === undefined ? '' : trend > 0 ? '▲' : trend < 0 ? '▼' : '→';

  return (
    <div ref={tiltRef} className="bg-white rounded-2xl border border-bega-border-1 p-5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-shadow duration-300 will-change-transform">
      <div className="flex items-start justify-between mb-3">
        <span className="text-bega-text-3 w-5 h-5">{icon}</span>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold ${trendColor}`}>
            {trendArrow} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[28px] font-bold text-bega-text-1 leading-none mb-1 tracking-tight">
        {format === 'text' ? (
          <span>{textValue ?? '—'}</span>
        ) : (
          <>
            <span ref={numRef as React.RefObject<HTMLSpanElement>} />
            {format === 'percent' && '%'}
          </>
        )}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bega-text-3 mb-1">{label}</p>
      {sub && <p className="text-[11px] text-bega-text-3 leading-snug">{sub}</p>}
    </div>
  );
}
