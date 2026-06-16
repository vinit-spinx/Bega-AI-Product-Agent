export default function AiInsightsPage() {
  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[22px] font-semibold text-bega-text-1 tracking-tight">AI Insights</h1>
          <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            Phase 2
          </span>
        </div>
        <p className="text-[13px] text-bega-text-3">Analytics and usage insights for the BEGA AI Product Advisor.</p>
      </div>

      <div className="bg-white rounded-2xl border border-bega-border-1 overflow-hidden">
        {/* Placeholder chart area */}
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          {/* Decorative icon */}
          <div className="w-14 h-14 rounded-2xl bg-bega-bg-1 flex items-center justify-center mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="#B0ACA8" strokeWidth={1.4}
                 strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M3 18l5-8 4 4 4-7 5 5" />
              <path d="M3 20h18" />
            </svg>
          </div>

          <h2 className="text-[18px] font-medium text-bega-text-1 mb-2">AI Insights Dashboard</h2>
          <p className="text-[13px] text-bega-text-3 max-w-sm leading-relaxed mb-8">
            Usage analytics, query patterns, popular products, and session insights will appear here in Phase 2.
          </p>

          {/* Coming soon badge */}
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-bega-border-2 text-[12px] font-medium text-bega-text-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Coming Soon
          </span>

          {/* Placeholder cards */}
          <div className="mt-10 grid grid-cols-3 gap-4 w-full max-w-2xl opacity-30 pointer-events-none">
            {['Total Sessions', 'Queries Today', 'Top Product'].map(label => (
              <div key={label} className="rounded-xl border border-bega-border-1 p-4 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-bega-text-3 mb-1">{label}</p>
                <div className="h-6 bg-bega-bg-2 rounded-md w-3/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
