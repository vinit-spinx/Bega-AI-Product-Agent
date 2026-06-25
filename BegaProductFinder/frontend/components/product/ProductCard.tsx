'use client';

import { useEffect, useState } from 'react';
import type { ColorTemperatureOption, ProductProject, ProductSearchResult } from '@/types';
import { useShortlist } from '@/context/ShortlistContext';
import { trackEvent } from '@/services/insights/analyticsTracker';
import DimensionTable from './DimensionTable';

interface ProductCardProps {
  product: ProductSearchResult;
  sessionId?: string;
}

function parseCct(json?: string | null): ColorTemperatureOption[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as ColorTemperatureOption[];
  } catch {
    return [];
  }
}

export default function ProductCard({ product, sessionId }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const { pin, unpin, isPinned } = useShortlist();
  const pinned = isPinned(product.catalogNumber);

  // Fires once per mount (i.e. once per unique catalog number shown) — a passive
  // "this product was shown to the user" signal for the conversion funnel.
  useEffect(() => {
    trackEvent('product_viewed', product.catalogNumber, sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePin = () => {
    if (pinned) unpin(product.catalogNumber);
    else pin(product, 'product');
  };
  const cctOptions = parseCct(product.colorTemperatureJson);

  return (
    <div className="group rounded-xl border border-bega-border-1 bg-white overflow-hidden animate-fade-in
                    flex flex-col shadow-card hover:shadow-card-hover hover:border-bega-border-2
                    transition-all duration-200 hover:-translate-y-0.5">
      {/* ── Image + header ─────────────────────────────────────────────────── */}
      <div className="flex gap-0">
        {/* Product image — taller well */}
        {product.familyListPageImage && !imgError ? (
          <div className="w-28 flex-shrink-0 bg-bega-bg-1 flex items-center justify-center
                          overflow-hidden border-r border-bega-border-1 min-h-[8.5rem]">
            <img
              src={product.familyListPageImage}
              alt={product.familyName ?? product.catalogNumber}
              className="w-full h-full object-contain max-h-[8.5rem] p-2
                         transition-transform duration-500 group-hover:scale-[1.06]"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-28 flex-shrink-0 bg-bega-bg-1 flex items-center justify-center
                          min-h-[8.5rem] border-r border-bega-border-1">
            <svg className="w-7 h-7 text-bega-border-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        )}

        {/* Header info */}
        <div className="flex-1 p-3.5 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Catalog number — strong typographic anchor */}
              <span className="font-mono font-semibold text-bega-black text-[17px] leading-none tracking-tight block mb-1.5">
                {product.catalogNumber}
              </span>
              <div className="flex flex-wrap gap-1">
                {product.familyName && (
                  <span className="inline-block rounded-sm bg-bega-bg-2 text-bega-text-2 text-[10px] px-2 py-0.5 border border-bega-border-1 font-medium">
                    {product.familyName}
                  </span>
                )}
                {product.subFamilyName && (
                  <span className="inline-block rounded-sm bg-bega-bg-1 text-bega-text-3 text-[10px] px-2 py-0.5 border border-bega-border-1">
                    {product.subFamilyName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <button
                data-tour="pin-button"
                onClick={handlePin}
                title={pinned ? 'Remove from shortlist' : 'Add to shortlist'}
                className={`w-7 h-7 rounded-sm flex items-center justify-center transition-all duration-150 border
                  ${pinned
                    ? 'bg-bega-black border-bega-black text-white shadow-button'
                    : 'bg-white border-bega-border-2 text-bega-text-3 hover:border-bega-black/60 hover:text-bega-black'
                  }`}
              >
                <svg className="w-3.5 h-3.5" fill={pinned ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              {product.isAdaCompliant && (
                <span className="text-[10px] rounded-sm bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 whitespace-nowrap font-medium">
                  ADA
                </span>
              )}
              {product.isExpressDelivery && (
                <span className="text-[10px] rounded-sm bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 whitespace-nowrap font-medium">
                  Express
                </span>
              )}
            </div>
          </div>

          {(product.categoryName || product.groupsName) && (
            <p className="text-[10px] text-bega-text-3 mt-2 tracking-widest uppercase font-medium">
              {[product.categoryName, product.groupsName].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* ── Specs ──────────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 border-t border-bega-border-1">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 text-xs">
          {product.ledWattage && (
            <SpecRow label="LED" value={product.ledWattage} />
          )}
          {product.lumenOutputLm != null && (
            <SpecRow label="Lumens" value={`${product.lumenOutputLm.toLocaleString()} lm`} />
          )}
          {product.beamAngleDeg != null && (
            <SpecRow label="Beam" value={`${product.beamAngleDeg}°`} />
          )}
          {product.voltage && (
            <SpecRow label="Voltage" value={product.voltage} />
          )}
          {product.controlProtocol && (
            <SpecRow label="Control" value={product.controlProtocol} />
          )}
          {product.application && (
            <SpecRow label="Application" value={product.application} />
          )}
          {product.leadTime && (
            <SpecRow label="Lead time" value={product.leadTime} />
          )}
          {product.dnpPrice != null && product.dnpPrice > 0 && (
            <SpecRow label="DNP" value={`$${product.dnpPrice.toFixed(2)}`} />
          )}
        </div>

        {/* CCT options */}
        {cctOptions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[11px] text-bega-text-3 self-center">CCT:</span>
            {cctOptions.map(opt => (
              <span
                key={opt.code}
                className="text-[11px] bg-bega-bg-1 text-bega-text-2 border border-bega-border-2 rounded px-1.5 py-0.5 font-mono"
              >
                {opt.kelvin}K
              </span>
            ))}
          </div>
        )}

        {/* Dimensions */}
        <DimensionTable
          a={product.dimensionA} aFraction={product.dimensionAFraction}
          b={product.dimensionB} bFraction={product.dimensionBFraction}
          c={product.dimensionC} cFraction={product.dimensionCFraction}
        />

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {product.specDocumentUrl && (
            <a
              href={product.specDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] rounded border border-bega-black/50 text-bega-black
                         hover:bg-bega-black/5 px-3 py-1.5 transition-colors font-medium"
            >
              View Spec Sheet
            </a>
          )}
          {product.technicalDocumentUrl && (
            <a
              href={product.technicalDocumentUrl}
              download
              className="text-[11px] rounded border border-bega-border-2 text-bega-text-2
                         hover:text-bega-text-1 hover:border-bega-border-3 px-3 py-1.5 transition-colors"
            >
              Technical Package
            </a>
          )}
        </div>
      </div>

      {/* ── Project showcase — only when product has associated projects ───── */}
      {product.projects && product.projects.length > 0 && (
        <div data-tour="product-projects" className="px-3 pb-3 border-t border-bega-border-1">
          <p className="text-[10px] text-bega-text-3 mt-2.5 mb-2 font-semibold uppercase tracking-[0.14em]">
            Seen in {product.projects.length === 1 ? '1 Project' : `${product.projects.length} Projects`}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {product.projects.map((project, i) => (
              <ProjectThumbnail key={i} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-bega-text-3">{label}</span>
      <span className="text-bega-text-1 truncate">{value}</span>
    </>
  );
}

function ProjectThumbnail({ project }: { project: ProductProject }) {
  const card = (
    <div className="flex-shrink-0 w-[4.5rem] rounded-lg overflow-hidden border border-bega-border-1
                    bg-bega-bg-1 hover:border-bega-black/40 transition-colors">
      {project.listingImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.listingImage}
          alt={project.name ?? ''}
          className="w-full h-11 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-11 bg-bega-bg-2 flex items-center justify-center">
          <svg className="w-5 h-5 text-bega-border-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0H9" />
          </svg>
        </div>
      )}
      <div className="px-1.5 py-1">
        <p className="text-[9px] text-bega-text-1 font-medium leading-tight truncate">
          {project.name ?? 'Project'}
        </p>
        {project.location && (
          <p className="text-[9px] text-bega-text-3 leading-tight truncate">{project.location}</p>
        )}
      </div>
    </div>
  );

  if (project.slug) {
    return (
      <a href={project.slug} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }
  return card;
}
