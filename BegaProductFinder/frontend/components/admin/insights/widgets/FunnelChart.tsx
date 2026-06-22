'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchFunnel, type FunnelData, type TimeRange } from '@/services/insights/insightsV2Service';

export default function FunnelChart({ range }: { range: TimeRange }) {
  const [data, setData]       = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchFunnel(range)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    if (loading || !data?.stages.length) return;
    import('gsap').then(({ gsap }) => {
      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const pct = el.dataset.pct ?? '0';
        gsap.fromTo(el, { width: '0%' }, { width: `${pct}%`, duration: 0.65, delay: i * 0.08, ease: 'power2.out' });
      });
    });
  }, [data, loading]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div className="h-3 bg-bega-bg-1 rounded w-24 mb-2" />
            <div className="h-3 bg-bega-bg-1 rounded-full" style={{ width: `${95 - i * 12}%` }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.stages.length) {
    return (
      <p className="text-[12px] text-bega-text-3 py-6 text-center">
        Funnel data will appear once visitors start querying the AI advisor.
      </p>
    );
  }

  const stage1Count = data.stages[0]?.count ?? 1;
  // Lead Captured includes inquiries submitted via the original "Connect with BEGA Team"
  // form, which doesn't require viewing or shortlisting a product first — so it can
  // exceed earlier stages within the same period. Flag this so the chart reads as
  // intentional rather than broken.
  const leadCapturedStage = data.stages[data.stages.length - 1];
  const midStages = data.stages.slice(1, -1);
  const showLeadCaptureNote = leadCapturedStage != null
    && midStages.some(s => leadCapturedStage.count > s.count);

  return (
    <div>
      <div className="space-y-4">
        {data.stages.map((stage, i) => {
          const widthPct = stage1Count > 0
            ? Math.min(100, Math.round((stage.count / stage1Count) * 100))
            : 0;
          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-bega-text-1">{stage.stage}</span>
                <span className="text-[12px] font-bold text-bega-text-1">{stage.count.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-bega-bg-1 rounded-full overflow-hidden">
                <div
                  ref={el => { barRefs.current[i] = el; }}
                  data-pct={widthPct}
                  className="h-full rounded-full bg-bega-black"
                  style={{ width: 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {data.worstDropOffStage && (
        <p className="text-[12px] text-bega-text-2 mt-4 pt-4 border-t border-bega-border-1">
          <span className="font-semibold text-bega-text-1">Highest drop-off:</span> {data.worstDropOffStage}
        </p>
      )}

      {showLeadCaptureNote && (
        <p className="text-[11px] text-bega-text-3 mt-2 leading-relaxed">
          Lead Captured can exceed earlier stages — it also counts inquiries submitted via
          &ldquo;Connect with BEGA Team&rdquo;, which doesn&apos;t require shortlisting a
          product or generating a BOM first.
        </p>
      )}
    </div>
  );
}
