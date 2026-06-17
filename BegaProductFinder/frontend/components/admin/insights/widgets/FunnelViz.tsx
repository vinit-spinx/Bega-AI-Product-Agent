'use client';
import { useEffect, useRef } from 'react';
import type { FunnelStage } from '@/services/insights/insightsV2Service';

interface Props { stages: FunnelStage[]; loading?: boolean }

const COLORS = ['#1A1A1A', '#5A5750', '#9A9590', '#B5A99A'];

export default function FunnelViz({ stages, loading }: Props) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (loading || !stages.length) return;
    import('gsap').then(({ gsap }) => {
      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const pct = el.dataset.pct ?? '0';
        gsap.fromTo(el,
          { width: '0%', opacity: 0 },
          { width: `${pct}%`, opacity: 1, duration: 0.8, delay: i * 0.12, ease: 'power3.out' }
        );
      });
    });
  }, [stages, loading]);

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="h-2.5 bg-bega-bg-2 rounded w-1/2 mb-2" />
          <div className="h-8 bg-bega-bg-1 rounded-lg" style={{ width: `${100 - i * 20}%` }} />
        </div>
      ))}
    </div>
  );

  if (!stages.length) return <p className="text-[12px] text-bega-text-3 py-4">No funnel data available yet.</p>;

  const topCount = stages[0]?.count ?? 1;

  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const widthPct = topCount > 0 ? Math.round((stage.count / topCount) * 100) : 0;
        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-bega-text-2">{stage.stage}</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-bega-text-1">{stage.count.toLocaleString()}</span>
                <span className="text-[10px] text-bega-text-3">{stage.pct.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-9 bg-bega-bg-1 rounded-xl overflow-hidden relative">
              <div
                ref={el => { barRefs.current[i] = el; }}
                data-pct={widthPct}
                className="h-full rounded-xl flex items-center pl-3 transition-all"
                style={{ background: COLORS[i % COLORS.length], width: 0 }}
              >
                <span className="text-[10px] text-white/80 font-semibold whitespace-nowrap overflow-hidden">
                  {stage.stage}
                </span>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex justify-center mt-1 mb-1">
                <svg className="w-3 h-3 text-bega-border-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 9L1 3h10z" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
