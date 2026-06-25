'use client';

import DemandIntelligenceTab from '@/components/admin/insights/tabs/DemandIntelligenceTab';

export default function DemandIntelligencePage() {
  return (
    <div className="px-6 py-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-[24px] font-semibold text-bega-text-1 tracking-tight mb-1">Demand Trends</h1>
          <p className="text-[13px] text-bega-text-3">
            Product demand, specification trends, and content effectiveness.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-bega-text-3 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      <DemandIntelligenceTab />
    </div>
  );
}
