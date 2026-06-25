'use client';

import { useState } from 'react';
import BegaLogo from '../shared/BegaLogo';

const NAV_ITEMS = ['Lighting', 'Controls', 'Furniture', 'Projects', 'Resources'];

interface SiteHeaderProps {
  onLogoClick: () => void;
  disabled?: boolean;
}

// Exported so SiteFooter can render an identical (invisible) copy to reserve the exact
// same width as this header zone — guarantees pixel-matched alignment instead of a guessed value.
export function SearchBox() {
  return (
    <div className="flex items-center gap-2 w-56 px-3 py-1.5 rounded border border-bega-border-2 text-bega-text-3">
      <span className="text-[13px] flex-1">Search #</span>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 flex-shrink-0">
        <circle cx="7" cy="7" r="5" />
        <path d="M11 11l3.5 3.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function AccountIcon() {
  return (
    <div className="flex items-center gap-1 text-bega-text-1">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <circle cx="10" cy="6.5" r="3" />
        <path d="M3.5 17c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-2.5 h-2.5">
        <path d="M1 1.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// Reusable site header — a centered max-width container (mirrors Bootstrap `.container`)
// laid out as a true 3-column grid so the nav sits in a genuinely centered column regardless
// of how wide the logo or search/account cluster are (flex justify-between can't do that).
export default function SiteHeader({ onLogoClick, disabled }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full bg-white border-b border-bega-border-1 flex-shrink-0 relative">
      <div className="max-w-[1320px] mx-auto px-8 grid grid-cols-[auto_1fr_auto] items-center gap-6">
        <button
          type="button"
          onClick={onLogoClick}
          disabled={disabled}
          title="New chat"
          className="flex items-center group transition-opacity disabled:opacity-40 disabled:cursor-not-allowed justify-self-start"
        >
          <BegaLogo width={96} height={29} className="transition-opacity group-hover:opacity-60" />
        </button>

        <nav className="hidden md:flex items-center justify-end">
          {NAV_ITEMS.map(label => (
            <a
              key={label}
              href="#"
              className="relative px-5 py-[21px] text-[16px] leading-[30px] font-normal capitalize
                         text-black hover:text-bega-text-2 transition-colors whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-self-end gap-4">
          <div className="hidden sm:flex items-center gap-4">
            <SearchBox />
            <AccountIcon />
          </div>

          {/* Mobile hamburger — preserves BEGA's hierarchy at narrow widths instead of
              cramming the desktop nav/search/account row into a small viewport. */}
          <button
            type="button"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            className="sm:hidden flex items-center justify-center w-9 h-9 text-bega-text-1"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="w-5 h-5">
              {mobileOpen ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-bega-border-1 bg-white px-8 py-4 space-y-4">
          <nav className="flex flex-col gap-3">
            {NAV_ITEMS.map(label => (
              <a key={label} href="#" className="text-[16px] font-normal capitalize text-black">
                {label}
              </a>
            ))}
          </nav>
          <SearchBox />
          <AccountIcon />
        </div>
      )}
    </header>
  );
}
