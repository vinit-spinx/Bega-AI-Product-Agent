'use client';

interface TrendIndicatorProps {
  value: number; // percentage
  label?: string;
  size?: 'sm' | 'md';
  invertColors?: boolean; // for metrics where down is good (e.g. response time)
}

export default function TrendIndicator({ value, label, size = 'sm', invertColors = false }: TrendIndicatorProps) {
  const isPositive = invertColors ? value < 0 : value > 0;
  const isNeutral = value === 0;
  const absValue = Math.abs(value);

  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[13px]';

  if (isNeutral) {
    return (
      <span className={`inline-flex items-center gap-1 ${textSize} font-medium text-bega-text-3`}>
        <span>→</span>
        <span>{absValue.toFixed(1)}%</span>
        {label && <span className="text-bega-text-3 font-normal">{label}</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${textSize} font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      <svg viewBox="0 0 10 10" fill="currentColor" className={`w-2.5 h-2.5 flex-shrink-0 ${!isPositive ? 'rotate-180' : ''}`}>
        <path d="M5 2l4 6H1z" />
      </svg>
      <span>{absValue.toFixed(1)}%</span>
      {label && <span className="font-normal text-bega-text-3">{label}</span>}
    </span>
  );
}
