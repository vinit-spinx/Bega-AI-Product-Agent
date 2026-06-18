'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/services/admin/authService';

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Content Management',
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
      {
        href: '/admin/ai-insights',
        label: 'AI Insights',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <path d="M3 15l4-6 4 3 3-5 3 4" />
            <path d="M3 17h14" />
          </svg>
        ),
      },
      {
        href: '/admin/lead-pipeline',
        label: 'Lead Pipeline',
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
        label: 'Demand Intelligence',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <path d="M10 2.5l7 3.5v7l-7 3.5-7-3.5v-7z" /><path d="M10 2.5v14M3 6l7 3.5 7-3.5" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Leads',
    items: [
      {
        href: '/admin/inquiries',
        label: 'Contact Inquiries',
        icon: (
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
            <path d="M3 4h14a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" />
            <path d="M2 5l8 6 8-6" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/admin/login');
  };

  return (
    <aside className="w-[280px] flex-shrink-0 h-full flex flex-col bg-white border-r border-bega-border-1">

      {/* ── Brand header ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-5 border-b border-bega-border-1">
        <Link href="/admin" className="flex items-center gap-3.5 group">
          <svg width="18" height="22" viewBox="0 0 20 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" fill="#1A1A1A"
              d="M5.007,5.386 L5.007,11.272 C5.085,11.278 5.147,11.289 5.21,11.289 C6.935,11.289 8.661,11.304 10.387,11.284 C11.325,11.273 12.221,11.047 13.027,10.538 C13.776,10.064 14.208,9.391 14.226,8.477 C14.244,7.507 13.979,6.661 13.169,6.064 C12.45,5.534 11.617,5.374 10.753,5.371 C8.935,5.364 7.117,5.38 5.299,5.386 C5.208,5.387 5.118,5.386 5.007,5.386 Z
              M5.005,22.619 C5.102,22.625 5.183,22.635 5.265,22.635 C7.028,22.635 8.791,22.651 10.554,22.626 C11.086,22.618 11.63,22.55 12.146,22.418 C13.243,22.137 14.134,21.561 14.57,20.432 C14.806,19.82 14.825,19.181 14.755,18.546 C14.624,17.356 14.049,16.448 12.978,15.899 C12.246,15.524 11.462,15.37 10.643,15.372 C8.862,15.375 7.08,15.374 5.298,15.375 C5.201,15.375 5.103,15.375 5.005,15.375 Z
              M0,1.056 C0.092,1.049 0.184,1.035 0.276,1.035 C4.388,1.034 8.501,1.015 12.613,1.044 C14.357,1.056 15.953,1.588 17.286,2.773 C18.29,3.666 18.827,4.821 18.993,6.151 C19.126,7.21 19.141,8.272 18.798,9.298 C18.31,10.762 17.29,11.79 16.047,12.621 C15.946,12.688 15.843,12.751 15.742,12.816 C15.735,12.821 15.732,12.831 15.712,12.861 C15.795,12.907 15.877,12.953 15.961,12.997 C17.725,13.921 19.057,15.24 19.691,17.19 C20.037,18.254 20.048,19.351 19.929,20.449 C19.807,21.567 19.511,22.635 18.921,23.602 C17.958,25.18 16.521,26.093 14.798,26.598 C13.895,26.862 12.969,26.982 12.029,26.982 C8.084,26.983 4.138,26.982 0.193,26.983 C0.129,26.983 0.064,26.994 0,27 Z" />
          </svg>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-bega-black leading-none">BEGA</p>
            <p className="text-[9px] text-bega-text-3 tracking-[0.14em] uppercase mt-[3px]">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 overflow-y-auto pb-2">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="mb-1">
            <p className="px-3 pt-4 pb-1.5 text-[8px] font-bold uppercase tracking-[0.28em] text-bega-text-3">
              {section.label}
            </p>
            <div className="space-y-0.5">
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
          </div>
        ))}
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
