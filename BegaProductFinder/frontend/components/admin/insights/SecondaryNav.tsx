'use client';
import { useEffect, useRef } from 'react';

export type V2Tab =
  | 'overview'
  | 'leads'
  | 'products'
  | 'specifications'
  | 'content';

const TABS: { id: V2Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-4 h-4">
        <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: 'leads',
    label: 'Lead Intelligence',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <circle cx="6" cy="5" r="2.5" /><path d="M2 14c0-2.2 1.8-4 4-4" /><path d="M11 10l1.5 1.5L16 8" />
      </svg>
    ),
  },
  {
    id: 'products',
    label: 'Product Intelligence',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-4 h-4">
        <path d="M8 2l6 3v6l-6 3L2 11V5z" /><path d="M8 2v12M2 5l6 3 6-3" />
      </svg>
    ),
  },
  {
    id: 'specifications',
    label: 'Specification Intelligence',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-4 h-4">
        <path d="M4 4h8M4 8h6M4 12h4" /><circle cx="13" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'content',
    label: 'Content Intelligence',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-4 h-4">
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <path d="M5 6h6M5 9h4" />
      </svg>
    ),
  },
];

interface Props {
  active: V2Tab;
  onChange: (tab: V2Tab) => void;
}

export default function SecondaryNav({ active, onChange }: Props) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs      = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeIndex = TABS.findIndex(t => t.id === active);
    const btn = btnRefs.current[activeIndex];
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!btn || !container || !indicator) return;

    const rect    = btn.getBoundingClientRect();
    const parent  = container.getBoundingClientRect();

    import('gsap').then(({ gsap }) => {
      gsap.to(indicator, {
        left:     rect.left - parent.left,
        width:    rect.width,
        duration: 0.28,
        ease:     'power3.inOut',
      });
    });
  }, [active]);

  return (
    <div className="border-b border-bega-border-1 -mx-6 px-6 mb-6">
      <div ref={containerRef} className="relative flex gap-0.5 overflow-x-auto scrollbar-none">
        {/* sliding indicator */}
        <div
          ref={indicatorRef}
          className="absolute bottom-0 h-0.5 bg-bega-black rounded-full pointer-events-none transition-none"
          style={{ left: 0, width: 0 }}
        />

        {TABS.map((tab, i) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={el => { btnRefs.current[i] = el; }}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 pb-3 pt-1 text-[12px] font-medium whitespace-nowrap transition-colors border-b-2 border-transparent
                ${isActive ? 'text-bega-text-1' : 'text-bega-text-3 hover:text-bega-text-2'}`}
            >
              <span className={`transition-colors ${isActive ? 'text-bega-text-1' : 'text-bega-text-3'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
