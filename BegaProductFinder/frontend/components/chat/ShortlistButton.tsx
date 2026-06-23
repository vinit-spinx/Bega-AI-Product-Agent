'use client';

import { useShortlist } from '@/context/ShortlistContext';

interface ShortlistButtonProps {
  /** Pushes "Compare shortlisted products" into the conversation as the next step. */
  onClick: () => void;
}

export default function ShortlistButton({ onClick }: ShortlistButtonProps) {
  const { entries } = useShortlist();
  const isEmpty = entries.length === 0;

  return (
    <button
      onClick={isEmpty ? undefined : onClick}
      data-tour="shortlist-button"
      aria-label={isEmpty ? 'Shortlist is empty' : `Open shortlist — ${entries.length} product${entries.length !== 1 ? 's' : ''}`}
      className={`fixed bottom-32 right-5 z-40 flex items-center gap-2 px-4 py-2.5
                 font-medium text-sm rounded-full shadow-xl transition-all duration-200
                 ${isEmpty
                   ? 'bg-white border border-bega-border-2 text-bega-text-3 cursor-default shadow-sm'
                   : 'bg-bega-black hover:bg-bega-text-2 text-white hover:scale-105 cursor-pointer'
                 }`}
    >
      {/* Bookmark icon */}
      <svg className="w-4 h-4" fill={isEmpty ? 'none' : 'currentColor'} stroke="currentColor"
           strokeWidth={isEmpty ? 1.5 : 0} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      <span>Shortlist</span>
      {/* Count badge */}
      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none
                        ${isEmpty
                          ? 'bg-bega-border-2 text-bega-text-3'
                          : 'bg-white/20 text-white'
                        }`}>
        {entries.length}
      </span>
    </button>
  );
}
