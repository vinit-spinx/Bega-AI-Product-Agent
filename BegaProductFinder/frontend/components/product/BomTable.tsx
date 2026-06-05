'use client';

import { useState } from 'react';
import type { BomLineItem, BomReport } from '@/types';

// ── Energy config — set in .env.local ────────────────────────────────────────
const HOURS_PER_DAY  = parseFloat(process.env.NEXT_PUBLIC_ENERGY_HOURS_PER_DAY  ?? '8');
const COST_PER_KWH   = parseFloat(process.env.NEXT_PUBLIC_ENERGY_COST_PER_KWH   ?? '0.15');
const DAYS_PER_YEAR  = 365;

type SortKey = keyof Pick<BomLineItem,
  'areaLabel' | 'catalogNumber' | 'description' | 'familyName' |
  'quantity' | 'unitDnp' | 'lineTotalDnp' | 'leadTime' | 'systemWattageW'>;

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

  // ── Energy calculations ───────────────────────────────────────────────────
  const totalWatts    = report.totalSystemWattageW ?? 0;
  const hasEnergy     = totalWatts > 0;
  const annualKwh     = totalWatts * HOURS_PER_DAY * DAYS_PER_YEAR / 1000;
  const annualCost    = annualKwh * COST_PER_KWH;

  // Only show the Sys W column when at least one line item carries wattage
  const hasWattageCol = report.lineItems.some(i => (i.systemWattageW ?? 0) > 0);

  // ── Print invoice ─────────────────────────────────────────────────────────
  const printInvoice = () => {
    const printDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const lineRows = sorted.map((item, idx) => {
      const isNotFound = report.notFoundItems.includes(item.catalogNumber);
      const rowBg = isNotFound ? '#3b0a0a' : idx % 2 === 0 ? '#ffffff' : '#f9f9f9';
      return `
        <tr style="background:${rowBg}; border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 10px; color:#6b7280;">${item.areaLabel ?? '—'}</td>
          <td style="padding:8px 10px; font-family:monospace; font-weight:600; color:#b45309;">${item.catalogNumber}</td>
          <td style="padding:8px 10px; color:#111827;">${item.description ?? '—'}</td>
          <td style="padding:8px 10px; color:#374151;">${item.familyName ?? '—'}</td>
          <td style="padding:8px 10px; text-align:center; color:#111827;">${item.quantity}</td>
          ${hasWattageCol ? `<td style="padding:8px 10px; text-align:right; font-family:monospace; color:#374151;">${item.systemWattageW != null && item.systemWattageW > 0 ? item.systemWattageW.toFixed(1) + ' W' : '—'}</td>` : ''}
          <td style="padding:8px 10px; text-align:right; font-family:monospace; color:#111827;">${item.unitDnp != null ? '$' + item.unitDnp.toFixed(2) : '—'}</td>
          <td style="padding:8px 10px; text-align:right; font-family:monospace; font-weight:600; color:#111827;">${item.lineTotalDnp != null ? '$' + item.lineTotalDnp.toFixed(2) : '—'}</td>
          <td style="padding:8px 10px; color:#6b7280; white-space:nowrap;">${item.leadTime ?? '—'}</td>
        </tr>`;
    }).join('');

    const energySection = hasEnergy ? `
      <div style="margin-top:24px; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
        <div style="background:#fefce8; padding:10px 14px; border-bottom:1px solid #e5e7eb;">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#92400e;">
            ⚡ Energy &amp; Power Budget
          </span>
          <span style="font-size:10px; color:#9ca3af; margin-left:8px;">${HOURS_PER_DAY} hr/day · $${COST_PER_KWH.toFixed(2)}/kWh</span>
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:12px 14px; border-right:1px solid #e5e7eb; width:33%;">
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; margin-bottom:4px;">Total System Wattage</div>
              <div style="font-size:20px; font-weight:700; color:#b45309;">${totalWatts.toFixed(1)} W</div>
              <div style="font-size:10px; color:#9ca3af; margin-top:2px;">across all lighting fixtures</div>
            </td>
            <td style="padding:12px 14px; border-right:1px solid #e5e7eb; width:33%;">
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; margin-bottom:4px;">Annual Consumption</div>
              <div style="font-size:20px; font-weight:700; color:#111827;">${annualKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh</div>
              <div style="font-size:10px; color:#9ca3af; margin-top:2px;">per year</div>
            </td>
            <td style="padding:12px 14px; width:33%;">
              <div style="font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; margin-bottom:4px;">Estimated Annual Cost</div>
              <div style="font-size:20px; font-weight:700; color:#b45309;">$${annualCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style="font-size:10px; color:#9ca3af; margin-top:2px;">per year</div>
            </td>
          </tr>
        </table>
        <div style="padding:8px 14px; background:#f9fafb; border-top:1px solid #e5e7eb; font-size:10px; color:#9ca3af; font-family:monospace;">
          Formula: ${totalWatts.toFixed(1)} W × (${HOURS_PER_DAY} hr × ${DAYS_PER_YEAR} days) ÷ 1,000 = ${annualKwh.toFixed(1)} kWh/yr &nbsp;·&nbsp; ${annualKwh.toFixed(1)} × $${COST_PER_KWH.toFixed(2)} = $${annualCost.toFixed(2)}/yr
        </div>
      </div>` : '';

    const notFoundSection = report.notFoundItems.length > 0 ? `
      <div style="margin-top:16px; padding:10px 14px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; font-size:12px; color:#b91c1c;">
        ⚠ Not found in catalog: ${report.notFoundItems.join(', ')}
      </div>` : '';

    const msrpRow = report.subtotalMsrp > 0 ? `
      <tr style="background:#f9fafb;">
        <td colspan="${hasWattageCol ? 7 : 6}" style="padding:6px 10px; text-align:right; font-size:11px; color:#6b7280;">MSRP subtotal</td>
        <td style="padding:6px 10px; text-align:right; font-family:monospace; font-size:11px; color:#374151;">$${report.subtotalMsrp.toFixed(2)}</td>
        <td></td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BOM — ${report.projectName ?? 'Bill of Materials'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111827; background: #fff; }
    @page { margin: 15mm 15mm 20mm; size: A4 landscape; }
    @media print {
      .no-print { display: none !important; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
    .page { max-width: 1050px; margin: 0 auto; padding: 32px 24px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:2px solid #111827;">
    <div>
      <div style="font-size:22px; font-weight:800; letter-spacing:-.5px; color:#111827;">BEGA</div>
      <div style="font-size:11px; color:#6b7280; margin-top:2px;">Architectural Lighting &amp; Urban Design</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px; font-weight:700; color:#111827;">Bill of Materials</div>
      ${report.projectName ? `<div style="font-size:13px; color:#b45309; font-weight:600; margin-top:4px;">${report.projectName}</div>` : ''}
      <div style="font-size:11px; color:#6b7280; margin-top:4px;">Generated: ${printDate}</div>
      <div style="font-size:11px; color:#6b7280; margin-top:2px;">${report.itemCount} line item${report.itemCount === 1 ? '' : 's'} · ${report.currency}</div>
    </div>
  </div>

  <!-- Line items table -->
  <table>
    <thead>
      <tr style="background:#111827; color:#f9fafb;">
        <th style="padding:9px 10px; text-align:left;">Area</th>
        <th style="padding:9px 10px; text-align:left;">Catalog No.</th>
        <th style="padding:9px 10px; text-align:left;">Description</th>
        <th style="padding:9px 10px; text-align:left;">Family</th>
        <th style="padding:9px 10px; text-align:center;">Qty</th>
        ${hasWattageCol ? '<th style="padding:9px 10px; text-align:right;">Sys W</th>' : ''}
        <th style="padding:9px 10px; text-align:right;">Unit DNP</th>
        <th style="padding:9px 10px; text-align:right;">Line Total</th>
        <th style="padding:9px 10px; text-align:left;">Lead Time</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
    <tfoot>
      <tr style="background:#111827; color:#f9fafb; font-weight:700;">
        <td colspan="4" style="padding:10px 10px;">Total</td>
        <td style="padding:10px 10px; text-align:center;">${report.itemCount}</td>
        ${hasWattageCol ? `<td style="padding:10px 10px; text-align:right; font-family:monospace;">${totalWatts > 0 ? totalWatts.toFixed(1) + ' W' : ''}</td>` : ''}
        <td></td>
        <td style="padding:10px 10px; text-align:right; font-family:monospace; color:#fbbf24; font-size:14px;">$${report.subtotalDnp.toFixed(2)}</td>
        <td></td>
      </tr>
      ${msrpRow}
    </tfoot>
  </table>

  ${notFoundSection}
  ${energySection}

  <!-- Footer -->
  <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
    <div style="font-size:10px; color:#9ca3af;">Prices shown are Distributor Net Price (DNP) in ${report.currency}. For final pricing confirmation and availability, contact a BEGA representative.</div>
    <div class="no-print">
      <button onclick="window.print()" style="background:#111827; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">
        🖨 Print / Save PDF
      </button>
    </div>
  </div>

</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const headers = [
      'Area', 'Catalog No.', 'Description', 'Family',
      'Qty', 'Sys W', 'Unit DNP', 'Line Total DNP', 'Lead Time',
    ];
    const rows = sorted.map(item => [
      item.areaLabel ?? '',
      item.catalogNumber,
      item.description ?? '',
      item.familyName ?? '',
      String(item.quantity),
      item.systemWattageW != null ? item.systemWattageW.toFixed(1) : '',
      item.unitDnp != null ? item.unitDnp.toFixed(2) : '',
      item.lineTotalDnp != null ? item.lineTotalDnp.toFixed(2) : '',
      item.leadTime ?? '',
    ]);

    const energySection = hasEnergy ? [
      [],
      ['Energy Summary'],
      ['Operating hours/day', String(HOURS_PER_DAY)],
      ['Cost per kWh ($)', String(COST_PER_KWH)],
      ['Total System Wattage (W)', totalWatts.toFixed(2)],
      ['Annual Consumption (kWh/yr)', annualKwh.toFixed(1)],
      ['Estimated Annual Cost ($/yr)', annualCost.toFixed(2)],
    ] : [];

    const csv = [...[headers, ...rows], ...energySection]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${report.projectName ?? 'bom'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Table columns definition ──────────────────────────────────────────────
  const baseCols: [SortKey, string][] = [
    ['areaLabel',    'Area'],
    ['catalogNumber','Catalog No.'],
    ['description',  'Description'],
    ['familyName',   'Family'],
    ['quantity',     'Qty'],
  ];
  const wattageCols: [SortKey, string][] = hasWattageCol
    ? [['systemWattageW', 'Sys W']]
    : [];
  const priceCols: [SortKey, string][] = [
    ['unitDnp',     'Unit DNP'],
    ['lineTotalDnp','Line Total'],
    ['leadTime',    'Lead Time'],
  ];
  const allCols = [...baseCols, ...wattageCols, ...priceCols];

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 overflow-hidden mt-2 animate-fade-in">

      {/* ── Header bar ────────────────────────────────────────────────────── */}
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
            onClick={printInvoice}
            className="text-xs rounded-lg border border-zinc-600 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* ── Not-found warning ─────────────────────────────────────────────── */}
      {report.notFoundItems.length > 0 && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800/40 text-xs text-red-400">
          Not found in catalog: {report.notFoundItems.join(', ')}
        </div>
      )}

      {/* ── Line items table ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-700 text-zinc-400">
              {allCols.map(([key, label]) => (
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
                  className={`border-b border-zinc-700/50 ${
                    isNotFound ? 'bg-red-900/20' : idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/30'
                  }`}
                >
                  <td className="px-3 py-2 text-zinc-400">{item.areaLabel ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-amber-400 font-medium">{item.catalogNumber}</td>
                  <td className="px-3 py-2 text-zinc-300 max-w-[200px] truncate">{item.description ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-400 max-w-[120px] truncate">{item.familyName ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-200 text-center">{item.quantity}</td>
                  {hasWattageCol && (
                    <td className="px-3 py-2 text-zinc-300 text-right font-mono whitespace-nowrap">
                      {item.systemWattageW != null && item.systemWattageW > 0
                        ? `${item.systemWattageW.toFixed(1)} W`
                        : <span className="text-zinc-600">—</span>
                      }
                    </td>
                  )}
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
              {hasWattageCol && (
                <td className="px-3 py-2 text-right font-mono text-zinc-300 whitespace-nowrap">
                  {totalWatts > 0 ? `${totalWatts.toFixed(1)} W` : ''}
                </td>
              )}
              <td />
              <td className="px-3 py-2 text-right font-mono text-amber-400">
                ${report.subtotalDnp.toFixed(2)}
              </td>
              <td />
            </tr>
            {report.subtotalMsrp > 0 && (
              <tr className="bg-zinc-900/60 text-zinc-400 text-xs">
                <td colSpan={hasWattageCol ? 7 : 6} className="px-3 py-1.5 text-right">MSRP subtotal</td>
                <td className="px-3 py-1.5 text-right font-mono">${report.subtotalMsrp.toFixed(2)}</td>
                <td />
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* ── Energy & Power Budget Summary ─────────────────────────────────── */}
      {hasEnergy && (
        <div className="border-t border-zinc-700 bg-zinc-900/50">
          {/* Section header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Energy &amp; Power Budget
            </span>
            <span className="text-zinc-600 text-[10px]">— lighting fixtures only</span>
            <span className="ml-auto text-zinc-600 text-[10px]">
              {HOURS_PER_DAY} hr/day · ${COST_PER_KWH.toFixed(2)}/kWh
            </span>
          </div>

          {/* Three stat cards */}
          <div className="grid grid-cols-3 gap-px bg-zinc-700/50 border-t border-zinc-700/50">
            <EnergyStat
              label="Total System Wattage"
              value={`${totalWatts.toFixed(1)} W`}
              sub="across all lighting fixtures"
              accent
            />
            <EnergyStat
              label="Annual Consumption"
              value={`${annualKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh`}
              sub="per year"
            />
            <EnergyStat
              label="Estimated Annual Cost"
              value={`$${annualCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub="per year"
              accent
            />
          </div>

          {/* Calculation formula */}
          <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-zinc-600 text-[10px]">Formula:</span>
            <span className="text-zinc-500 text-[10px] font-mono">
              {totalWatts.toFixed(1)} W × ({HOURS_PER_DAY} hr × {DAYS_PER_YEAR} days) ÷ 1,000
              = {annualKwh.toFixed(1)} kWh/yr
            </span>
            <span className="text-zinc-600 text-[10px]">·</span>
            <span className="text-zinc-500 text-[10px] font-mono">
              {annualKwh.toFixed(1)} × ${COST_PER_KWH.toFixed(2)} = ${annualCost.toFixed(2)}/yr
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function EnergyStat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-zinc-900/60 px-4 py-3">
      <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wide leading-tight mb-1">{label}</p>
      <p className={`text-lg font-bold leading-tight ${accent ? 'text-amber-400' : 'text-zinc-100'}`}>{value}</p>
      <p className="text-zinc-600 text-[10px] mt-0.5">{sub}</p>
    </div>
  );
}
