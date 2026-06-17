'use client';
import { useRef, useState } from 'react';
import type { OpportunityCard as OppCard } from '@/services/insights/insightsV2Service';

const CAT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  SALES:          { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-100' },
  REVENUE:        { bg: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-100'    },
  PRODUCT:        { bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-100'   },
  CONTENT:        { bg: 'bg-purple-50',   text: 'text-purple-700',   border: 'border-purple-100'  },
  'AI QUALITY':   { bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-100'    },
  SPECIFICATION:  { bg: 'bg-indigo-50',   text: 'text-indigo-700',   border: 'border-indigo-100'  },
};

export default function OpportunityCard({ card }: { card: OppCard }) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const style = CAT_STYLES[card.category] ?? CAT_STYLES.SALES;

  const handleMouseEnter = () => {
    import('gsap').then(({ gsap }) => {
      gsap.to(cardRef.current, { y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.1)', duration: 0.2, ease: 'power2.out' });
    });
  };
  const handleMouseLeave = () => {
    import('gsap').then(({ gsap }) => {
      gsap.to(cardRef.current, { y: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', duration: 0.2, ease: 'power2.out' });
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setExpanded(e => !e)}
      className="bg-white border border-bega-border-1 rounded-2xl p-5 cursor-pointer transition-shadow"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`text-[9px] font-bold uppercase tracking-[0.25em] px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
          {card.category}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {card.growth > 0 && (
            <span className="text-[10px] font-bold text-emerald-600">+{card.growth}%</span>
          )}
          <div className="relative w-8 h-8 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#F0EDE9" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="#1A1A1A" strokeWidth="3"
                strokeDasharray={`${(card.priority / 100) * 94.2} 94.2`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-bega-text-1">
              {card.priority}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[14px] font-semibold text-bega-text-1 leading-snug mb-2">{card.title}</p>
      <p className="text-[12px] text-bega-text-3 leading-relaxed">{card.evidence}</p>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-bega-border-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bega-text-3 mb-1.5">Recommended Action</p>
          <p className="text-[12px] font-medium text-bega-text-1 leading-snug">{card.action}</p>
        </div>
      )}

      <div className="flex items-center gap-1 mt-3">
        <span className="text-[10px] text-bega-text-3">{expanded ? 'Hide action' : 'View recommended action'}</span>
        <svg className={`w-3 h-3 text-bega-text-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </div>
    </div>
  );
}
