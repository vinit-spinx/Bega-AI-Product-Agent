'use client';
import { useEffect, useRef } from 'react';
import type { RadarItem } from '@/services/insights/insightsV2Service';

interface Props { items: RadarItem[]; loading?: boolean }

const IMPACT = (growth: number, mentions: number) => Math.min(99, Math.round(50 + growth * 0.35 + mentions * 4));

export default function OpportunityRadar({ items, loading }: Props) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (loading || !items.length) return;
    import('gsap').then(({ gsap }) => {
      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const pct = el.dataset.pct ?? '0';
        gsap.from(el, { width: '0%', duration: 0.7, delay: i * 0.09, ease: 'power2.out' });
        gsap.to(el, { width: `${pct}%`, duration: 0.7, delay: i * 0.09, ease: 'power2.out' });
      });
    });
  }, [items, loading]);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="h-2.5 bg-bega-bg-2 rounded w-1/3 mb-2" />
          <div className="h-1.5 bg-bega-bg-1 rounded-full" />
        </div>
      ))}
    </div>
  );

  if (!items.length) return (
    <p className="text-[12px] text-bega-text-3 text-center py-6">
      No growth signals detected yet. Keep the AI advisor running to surface trends.
    </p>
  );

  return (
    <div className="space-y-3.5">
      {items.map((item, i) => {
        const impact = IMPACT(item.growth, item.mentions);
        const barPct = Math.min(impact, 100);
        return (
          <div key={item.topic}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-bega-text-1">{item.topic}</span>
                {item.growth > 0 && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    +{item.growth}%
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-bega-text-2">{impact}</span>
            </div>
            <div className="h-1.5 bg-bega-bg-2 rounded-full overflow-hidden">
              <div
                ref={el => { barRefs.current[i] = el; }}
                data-pct={barPct}
                className="h-full rounded-full bg-bega-black"
                style={{ width: 0 }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-bega-text-3 pt-1">Impact score = growth velocity × query volume</p>
    </div>
  );
}
