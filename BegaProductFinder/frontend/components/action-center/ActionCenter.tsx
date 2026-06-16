'use client';

import { useActions } from './hooks/useActions';
import ActionGrid from './ActionGrid';

interface Props {
  onActionSelect: (prompt: string, displayText: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[8.5px] font-bold uppercase tracking-[0.25em] text-bega-text-3 mb-2">
      {children}
    </p>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-10 h-10 rounded-xl bg-bega-bg-2 flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-bega-text-3" fill="none" viewBox="0 0 20 20"
             stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 7v4M10 13h.01" />
        </svg>
      </div>
      <p className="text-[12px] font-semibold text-bega-text-2 mb-1">No AI Actions Available</p>
      <p className="text-[11px] text-bega-text-3 leading-relaxed">
        Actions will appear here once configured in the Admin Panel.
      </p>
    </div>
  );
}

export default function ActionCenter({ onActionSelect }: Props) {
  const { featured, all, loading, error } = useActions();

  const isEmpty = !loading && featured.length === 0 && all.length === 0;

  return (
    <aside
      className="w-[300px] flex-shrink-0 h-full flex flex-col bg-white border-r border-bega-border-1"
      aria-label="AI Action Center"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-4 border-b border-bega-border-1">
        {/* Geometric accent */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-[3px] h-4 bg-bega-black rounded-full" />
          <div className="w-[3px] h-2.5 bg-bega-border-3 rounded-full" />
        </div>

        <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-bega-black">
          AI Action Center
        </p>
        <p className="text-[11px] text-bega-text-3 mt-0.5 leading-snug">
          Architectural Intelligence Workflows
        </p>
      </div>

      {/* ── Body — no scroll, all cards visible ──────────────────────────── */}
      <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">

        {error && (
          <p className="text-[11px] text-bega-error px-1">
            Failed to load actions. Please refresh.
          </p>
        )}

        {isEmpty && !error && <EmptyState />}

        {/* Featured */}
        {(loading || featured.length > 0) && (
          <section>
            <SectionLabel>Featured</SectionLabel>
            <ActionGrid
              actions={featured}
              loading={loading}
              skeletonCount={3}
              onSelect={onActionSelect}
            />
          </section>
        )}

        {/* All Actions */}
        {(loading || all.length > 0) && (
          <section>
            <SectionLabel>All Actions</SectionLabel>
            <ActionGrid
              actions={all}
              loading={loading}
              skeletonCount={4}
              onSelect={onActionSelect}
            />
          </section>
        )}

      </div>
    </aside>
  );
}
