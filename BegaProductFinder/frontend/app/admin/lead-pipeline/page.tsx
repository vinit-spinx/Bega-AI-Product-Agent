'use client';

import LeadPipelineTab from '@/components/admin/insights/tabs/LeadPipelineTab';

export default function LeadPipelinePage() {
  return (
    <div className="px-6 py-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-bega-text-1 tracking-tight mb-1">Lead Pipeline</h1>
          <p className="text-[13px] text-bega-text-3">
            Every captured lead, AI-classified as cold, warm, or hot, with the full conversation behind it.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-bega-text-3 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      <LeadPipelineTab />
    </div>
  );
}
