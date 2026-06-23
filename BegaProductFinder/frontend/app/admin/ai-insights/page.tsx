'use client';

import CommandCenterTab from '@/components/admin/insights/tabs/CommandCenterTab';

export default function AiInsightsPage() {
  return (
    <div className="px-6 py-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-bega-text-1 tracking-tight mb-1">AI Insights</h1>
          <p className="text-[13px] text-bega-text-3">
            Business intelligence from real BEGA AI Product Advisor data.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-bega-text-3 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      <CommandCenterTab />
    </div>
  );
}
