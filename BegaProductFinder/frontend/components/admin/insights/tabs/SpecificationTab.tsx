'use client';
import { useState, useEffect } from 'react';
import { fetchSpecifications, type SpecData } from '@/services/insights/insightsV2Service';
import { useGSAPEntrance, useGSAPScrollReveal } from '@/hooks/useGSAPEntrance';

const STAGE_COLORS: Record<string, string> = {
  Research:      '#E5E0DB',
  Design:        '#C5BFB9',
  Specification: '#9A9590',
  Comparison:    '#5A5750',
  Procurement:   '#1A1A1A',
};

export default function SpecificationTab() {
  const [data, setData]       = useState<SpecData | null>(null);
  const [loading, setLoading] = useState(true);

  const projectRef  = useGSAPEntrance(0.07, [loading]);
  const trendsRef   = useGSAPScrollReveal();
  const stageRef    = useGSAPScrollReveal();

  useEffect(() => {
    fetchSpecifications()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const topProjectCount = data?.projectTypes[0]?.count ?? 1;

  return (
    <div className="space-y-5">
      {/* Project types */}
      <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Project Type Distribution</p>
        <p className="text-[11px] text-bega-text-3 mb-4">What project types are specifiers researching</p>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-bega-bg-1 rounded-xl" />
            ))}
          </div>
        ) : data?.projectTypes.length ? (
          <div ref={projectRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.projectTypes.map(pt => {
              const widthPct = topProjectCount > 0 ? Math.round((pt.count / topProjectCount) * 100) : 0;
              return (
                <div key={pt.type} className="bg-bega-bg-1/50 rounded-xl p-3.5 border border-bega-border-1">
                  <p className="text-[12px] font-semibold text-bega-text-1 leading-snug mb-1.5">{pt.type}</p>
                  <p className="text-[18px] font-bold text-bega-text-1">{pt.count.toLocaleString()}</p>
                  <div className="h-1 bg-bega-bg-2 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-bega-black rounded-full" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-[13px] font-medium text-bega-text-2 mb-1">No project type data yet</p>
            <p className="text-[12px] text-bega-text-3">
              Project types are detected from queries mentioning hotels, villas, campuses, etc.
            </p>
          </div>
        )}
      </div>

      {/* Stage + Emerging trends */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-5">
        {/* Stage distribution — uses data.stages */}
        <div ref={stageRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Specification Stage</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Estimated where users are in their workflow</p>
          {loading ? (
            <div className="flex gap-1 h-32 animate-pulse items-end">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 bg-bega-bg-1 rounded-t-lg" style={{ height: `${60 + i * 8}%` }} />
              ))}
            </div>
          ) : data?.stages.length ? (
            <div className="flex gap-2 items-end h-36">
              {data.stages.map(stage => {
                const maxCount = Math.max(...data.stages.map(s => s.count), 1);
                const heightPct = Math.round((stage.count / maxCount) * 100);
                const color = STAGE_COLORS[stage.stage] ?? '#9A9590';
                return (
                  <div key={stage.stage} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-bega-text-2">{stage.count}</span>
                    <div
                      className="w-full rounded-t-lg"
                      style={{ height: `${heightPct}%`, minHeight: 4, background: color }}
                    />
                    <span className="text-[9px] text-bega-text-3 text-center leading-tight">{stage.stage}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-bega-text-3 py-6 text-center">
              Stage data accumulates from query analysis. Keep the AI advisor active.
            </p>
          )}
        </div>

        {/* Emerging spec trends — uses data.emerging */}
        <div ref={trendsRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Emerging Specification Trends</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Spec terms with growing frequency this period</p>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="h-3 bg-bega-bg-1 rounded w-24" />
                  <div className="h-3 bg-bega-bg-1 rounded w-12" />
                  <div className="h-3 bg-bega-bg-1 rounded w-8" />
                </div>
              ))}
            </div>
          ) : data?.emerging.length ? (
            <div className="space-y-2.5">
              {data.emerging.map((trend, i) => (
                <div key={trend.term} className="flex items-center gap-3">
                  <span className="text-[10px] text-bega-text-3 w-4 text-right flex-shrink-0">{i + 1}</span>
                  <span className="text-[12px] font-medium text-bega-text-1 flex-1">{trend.term}</span>
                  <span className="text-[11px] text-bega-text-2 flex-shrink-0">{trend.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-bega-text-3 py-6 text-center">
              Specification trends will surface as users ask about IP ratings, CCT, control protocols, etc.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
