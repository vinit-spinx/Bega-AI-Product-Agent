'use client';

import { useShortlist } from '@/context/ShortlistContext';

export default function ShortlistButton() {
  const { entries, openDrawer } = useShortlist();
  if (entries.length === 0) return null;

  return (
    <button
      onClick={openDrawer}
      className="fixed bottom-32 right-5 z-40 flex items-center gap-2 px-4 py-2.5
                 bg-bega-black hover:bg-bega-text-2 text-white font-medium text-sm
                 rounded-full shadow-xl transition-all duration-200 hover:scale-105"
      aria-label={`Open shortlist — ${entries.length} product${entries.length !== 1 ? 's' : ''}`}
    >
      {/* Bookmark icon */}
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 2a2 2 0 00-2 2v18l8-4 8 4V4a2 2 0 00-2-2H6z" />
      </svg>
      <span>Shortlist</span>
      {/* Count badge */}
      <span className="bg-bega-black text-white text-xs font-bold w-5 h-5 rounded-full
                       flex items-center justify-center leading-none">
        {entries.length}
      </span>
    </button>
  );
}
