'use client';

interface Series {
  key: string;
  label: string;
  color: string;
}

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

interface LineChartProps {
  data: DataPoint[];
  series: Series[];
  height?: number;
  showDots?: boolean;
}

export default function LineChart({ data, series, height = 200, showDots = true }: LineChartProps) {
  if (!data.length) return null;

  const W = 800;
  const H = height;
  const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Compute min/max across all series
  const allValues = data.flatMap(d => series.map(s => Number(d[s.key]) || 0));
  const maxVal = Math.max(...allValues, 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  // X positions
  const xStep = chartW / Math.max(data.length - 1, 1);
  const x = (i: number) => PAD.left + i * xStep;
  const y = (v: number) => PAD.top + chartH - ((v - minVal) / range) * chartH;

  // Grid lines (4 horizontal)
  const gridLines = Array.from({ length: 4 }, (_, i) => {
    const v = minVal + (range / 3) * i;
    return { y: y(v), label: v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v).toString() };
  });

  // X axis labels — show every Nth to avoid crowding
  const labelStep = Math.ceil(data.length / 7);
  const xLabels = data.filter((_, i) => i % labelStep === 0 || i === data.length - 1);

  const buildPath = (s: Series) => {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(Number(d[s.key]) || 0).toFixed(1)}`)
      .join(' ');
  };

  const buildArea = (s: Series) => {
    const linePts = data.map((d, i) => `${x(i).toFixed(1)},${y(Number(d[s.key]) || 0).toFixed(1)}`).join(' L');
    const base = y(minVal).toFixed(1);
    return `M${x(0).toFixed(1)},${base} L${linePts} L${x(data.length - 1).toFixed(1)},${base} Z`;
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center gap-4 mb-2">
        {series.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[11px] text-bega-text-2">{s.label}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: `${height}px` }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="#E6E6E3" strokeWidth="1" strokeDasharray={i === 0 ? '' : '0'} />
            <text x={PAD.left - 6} y={g.y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#97968F">{g.label}</text>
          </g>
        ))}

        {/* X axis labels */}
        {xLabels.map(d => {
          const i = data.indexOf(d);
          return (
            <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#97968F">{d.date}</text>
          );
        })}

        {/* Area fills */}
        {series.map(s => (
          <path key={`area-${s.key}`} d={buildArea(s)} fill={`url(#grad-${s.key})`} />
        ))}

        {/* Lines */}
        {series.map(s => (
          <path key={`line-${s.key}`} d={buildPath(s)} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* Dots */}
        {showDots && series.map(s =>
          data.map((d, i) => (
            <circle key={`${s.key}-${i}`} cx={x(i)} cy={y(Number(d[s.key]) || 0)} r="3" fill="white" stroke={s.color} strokeWidth="1.5" />
          ))
        )}
      </svg>
    </div>
  );
}
