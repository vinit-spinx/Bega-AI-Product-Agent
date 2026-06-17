'use client';

interface Slice {
  label: string;
  value: number; // percentage (0-100, should sum to 100)
  color: string;
}

interface DonutChartProps {
  slices: Slice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
}

export default function DonutChart({
  slices,
  size = 160,
  strokeWidth = 20,
  centerLabel,
  centerSub,
}: DonutChartProps) {
  const R = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * R;
  const cx = size / 2;
  const cy = size / 2;

  let cumulative = 0;
  const segments = slices.map(s => {
    const dash = (s.value / 100) * circumference;
    const gap = circumference - dash;
    const offset = circumference - (cumulative / 100) * circumference;
    cumulative += s.value;
    return { ...s, dash, gap, offset };
  });

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} className="-rotate-90">
          {/* Track */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#EDEBE7" strokeWidth={strokeWidth} />
          {/* Segments */}
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        {/* Center text */}
        {(centerLabel || centerSub) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerLabel && <span className="text-[18px] font-bold text-bega-text-1 leading-none">{centerLabel}</span>}
            {centerSub && <span className="text-[10px] text-bega-text-3 mt-0.5">{centerSub}</span>}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[12px] text-bega-text-2 truncate">{s.label}</span>
            <span className="text-[12px] font-semibold text-bega-text-1 ml-auto flex-shrink-0">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
