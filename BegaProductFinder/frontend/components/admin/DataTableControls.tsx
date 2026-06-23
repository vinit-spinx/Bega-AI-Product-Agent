'use client';

// Shared filter bar + pagination footer for admin data tables (Contact Inquiries, Lead Pipeline,
// Conversation & Logs) — server-side paginated, 15 rows/page by default.

export interface SelectFilterConfig {
  key: string;
  label: string;
  type: 'select';
  options: { value: string; label: string }[];
}

export interface DateFilterConfig {
  key: string;
  label: string;
  type: 'date';
}

export type FilterConfig = SelectFilterConfig | DateFilterConfig;

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  filterValues = {},
  onFilterChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-4">
      <div className="relative max-w-sm flex-1 min-w-[200px]">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}
             strokeLinecap="round" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-bega-text-3 pointer-events-none">
          <circle cx="6.5" cy="6.5" r="4" />
          <path d="M11 11l3 3" />
        </svg>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-4 py-2 rounded-xl border border-bega-border-2 text-[13px]
                     text-bega-text-1 placeholder:text-bega-text-3 bg-white
                     focus:outline-none focus:ring-2 focus:ring-bega-black/10 focus:border-bega-black/40
                     transition-colors"
        />
      </div>

      {filters.map(f => (
        <div key={f.key} className="flex-shrink-0">
          {f.type === 'select' ? (
            <select
              value={filterValues[f.key] ?? ''}
              onChange={e => onFilterChange?.(f.key, e.target.value)}
              className="appearance-none cursor-pointer py-2 pl-3 pr-7 rounded-xl border border-bega-border-2
                         text-[12.5px] text-bega-text-2 bg-white focus:outline-none focus:ring-2
                         focus:ring-bega-black/10 focus:border-bega-black/40 transition-colors"
            >
              <option value="">{f.label}: All</option>
              {f.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type="date"
              value={filterValues[f.key] ?? ''}
              onChange={e => onFilterChange?.(f.key, e.target.value)}
              title={f.label}
              className="py-2 px-3 rounded-xl border border-bega-border-2 text-[12.5px]
                         text-bega-text-2 bg-white focus:outline-none focus:ring-2
                         focus:ring-bega-black/10 focus:border-bega-black/40 transition-colors"
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface PaginationFooterProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function PaginationFooter({ page, pageSize, total, onPageChange }: PaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-bega-border-1">
      <p className="text-[11.5px] text-bega-text-3">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2.5 py-1.5 rounded-lg text-[12px] text-bega-text-2 border border-bega-border-2
                     hover:bg-bega-bg-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        <span className="text-[11.5px] text-bega-text-3 px-1.5">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2.5 py-1.5 rounded-lg text-[12px] text-bega-text-2 border border-bega-border-2
                     hover:bg-bega-bg-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
