interface InsightHighlightProps {
  label: string;
  value: string;
  sub?: string;
  index: number;
}

const ICONS = [
  // Category
  <svg key="cat" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="3" width="5.5" height="5.5" rx="1" /><rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
    <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" /><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" />
  </svg>,
  // Application
  <svg key="app" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 17V8l7-5 7 5v9" /><rect x="7" y="11" width="6" height="6" rx="0.5" />
  </svg>,
  // Trend
  <svg key="trend" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-4 h-4">
    <path d="M3 15l4-6 4 3 4-7 2 2" /><path d="M15 4h3v3" />
  </svg>,
  // Action
  <svg key="action" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M10 3v7l4 2" /><circle cx="10" cy="10" r="7" />
  </svg>,
];

export default function InsightHighlight({ label, value, sub, index }: InsightHighlightProps) {
  return (
    <div className="bg-bega-bg-1 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-bega-text-3">{ICONS[index % ICONS.length]}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-bega-text-3">{label}</span>
      </div>
      <p className="text-[15px] font-semibold text-bega-text-1 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-bega-text-3">{sub}</p>}
    </div>
  );
}
