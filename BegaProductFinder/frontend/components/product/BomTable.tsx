'use client';

import { useState } from 'react';
import type { BomLineItem, BomReport } from '@/types';

type SortKey = keyof Pick<BomLineItem, 'areaLabel' | 'catalogNumber' | 'description' | 'familyName' | 'quantity' | 'unitDnp' | 'lineTotalDnp' | 'leadTime'>;

interface BomTableProps {
  report: BomReport;
}

export default function BomTable({ report }: BomTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('areaLabel');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...report.lineItems].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  const exportCsv = () => {
    const headers = ['Area', 'Catalog No.', 'Description', 'Family', 'Qty', 'Unit DNP', 'Line Total DNP', 'Lead Time'];
    const rows = sorted.map(item => [
      item.areaLabel ?? '',
      item.catalogNumber,
      item.description ?? '',
      item.familyName ?? '',
      String(item.quantity),
      item.unitDnp != null ? item.unitDnp.toFixed(2) : '',
      item.lineTotalDnp != null ? item.lineTotalDnp.toFixed(2) : '',
      item.leadTime ?? '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.projectName ?? 'bom'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printBom = () => window.print();

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 overflow-hidden mt-2 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <div>
          <h3 className="font-semibold text-zinc-100 text-sm">
            Bill of Materials{report.projectName ? ` — ${report.projectName}` : ''}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {report.itemCount} line{report.itemCount === 1 ? '' : 's'} · {report.currency}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="text-xs rounded-lg border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 px-3 py-1.5 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={printBom}
            className="text-xs rounded-lg border border-zinc-600 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Not-found warning */}
      {report.notFoundItems.length > 0 && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800/40 text-xs text-red-400">
          Not found in catalog: {report.notFoundItems.join(', ')}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-700 text-zinc-400">
              {([
                ['areaLabel', 'Area'],
                ['catalogNumber', 'Catalog No.'],
                ['description', 'Description'],
                ['familyName', 'Family'],
                ['quantity', 'Qty'],
                ['unitDnp', 'Unit DNP'],
                ['lineTotalDnp', 'Line Total'],
                ['leadTime', 'Lead Time'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="text-left px-3 py-2 font-medium cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap"
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1 text-amber-400">{sortAsc ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, idx) => {
              const isNotFound = report.notFoundItems.includes(item.catalogNumber);
              return (
                <tr
                  key={`${item.catalogNumber}-${idx}`}
                  className={`border-b border-zinc-700/50 ${isNotFound ? 'bg-red-900/20' : idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/30'}`}
                >
                  <td className="px-3 py-2 text-zinc-400">{item.areaLabel ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-amber-400 font-medium">{item.catalogNumber}</td>
                  <td className="px-3 py-2 text-zinc-300 max-w-[200px] truncate">{item.description ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-400 max-w-[120px] truncate">{item.familyName ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-200 text-center">{item.quantity}</td>
                  <td className="px-3 py-2 text-zinc-200 text-right font-mono">
                    {item.unitDnp != null ? `$${item.unitDnp.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-zinc-100 text-right font-mono font-medium">
                    {item.lineTotalDnp != null ? `$${item.lineTotalDnp.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{item.leadTime ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-900/80 border-t-2 border-zinc-600 font-semibold text-zinc-100">
              <td colSpan={4} className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-center">{report.itemCount}</td>
              <td />
              <td className="px-3 py-2 text-right font-mono text-amber-400">
                ${report.subtotalDnp.toFixed(2)}
              </td>
              <td />
            </tr>
            {report.subtotalMsrp > 0 && (
              <tr className="bg-zinc-900/60 text-zinc-400 text-xs">
                <td colSpan={6} className="px-3 py-1.5 text-right">MSRP subtotal</td>
                <td className="px-3 py-1.5 text-right font-mono">${report.subtotalMsrp.toFixed(2)}</td>
                <td />
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
