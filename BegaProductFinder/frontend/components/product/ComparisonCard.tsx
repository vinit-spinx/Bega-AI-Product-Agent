'use client';

import type { ColorTemperatureOption, FurnitureSearchResult, ProductDetail, ProductSearchResult } from '@/types';
import { type ShortlistEntry, useShortlist } from '@/context/ShortlistContext';
import CompareTour from '../tour/CompareTour';

// ── helpers ───────────────────────────────────────────────────────────────────

function parseCct(json?: string | null): ColorTemperatureOption[] {
  if (!json) return [];
  try { return JSON.parse(json) as ColorTemperatureOption[]; } catch { return [] }
}

function fmtDim(whole?: string | null, frac?: string | null): string {
  if (!whole && !frac) return '—';
  return [whole, frac].filter(Boolean).join('-') + '"';
}

// Merge base snapshot with detail (detail wins where present)
function merged(e: ShortlistEntry): Partial<ProductDetail & FurnitureSearchResult> {
  return { ...e.snapshot, ...(e.detail ?? {}) } as Partial<ProductDetail & FurnitureSearchResult>;
}

// ── sub-components ────────────────────────────────────────────────────────────

function CellValue({ value }: { value?: string | null | number | boolean }) {
  if (value == null || value === '' || value === false)
    return <span className="text-bega-text-3">—</span>;
  if (value === true)
    return <span className="text-bega-success text-xs font-medium">✓ Yes</span>;
  return <span className="text-bega-text-1 text-xs">{String(value)}</span>;
}

function SectionHeader({ label, colCount }: { label: string; colCount: number }) {
  return (
    <tr className="bg-bega-bg-2">
      <td className="sticky left-0 z-10 bg-bega-bg-2 px-4 py-1.5">
        <span className="text-[10px] font-semibold text-bega-text-3 uppercase tracking-widest">{label}</span>
      </td>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-3 py-1.5 border-l border-bega-border-1" />
      ))}
    </tr>
  );
}

function SpecRow({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr className="border-b border-bega-border-1 hover:bg-bega-bg-1 transition-colors">
      <td className="sticky left-0 z-10 bg-white px-4 py-2 text-bega-text-3 text-xs whitespace-nowrap">
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2 text-xs border-l border-bega-border-1 min-w-[190px]">
          {v}
        </td>
      ))}
    </tr>
  );
}

// ── main component ────────────────────────────────────────────────────────────
// Inline, in-conversation replacement for the old bottom-sheet CompareDrawer.
// Reads live from ShortlistContext so quantity edits / removals are reflected
// immediately wherever this card is rendered in the message history.

export default function ComparisonCard() {
  const { entries, unpin, setQuantity } = useShortlist();

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-bega-border-1 bg-white px-4 py-4 text-sm text-bega-text-3">
        Your shortlist is empty.
      </div>
    );
  }

  const colCount = entries.length;

  return (
    <div className="rounded-lg border border-bega-border-1 bg-white overflow-hidden shadow-card">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-bega-border-1 bg-bega-bg-1">
        <h3 className="font-semibold text-bega-text-1 text-sm">
          Product Comparison
          <span className="ml-2 text-bega-text-3 font-normal text-xs">
            {colCount} item{colCount !== 1 ? 's' : ''}
          </span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: `${160 + colCount * 210}px` }}>
          <tbody>

            {/* ── Product images + identity ─────────────────────────────── */}
            <tr className="border-b border-bega-border-1 bg-white">
              <td className="sticky left-0 z-10 bg-white w-40 px-4 py-3" />
              {entries.map(e => {
                const m = merged(e);
                return (
                  <td key={e.catalogNumber} className="px-3 py-3 border-l border-bega-border-1 min-w-[210px] align-top">
                    <div className="w-full h-28 bg-bega-bg-1 rounded-lg overflow-hidden mb-3
                                    flex items-center justify-center relative border border-bega-border-1">
                      {m.familyListPageImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.familyListPageImage} alt="" className="h-full w-full object-contain p-2" />
                      ) : (
                        <span className="text-bega-text-3 text-xs">No image</span>
                      )}
                      {e.detailLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                          <span className="w-4 h-4 border-2 border-bega-border-2 border-t-bega-black rounded-full animate-spin" />
                        </div>
                      )}
                      <button
                        onClick={() => unpin(e.catalogNumber)}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white border border-bega-border-2
                                   text-bega-text-3 hover:text-red-600 hover:border-red-300
                                   flex items-center justify-center text-[10px] transition-colors shadow-button"
                        title="Remove from comparison"
                      >
                        ✕
                      </button>
                      <div className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-semibold border
                        ${e.kind === 'furniture'
                          ? 'bg-violet-50 text-violet-700 border-violet-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {e.kind === 'furniture' ? 'Furniture' : 'Lighting'}
                      </div>
                    </div>

                    <p className="font-mono font-bold text-bega-black text-base leading-tight">{e.catalogNumber}</p>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.familyName && (
                        <span className="text-[10px] bg-bega-bg-2 text-bega-text-2 border border-bega-border-1 rounded px-2 py-0.5">
                          {m.familyName}
                        </span>
                      )}
                      {m.subFamilyName && (
                        <span className="text-[10px] bg-bega-bg-1 text-bega-text-3 border border-bega-border-1 rounded px-2 py-0.5">
                          {m.subFamilyName}
                        </span>
                      )}
                    </div>

                    {'categoryName' in m && (m.categoryName || (m as ProductSearchResult).groupsName) && (
                      <p className="text-[10px] text-bega-text-3 mt-1">
                        {[(m as ProductSearchResult).categoryName, (m as ProductSearchResult).groupsName]
                          .filter(Boolean).join(' › ')}
                      </p>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* ── Quantity row ──────────────────────────────────────────── */}
            <tr data-tour="quantity-row" className="border-b border-bega-border-1 bg-bega-bg-1">
              <td className="sticky left-0 z-10 bg-bega-bg-1 px-4 py-2.5 text-bega-text-2 text-xs font-medium">
                Quantity
              </td>
              {entries.map(e => (
                <td key={e.catalogNumber} className="px-3 py-2.5 border-l border-bega-border-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(e.catalogNumber, e.quantity - 1)}
                      disabled={e.quantity <= 1}
                      className="w-6 h-6 rounded border border-bega-border-2 bg-white
                                 hover:bg-bega-bg-2 text-bega-text-1
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
                      className="w-12 bg-white border border-bega-border-2 rounded text-center
                                 text-bega-text-1 text-sm py-0.5
                                 focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20"
                    />
                    <button
                      onClick={() => setQuantity(e.catalogNumber, e.quantity + 1)}
                      disabled={e.quantity >= 999}
                      className="w-6 h-6 rounded border border-bega-border-2 bg-white
                                 hover:bg-bega-bg-2 text-bega-text-1
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
                        className="text-[10px] bg-bega-bg-1 text-bega-text-2 border border-bega-border-2
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
            <tr className="border-b border-bega-border-1">
              <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-bega-text-3 text-xs">Spec Sheet</td>
              {entries.map(e => {
                const m = merged(e);
                return (
                  <td key={e.catalogNumber} className="px-3 py-2.5 border-l border-bega-border-1">
                    {m.specDocumentUrl ? (
                      <a href={m.specDocumentUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-bega-black hover:underline font-medium">
                        View PDF ↗
                      </a>
                    ) : <CellValue value={null} />}
                  </td>
                );
              })}
            </tr>

          </tbody>
        </table>
      </div>

      <CompareTour />
    </div>
  );
}
