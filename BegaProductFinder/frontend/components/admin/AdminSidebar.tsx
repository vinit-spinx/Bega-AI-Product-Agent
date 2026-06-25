'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/services/admin/authService';
import BegaLogo from '../shared/BegaLogo';

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  icon: React.ReactNode;
}

interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'cms',
    label: 'Content',
    items: [
      {
        href: '/admin/ai-actions',
        label: 'AI Actions',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <rect x="3" y="3" width="5.5" height="5.5" rx="1" />
            <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
            <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" />
            <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" />
          </svg>
        ),
      },
      {
        href: '/admin/suggestions',
        label: 'Suggestions',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-[15px] h-[15px]">
            <path d="M3 5h14M3 9h10M3 13h12M3 17h7" />
          </svg>
        ),
      },
      {
        href: '/admin/hero-content',
        label: 'Hero Content',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <rect x="2" y="4" width="16" height="12" rx="1.5" />
            <path d="M2 9.5l4-3 4 3.5 2.5-2 5.5 4" />
            <circle cx="6.5" cy="7" r="1" fill="currentColor" stroke="none" />
          </svg>
        ),
      },
    ],
  },
  {
    key: 'inquiries',
    label: 'Inquiries',
    items: [
      {
        href: '/admin/inquiries',
        label: 'Inquiries',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <path d="M3 4h14a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" />
            <path d="M2 5l8 6 8-6" />
          </svg>
        ),
      },
      {
        href: '/admin/conversations',
        label: 'Conversations',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <path d="M3 4h11a1 1 0 011 1v7a1 1 0 01-1 1H8l-3.5 3v-3H3a1 1 0 01-1-1V5a1 1 0 011-1z" />
          </svg>
        ),
      },
    ],
  },
  {
    key: 'intelligence',
    label: 'Insights',
    items: [
      {
        href: '/admin/ai-insights',
        label: 'Overview',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <path d="M3 15l4-6 4 3 3-5 3 4" />
            <path d="M3 17h14" />
          </svg>
        ),
      },
      {
        href: '/admin/lead-pipeline',
        label: 'Leads',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <rect x="2.5" y="3.5" width="15" height="3.4" rx="1" />
            <rect x="2.5" y="8.3" width="15" height="3.4" rx="1" />
            <rect x="2.5" y="13.1" width="9" height="3.4" rx="1" />
          </svg>
        ),
      },
      {
        href: '/admin/demand-intelligence',
        label: 'Demand Trends',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <path d="M10 2.5l7 3.5v7l-7 3.5-7-3.5v-7z" /><path d="M10 2.5v14M3 6l7 3.5 7-3.5" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const activeSection = NAV_SECTIONS.find(s => s.items.some(i => pathname.startsWith(i.href)))?.key
    ?? NAV_SECTIONS[0].key;

  // Parent/child accordion — every group is visible at once; only the active group auto-expands,
  // the rest start collapsed but can be opened manually.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set([activeSection]));

  // If navigation happens from elsewhere (e.g. browser back), make sure the group containing
  // the new active route is expanded.
  useEffect(() => {
    setOpenSections(prev => {
      if (prev.has(activeSection)) return prev;
      return new Set(prev).add(activeSection);
    });
  }, [activeSection]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    router.replace('/admin/login');
  };

  return (
    <aside className="w-[280px] flex-shrink-0 h-full flex flex-col bg-white border-r border-bega-border-1">

      {/* ── Brand header ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-5 border-b border-bega-border-1">
        <Link href="/admin" className="flex items-center group">
          <BegaLogo width={88} height={27} />
        </Link>
      </div>

      {/* ── Navigation — single parent/child accordion menu ──────────────── */}
      <nav className="flex-1 px-3 pt-3 overflow-y-auto pb-2">
        <Link
          href="/admin/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl text-[13px] font-medium
                      transition-all duration-150
                      ${pathname.startsWith('/admin/dashboard')
                        ? 'bg-bega-black text-white'
                        : 'text-bega-text-2 hover:bg-bega-bg-1 hover:text-bega-text-1'
                      }`}
        >
          <span className={`flex-shrink-0 ${pathname.startsWith('/admin/dashboard') ? 'text-white' : 'text-bega-text-3'}`}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
              <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1" />
              <rect x="11" y="2.5" width="6.5" height="10.5" rx="1" />
              <rect x="2.5" y="11" width="6.5" height="6.5" rx="1" />
              <rect x="11" y="15" width="6.5" height="2.5" rx="0.5" />
            </svg>
          </span>
          Dashboard
        </Link>

        {NAV_SECTIONS.map(section => {
          const isOpen = openSections.has(section.key);
          const sectionActive = section.items.some(i => pathname.startsWith(i.href));
          return (
            <div key={section.key} className="mb-1">
              {/* Parent */}
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl
                            text-[12.5px] font-bold uppercase tracking-wide transition-colors duration-150
                            ${sectionActive ? 'text-bega-text-1' : 'text-bega-text-3 hover:text-bega-text-1'}`}
              >
                {section.label}
                <svg
                  viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"
                  className={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                >
                  <path d="M3 2l5 4-5 4" />
                </svg>
              </button>

              {/* Children */}
              {isOpen && (
                <div className="space-y-0.5 mt-0.5 mb-2 pl-2.5 border-l border-bega-border-1 ml-3.5">
                  {section.items.map(item => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
                                    transition-all duration-150
                                    ${isActive
                                      ? 'bg-bega-black text-white'
                                      : 'text-bega-text-2 hover:bg-bega-bg-1 hover:text-bega-text-1'
                                    }`}
                      >
                        <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-bega-text-3'}`}>
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className={`text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0
                            ${isActive ? 'bg-white/20 text-white' : 'bg-bega-bg-2 text-bega-text-3'}`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-bega-border-1 mt-2 space-y-0.5">
        <Link
          href="/chat/sidebar"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] text-bega-text-3
                     hover:text-bega-text-1 hover:bg-bega-bg-1 transition-colors group"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}
               strokeLinecap="round" className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform">
            <path d="M13 5L7 10l6 5" />
          </svg>
          Back to Chat
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px]
                     text-bega-text-3 hover:text-red-600 hover:bg-red-50 transition-colors group"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}
               strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M13 15l4-5-4-5" />
            <path d="M17 10H7" />
            <path d="M7 19H4a1 1 0 01-1-1V2a1 1 0 011-1h3" />
          </svg>
          Sign Out
        </button>
      </div>

    </aside>
  );
}
