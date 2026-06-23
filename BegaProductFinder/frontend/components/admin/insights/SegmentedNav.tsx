'use client';
import { useEffect, useRef } from 'react';

interface SegmentedNavProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

/** Pill-style segmented control with a sliding white indicator behind the active option. */
export default function SegmentedNav<T extends string>({ tabs, active, onChange }: SegmentedNavProps<T>) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs      = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === active);
    const btn = btnRefs.current[idx];
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!btn || !container || !indicator) return;

    const rect   = btn.getBoundingClientRect();
    const parent = container.getBoundingClientRect();

    import('gsap').then(({ gsap }) => {
      gsap.to(indicator, {
        left:     rect.left - parent.left,
        width:    rect.width,
        duration: 0.32,
        ease:     'power3.inOut',
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1 bg-bega-bg-1 rounded-full p-1.5">
      <div
        ref={indicatorRef}
        className="absolute top-1.5 bottom-1.5 bg-white rounded-full shadow-sm border border-bega-border-1 pointer-events-none"
        style={{ left: 0, width: 0 }}
      />
      {tabs.map((tab, i) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={el => { btnRefs.current[i] = el; }}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative z-10 px-5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors
              ${isActive ? 'text-bega-text-1' : 'text-bega-text-3 hover:text-bega-text-2'}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
