'use client';

import type { SidebarAction, ActionIconName } from './types';
import { trackEvent } from '@/services/insights/analyticsTracker';

// ── Icons ─────────────────────────────────────────────────────────────────────

function CompareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4}
         strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <rect x="2" y="5" width="7" height="11" rx="1.5" />
      <rect x="11" y="4" width="7" height="11" rx="1.5" />
      <path d="M4 8.5h3M4 11h2M13 7.5h3M13 10h3M13 12.5h2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4}
         strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M10 2L3.5 5v5c0 3.8 2.9 6.6 6.5 7.8C13.6 16.6 16.5 13.8 16.5 10V5L10 2z" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4}
         strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M3 18V7l7-4 7 4v11" />
      <path d="M3 18h14" />
      <rect x="8" y="12" width="4" height="6" />
      <path d="M7 9h1M12 9h1M7 12h1M12 12h1" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4}
         strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M10 2l2.2 4.8 5.3.8-3.8 3.7.9 5.3L10 14.1l-4.6 2.5.9-5.3L2.5 7.6l5.3-.8L10 2z" />
    </svg>
  );
}

function ControlsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4}
         strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M3 5h14M3 10h14M3 15h14" />
      <circle cx="7"  cy="5"  r="2" fill="white" strokeWidth={1.4} />
      <circle cx="13" cy="10" r="2" fill="white" strokeWidth={1.4} />
      <circle cx="9"  cy="15" r="2" fill="white" strokeWidth={1.4} />
    </svg>
  );
}

function CityIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4}
         strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <rect x="1"  y="9"  width="6" height="9" />
      <rect x="7"  y="6"  width="6" height="12" />
      <rect x="13" y="11" width="6" height="7" />
      <path d="M1 18h18" />
      <path d="M4  9V7.5M10 6V4.5M16 11V9.5" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4}
         strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M17 3s-3 0-8 5c-3 3-4.5 7-4.5 7s4.5-.5 7.5-4 5-8 5-8z" />
      <path d="M3 17c3-2.5 4.5-7 4.5-7" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4}
         strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M12 2v4h4" />
      <path d="M7 10h6M7 13h4" />
    </svg>
  );
}

const ICON_MAP: Record<ActionIconName, React.ReactNode> = {
  compare:  <CompareIcon />,
  shield:   <ShieldIcon />,
  building: <BuildingIcon />,
  star:     <StarIcon />,
  controls: <ControlsIcon />,
  city:     <CityIcon />,
  leaf:     <LeafIcon />,
  document: <DocumentIcon />,
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function ActionCardSkeleton() {
  return (
    <div className="rounded-xl border border-bega-border-1 px-3 py-2.5 flex items-center gap-3 animate-pulse">
      <div className="w-7 h-7 rounded-lg bg-bega-bg-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-2.5 bg-bega-bg-2 rounded w-3/5 mb-1.5" />
        <div className="h-2 bg-bega-bg-2 rounded w-4/5" />
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface Props {
  action: SidebarAction;
  onSelect: (prompt: string, displayText: string) => void;
}

export default function ActionCard({ action, onSelect }: Props) {
  return (
    <button
      onClick={() => { trackEvent('action_click', action.title); onSelect(action.prompt, action.title); }}
      className="w-full text-left rounded-xl border border-black/[0.06] bg-white px-3 py-2.5
                 flex items-center gap-3 cursor-pointer transition-all duration-200 ease-out
                 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-px
                 active:translate-y-0 active:shadow-none group"
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded-lg bg-bega-bg-1 flex items-center justify-center flex-shrink-0
                      text-bega-text-3 group-hover:text-bega-text-2 group-hover:bg-bega-bg-2
                      transition-colors duration-200">
        <div className="w-3.5 h-3.5">
          {ICON_MAP[action.icon]}
        </div>
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-bega-text-1 truncate leading-snug">
          {action.title}
        </p>
        <p className="text-[10.5px] text-bega-text-3 truncate group-hover:text-bega-text-2 transition-colors">
          {action.description}
        </p>
      </div>
    </button>
  );
}
