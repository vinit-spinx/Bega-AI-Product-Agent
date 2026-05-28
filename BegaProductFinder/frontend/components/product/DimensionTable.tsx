interface DimPair {
  label: string;
  whole?: string | null;
  fraction?: string | null;
}

function formatDim(whole?: string | null, fraction?: string | null): string | null {
  if (!whole) return null;
  return fraction ? `${whole}-${fraction}"` : `${whole}"`;
}

interface DimensionTableProps {
  a?: string | null;
  aFraction?: string | null;
  b?: string | null;
  bFraction?: string | null;
  c?: string | null;
  cFraction?: string | null;
  d?: string | null;
  dFraction?: string | null;
  e?: string | null;
  eFraction?: string | null;
}

export default function DimensionTable({
  a, aFraction, b, bFraction, c, cFraction, d, dFraction, e, eFraction,
}: DimensionTableProps) {
  const dims: DimPair[] = [
    { label: 'A', whole: a, fraction: aFraction },
    { label: 'B', whole: b, fraction: bFraction },
    { label: 'C', whole: c, fraction: cFraction },
    { label: 'D', whole: d, fraction: dFraction },
    { label: 'E', whole: e, fraction: eFraction },
  ];

  const visible = dims.filter(d => d.whole);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {visible.map(dim => (
        <span
          key={dim.label}
          className="inline-flex items-center gap-1 text-xs bg-zinc-700/60 rounded px-2 py-0.5"
        >
          <span className="text-zinc-400 font-medium">{dim.label}:</span>
          <span className="text-zinc-200 font-mono">{formatDim(dim.whole, dim.fraction)}</span>
        </span>
      ))}
    </div>
  );
}
