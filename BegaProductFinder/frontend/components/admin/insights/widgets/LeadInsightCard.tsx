'use client';
import { useEffect, useRef, useState } from 'react';
import type { LeadInsightCard } from '@/services/insights/insightsV2Service';

const CAT: Record<string, { bg: string; text: string; dot: string }> = {
  'SALES':             { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: '#e11d48' },
  'LEAD QUALITY':      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: '#059669' },
  'CONVERSION':        { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: '#2563eb' },
  'OPPORTUNITY':       { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: '#d97706' },
  'PRODUCT':           { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: '#7c3aed' },
  'ARCHITECT INTENT':  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: '#4338ca' },
  'PROJECT DEMAND':    { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: '#ea580c' },
  'CUSTOMER BEHAVIOR': { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: '#0d9488' },
};

interface Props { card: LeadInsightCard; index?: number }

// ── Popup modal showing the full insight detail ───────────────────────────────

function LeadInsightModal({ card, style, dash, circumference, onClose }: {
  card: LeadInsightCard;
  style: { bg: string; text: string; dot: string };
  dash: number;
  circumference: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-bega-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-scale-in">
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <span className={`text-[9px] font-bold uppercase tracking-[0.22em] px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
              {card.category}
            </span>
            <button
              onClick={onClose}
              className="text-bega-text-3 hover:text-bega-text-1 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="relative flex-shrink-0 w-11 h-11">
              <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#E6E6E3" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={style.dot} strokeWidth="3"
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-bega-text-1">
                {card.score}
              </span>
            </div>
            <h3 className="text-[15px] font-semibold text-bega-text-1 leading-snug pt-1">
              {card.title}
            </h3>
          </div>

          <p className="text-[12.5px] text-bega-text-3 leading-relaxed mb-5">
            {card.summary}
          </p>

          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-bega-text-3 mb-1">Recommended Action</p>
            <p className="text-[12.5px] font-medium text-bega-text-1 leading-snug">{card.action}</p>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-bega-text-3 mb-1">Expected Impact</p>
            <p className="text-[12.5px] text-bega-text-2 leading-snug">{card.impact}</p>
          </div>

          {card.trend > 0 && (
            <div className="mt-4 pt-4 border-t border-bega-border-1 flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 2l4 8H2z" />
              </svg>
              <span className="text-[10px] font-bold text-emerald-600">+{card.trend}% growth signal</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────────

export default function LeadInsightCard({ card, index = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const style = CAT[card.category] ?? CAT['OPPORTUNITY'];

  const circumference = 2 * Math.PI * 15; // r=15
  const dash          = (card.score / 99) * circumference;

  const handleMouseEnter = () => {
    import('gsap').then(({ gsap }) => {
      gsap.to(cardRef.current, {
        y: -5, boxShadow: '0 12px 32px rgba(0,0,0,0.10)',
        duration: 0.22, ease: 'power2.out',
      });
    });
  };
  const handleMouseLeave = () => {
    import('gsap').then(({ gsap }) => {
      gsap.to(cardRef.current, {
        y: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        duration: 0.22, ease: 'power2.out',
      });
    });
  };

  return (
    <>
      <div
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="bg-white border border-bega-border-1 rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Card header */}
        <div className="p-5 pb-4">
          {/* Category + Score */}
          <div className="flex items-start justify-between gap-3 mb-3.5">
            <span className={`text-[9px] font-bold uppercase tracking-[0.22em] px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
              {card.category}
            </span>

            {/* Score arc */}
            <div className="relative flex-shrink-0 w-9 h-9">
              <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#E6E6E3" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={style.dot} strokeWidth="3"
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-bega-text-1">
                {card.score}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-[14px] font-semibold text-bega-text-1 leading-snug mb-2.5">
            {card.title}
          </h3>

          {/* Summary */}
          <p className="text-[12px] text-bega-text-3 leading-relaxed line-clamp-3">
            {card.summary}
          </p>

          {/* Trend badge */}
          {card.trend > 0 && (
            <div className="mt-2.5 flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 2l4 8H2z" />
              </svg>
              <span className="text-[10px] font-bold text-emerald-600">+{card.trend}% growth signal</span>
            </div>
          )}
        </div>

        {/* Open detail popup */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-5 py-3 border-t border-bega-border-1 text-[11px] font-medium text-bega-text-3 hover:text-bega-text-1 hover:bg-bega-bg-1/50 transition-colors"
        >
          <span>View insight details</span>
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M3 10l4-4 4 4M3 4h8" />
          </svg>
        </button>
      </div>

      {open && (
        <LeadInsightModal
          card={card}
          style={style}
          dash={dash}
          circumference={circumference}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
