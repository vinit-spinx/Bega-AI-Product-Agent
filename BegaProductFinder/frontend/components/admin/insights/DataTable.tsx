'use client';

import { useState } from 'react';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowKey: keyof T;
  skeletonRows?: number;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, data, loading, rowKey, skeletonRows = 6,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey as keyof T];
        const bv = b[sortKey as keyof T];
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-bega-bg-1 rounded-xl mb-2" />
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-bega-border-1">
            {columns.map((_, j) => (
              <div key={j} className="h-3.5 bg-bega-bg-2 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) return <EmptyState compact />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-bega-bg-1 rounded-xl">
            {columns.map(col => (
              <th
                key={String(col.key)}
                style={col.width ? { width: col.width } : undefined}
                className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-bega-text-3 whitespace-nowrap first:rounded-l-xl last:rounded-r-xl
                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                  ${col.sortable ? 'cursor-pointer select-none hover:text-bega-text-2 transition-colors' : ''}`}
                onClick={() => col.sortable && handleSort(String(col.key))}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <svg viewBox="0 0 10 12" fill="currentColor" className={`w-2 h-2.5 transition-transform ${sortKey === String(col.key) && sortDir === 'asc' ? 'rotate-180' : ''} ${sortKey === String(col.key) ? 'opacity-100' : 'opacity-30'}`}>
                      <path d="M5 0l3.5 4H1.5zM5 12L1.5 8h7z" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={String(row[rowKey])} className={`border-b border-bega-border-1 hover:bg-bega-bg-1 transition-colors ${i === sorted.length - 1 ? 'border-none' : ''}`}>
              {columns.map(col => (
                <td
                  key={String(col.key)}
                  className={`px-4 py-3 text-[13px] text-bega-text-1
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
