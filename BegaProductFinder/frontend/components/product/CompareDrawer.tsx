'use client';

import { useEffect, useRef, useState } from 'react';
import type { BomReport, ColorTemperatureOption, FurnitureSearchResult, ProductDetail, ProductSearchResult } from '@/types';
import { type ShortlistEntry, useShortlist } from '@/context/ShortlistContext';
import BomTable from './BomTable';

// ── helpers ───────────────────────────────────────────────────────────────────

function parseCct(json?: string | null): ColorTemperatureOption[] {
  if (!json) return [];
  try { return JSON.parse(json) as ColorTemperatureOption[]; } catch { return [] }
}

function fmtDim(whole?: string | null, frac?: string | null): string {
  if (!whole && !frac) return '—';
  return [whole, frac].filter(Boolean).join('-') + '"';
}

function asProduct(s: ProductSearchResult | FurnitureSearchResult): ProductSearchResult | null {
  return 'wattageW' in s || 'lumenOutputLm' in s ? s as ProductSearchResult : null;
}

function asFurniture(s: ProductSearchResult | FurnitureSearchResult): FurnitureSearchResult | null {
  return !('wattageW' in s) && 'groupsName' in s ? s as FurnitureSearchResult : null;
}

// Merge base snapshot with detail (detail wins where present)
function merged(e: ShortlistEntry): Partial<ProductDetail & FurnitureSearchResult> {
  return { ...e.snapshot, ...(e.detail ?? {}) } as Partial<ProductDetail & FurnitureSearchResult>;
}

// ── sub-components ────────────────────────────────────────────────────────────

function CellValue({ value }: { value?: string | null | number | boolean }) {
  if (value == null || value === '' || value === false)
    return <span className="text-zinc-600">—</span>;
  if (value === true)
    return <span className="text-emerald-400 text-xs">✓ Yes</span>;
  return <span className="text-zinc-200 text-xs">{String(value)}</span>;
}

function SectionHeader({ label, colCount }: { label: string; colCount: number }) {
  return (
    <tr className="bg-zinc-950/60">
      <td className="sticky left-0 z-10 bg-zinc-950/60 px-4 py-1.5">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
      </td>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-3 py-1.5 border-l border-zinc-800/60" />
      ))}
    </tr>
  );
}

function SpecRow({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
      <td className="sticky left-0 z-10 bg-zinc-900 px-4 py-2 text-zinc-500 text-xs whitespace-nowrap">
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2 text-xs border-l border-zinc-800/40 min-w-[190px]">
          {v}
        </td>
      ))}
    </tr>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function CompareDrawer() {
  const { entries, isOpen, closeDrawer, clearAll, unpin, setQuantity } = useShortlist();
  const [bomReport, setBomReport] = useState<BomReport | null>(null);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomError, setBomError]   = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset BOM when entries change
  useEffect(() => { setBomReport(null); setBomError(''); }, [entries]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeDrawer]);

  if (!isOpen) return null;

  const handleGenerateBom = async () => {
    setBomLoading(true);
    setBomError('');
    try {
      // Route A: call via Next.js proxy (/api/bom → BACKEND_API_URL/api/bom/generate)
      // This avoids the self-signed certificate rejection that occurs when the browser
      // calls NEXT_PUBLIC_API_URL (HTTPS) directly.
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: entries.map(e => ({ catalogNumber: e.catalogNumber, quantity: e.quantity })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const report = await res.json() as BomReport;
      setBomReport(report);
      // Scroll BOM into view after render
      setTimeout(() => {
        drawerRef.current?.querySelector('[data-bom]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setBomError(err instanceof Error ? err.message : 'Failed to generate BOM');
    } finally {
      setBomLoading(false);
    }
  };

  const colCount = entries.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm"
        onClick={closeDrawer}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-50 h-[88vh] flex flex-col
                   bg-zinc-900 border-t border-zinc-700 rounded-t-2xl shadow-2xl
                   overflow-hidden animate-slide-up"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-700 flex-shrink-0 bg-zinc-900">
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 2a2 2 0 00-2 2v18l8-4 8 4V4a2 2 0 00-2-2H6z" />
          </svg>
          <h2 className="font-semibold text-zinc-100 text-sm">
            Product Comparison
            <span className="ml-2 text-zinc-500 font-normal text-xs">
              {colCount} item{colCount !== 1 ? 's' : ''}
            </span>
          </h2>

          <div className="ml-auto flex items-center gap-2">
            {/* Generate BOM button — visible when 2+ items */}
            {colCount >= 2 && (
              <button
                onClick={handleGenerateBom}
                disabled={bomLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                           bg-amber-500 hover:bg-amber-400 text-zinc-900
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-150 shadow-sm shadow-amber-500/20"
              >
                {bomLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-zinc-900/40 border-t-zinc-900 rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate BOM for {colCount} products
                  </>
                )}
              </button>
            )}

            <button
              onClick={clearAll}
              className="text-xs text-zinc-500 hover:text-red-400 px-3 py-2 rounded-lg
                         hover:bg-red-900/20 transition-colors"
            >
              Clear all
            </button>
            <button
              onClick={closeDrawer}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100
                         flex items-center justify-center transition-colors"
              aria-label="Close comparison"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: `${160 + colCount * 210}px` }}>
            <tbody>

              {/* ── Product images + identity ─────────────────────────────── */}
              <tr className="border-b border-zinc-700 bg-zinc-900/50">
                <td className="sticky left-0 z-10 bg-zinc-900/90 w-40 px-4 py-3" />
                {entries.map(e => {
                  const m = merged(e);
                  return (
                    <td key={e.catalogNumber} className="px-3 py-3 border-l border-zinc-800/60 min-w-[210px] align-top">
                      {/* Image */}
                      <div className="w-full h-28 bg-zinc-800 rounded-xl overflow-hidden mb-3 flex items-center justify-center relative">
                        {m.familyListPageImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.familyListPageImage} alt="" className="h-full w-full object-contain p-2" />
                        ) : (
                          <span className="text-zinc-600 text-xs">No image</span>
                        )}
                        {e.detailLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40">
                            <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                          </div>
                        )}
                        {/* Remove button */}
                        <button
                          onClick={() => unpin(e.catalogNumber)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-zinc-900/80 text-zinc-400
                                     hover:text-red-400 hover:bg-red-900/40 flex items-center justify-center
                                     text-[10px] transition-colors"
                          title="Remove from comparison"
                        >
                          ✕
                        </button>
                        {/* Kind badge */}
                        <div className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium
                          ${e.kind === 'furniture'
                            ? 'bg-emerald-900/80 text-emerald-300'
                            : 'bg-amber-900/80 text-amber-300'}`}>
                          {e.kind === 'furniture' ? 'Furniture' : 'Lighting'}
                        </div>
                      </div>

                      {/* Catalog # */}
                      <p className="font-mono font-bold text-amber-400 text-base leading-tight">{e.catalogNumber}</p>

                      {/* Family badges */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {m.familyName && (
                          <span className="text-[10px] bg-zinc-700 text-zinc-300 rounded-full px-2 py-0.5">
                            {m.familyName}
                          </span>
                        )}
                        {m.subFamilyName && (
                          <span className="text-[10px] bg-zinc-700/60 text-zinc-400 rounded-full px-2 py-0.5">
                            {m.subFamilyName}
                          </span>
                        )}
                      </div>

                      {/* Category breadcrumb */}
                      {'categoryName' in m && (m.categoryName || (m as ProductSearchResult).groupsName) && (
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {[(m as ProductSearchResult).categoryName, (m as ProductSearchResult).groupsName]
                            .filter(Boolean).join(' › ')}
                        </p>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* ── Quantity row ──────────────────────────────────────────── */}
              <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                <td className="sticky left-0 z-10 bg-zinc-900/90 px-4 py-2.5 text-zinc-400 text-xs font-medium">
                  Quantity
                </td>
                {entries.map(e => (
                  <td key={e.catalogNumber} className="px-3 py-2.5 border-l border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(e.catalogNumber, e.quantity - 1)}
                        disabled={e.quantity <= 1}
                        className="w-6 h-6 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-200
                                   disabled:opacity-30 flex items-center justify-center text-sm
                                   transition-colors leading-none"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={e.quantity}
                        onChange={ev => setQuantity(e.catalogNumber, parseInt(ev.target.value) || 1)}
                        className="w-12 bg-zinc-800 border border-zinc-600 rounded-lg text-center
                                   text-zinc-100 text-sm py-0.5
                                   focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20"
                      />
                      <button
                        onClick={() => setQuantity(e.catalogNumber, e.quantity + 1)}
                        disabled={e.quantity >= 999}
                        className="w-6 h-6 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-200
                                   disabled:opacity-30 flex items-center justify-center text-sm
                                   transition-colors leading-none"
                      >
                        +
                      </button>
                    </div>
                  </td>
                ))}
              </tr>

              {/* ── Electrical specs ──────────────────────────────────────── */}
              <SectionHeader label="Electrical" colCount={colCount} />

              <SpecRow label="System Wattage"
                values={entries.map(e => {
                  const m = merged(e) as Partial<ProductSearchResult>;
                  const w = m.systemWattageW ?? m.wattageW;
                  return <CellValue key={e.catalogNumber} value={w != null ? `${w} W` : null} />;
                })} />

              <SpecRow label="Lumen Output"
                values={entries.map(e => {
                  const m = merged(e) as Partial<ProductSearchResult>;
                  return <CellValue key={e.catalogNumber} value={m.lumenOutputLm != null ? `${m.lumenOutputLm} lm` : null} />;
                })} />

              <SpecRow label="CCT Options"
                values={entries.map(e => {
                  const m = merged(e) as Partial<ProductSearchResult>;
                  const ccts = parseCct(m.colorTemperatureJson);
                  if (ccts.length === 0) return <CellValue key={e.catalogNumber} value={null} />;
                  return (
                    <div key={e.catalogNumber} className="flex flex-wrap gap-1">
                      {ccts.map(c => (
                        <span key={c.code}
                          className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30
                                     rounded px-1.5 py-0.5 font-mono">
                          {c.kelvin}K
                        </span>
                      ))}
                    </div>
                  );
                })} />

              <SpecRow label="Voltage"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={(merged(e) as Partial<ProductSearchResult>).voltage} />)} />

              <SpecRow label="Control Protocol"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={(merged(e) as Partial<ProductSearchResult>).controlProtocol} />)} />

              <SpecRow label="Beam Angle"
                values={entries.map(e => {
                  const m = merged(e) as Partial<ProductSearchResult>;
                  return <CellValue key={e.catalogNumber} value={m.beamAngleDeg != null ? `${m.beamAngleDeg}°` : null} />;
                })} />

              {/* ── Physical specs ────────────────────────────────────────── */}
              <SectionHeader label="Physical" colCount={colCount} />

              <SpecRow label="IP Rating (B)"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={(merged(e) as Partial<ProductDetail>).ratingB} />)} />

              <SpecRow label="IP Rating (U)"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={(merged(e) as Partial<ProductDetail>).ratingU} />)} />

              <SpecRow label="Dimension A"
                values={entries.map(e => {
                  const m = merged(e);
                  return <CellValue key={e.catalogNumber} value={fmtDim(m.dimensionA, m.dimensionAFraction)} />;
                })} />

              <SpecRow label="Dimension B"
                values={entries.map(e => {
                  const m = merged(e);
                  return <CellValue key={e.catalogNumber} value={fmtDim(m.dimensionB, m.dimensionBFraction)} />;
                })} />

              <SpecRow label="Dimension C"
                values={entries.map(e => {
                  const m = merged(e);
                  return <CellValue key={e.catalogNumber} value={fmtDim(m.dimensionC, m.dimensionCFraction)} />;
                })} />

              {/* ── Finish / Furniture ───────────────────────────────────── */}
              <SectionHeader label="Finish & Application" colCount={colCount} />

              <SpecRow label="Finish"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={(merged(e) as Partial<ProductDetail & FurnitureSearchResult>).finish} />)} />

              <SpecRow label="Application"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={(merged(e) as Partial<ProductSearchResult>).application} />)} />

              {/* ── Commercial ────────────────────────────────────────────── */}
              <SectionHeader label="Commercial" colCount={colCount} />

              <SpecRow label="DNP Price"
                values={entries.map(e => {
                  const m = merged(e) as Partial<ProductSearchResult>;
                  return <CellValue key={e.catalogNumber}
                    value={m.dnpPrice != null && m.dnpPrice > 0 ? `$${m.dnpPrice.toFixed(2)}` : null} />;
                })} />

              <SpecRow label="Lead Time"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={merged(e).leadTime} />)} />

              <SpecRow label="ADA Compliant"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={(merged(e) as Partial<ProductSearchResult>).isAdaCompliant} />)} />

              <SpecRow label="Express Delivery"
                values={entries.map(e => <CellValue key={e.catalogNumber} value={(merged(e) as Partial<ProductSearchResult>).isExpressDelivery} />)} />

              {/* ── Spec links ────────────────────────────────────────────── */}
              <SectionHeader label="Documents" colCount={colCount} />
              <tr className="border-b border-zinc-800/40">
                <td className="sticky left-0 z-10 bg-zinc-900 px-4 py-2.5 text-zinc-500 text-xs">Spec Sheet</td>
                {entries.map(e => {
                  const m = merged(e);
                  return (
                    <td key={e.catalogNumber} className="px-3 py-2.5 border-l border-zinc-800/40">
                      {m.specDocumentUrl ? (
                        <a href={m.specDocumentUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-amber-400 hover:underline">
                          View PDF ↗
                        </a>
                      ) : <CellValue value={null} />}
                    </td>
                  );
                })}
              </tr>

              {/* Spacer row */}
              <tr><td colSpan={colCount + 1} className="py-2" /></tr>

            </tbody>
          </table>

          {/* ── BOM error ─────────────────────────────────────────────────── */}
          {bomError && (
            <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-xs">
              {bomError}
            </div>
          )}

          {/* ── BOM result ────────────────────────────────────────────────── */}
          {bomReport && (
            <div data-bom className="mx-4 mb-6">
              <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
                Bill of Materials — Shortlisted Products
              </p>
              <BomTable report={bomReport} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
