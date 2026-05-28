'use client';

import { useState } from 'react';
import type { ColorTemperatureOption, ProductSearchResult } from '@/types';
import DimensionTable from './DimensionTable';

interface ProductCardProps {
  product: ProductSearchResult;
}

function parseCct(json?: string | null): ColorTemperatureOption[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as ColorTemperatureOption[];
  } catch {
    return [];
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const cctOptions = parseCct(product.colorTemperatureJson);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/80 overflow-hidden animate-fade-in flex flex-col">
      {/* Image row */}
      <div className="flex gap-0">
        {product.familyListPageImage && !imgError ? (
          <div className="w-28 flex-shrink-0 bg-zinc-900 flex items-center justify-center overflow-hidden">
            <img
              src={product.familyListPageImage}
              alt={product.familyName ?? product.catalogNumber}
              className="w-full h-full object-contain max-h-32"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-28 flex-shrink-0 bg-zinc-900 flex items-center justify-center max-h-32 min-h-[7rem]">
            <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        )}

        {/* Header */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono font-bold text-amber-400 text-lg leading-tight block">
                {product.catalogNumber}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {product.familyName && (
                  <span className="inline-block rounded-full bg-zinc-700 text-zinc-200 text-xs px-2 py-0.5">
                    {product.familyName}
                  </span>
                )}
                {product.subFamilyName && (
                  <span className="inline-block rounded-full bg-zinc-700/60 text-zinc-400 text-xs px-2 py-0.5">
                    {product.subFamilyName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {product.isAdaCompliant && (
                <span className="text-xs rounded-full bg-emerald-900/50 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 whitespace-nowrap">
                  ADA
                </span>
              )}
              {product.isExpressDelivery && (
                <span className="text-xs rounded-full bg-blue-900/50 text-blue-400 border border-blue-700/50 px-2 py-0.5 whitespace-nowrap">
                  Express
                </span>
              )}
            </div>
          </div>

          {/* Breadcrumb */}
          {(product.categoryName || product.groupsName) && (
            <p className="text-xs text-zinc-500 mt-1">
              {[product.categoryName, product.groupsName].filter(Boolean).join(' › ')}
            </p>
          )}
        </div>
      </div>

      {/* Specs */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
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
            <span className="text-xs text-zinc-500 self-center">CCT:</span>
            {cctOptions.map(opt => (
              <span
                key={opt.code}
                className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 font-mono"
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
              className="text-xs rounded-lg border border-amber-500/50 text-amber-400 hover:bg-amber-500/10
                         px-3 py-1.5 transition-colors"
            >
              View Spec Sheet
            </a>
          )}
          {product.technicalDocumentUrl && (
            <a
              href={product.technicalDocumentUrl}
              download
              className="text-xs rounded-lg border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-400
                         px-3 py-1.5 transition-colors"
            >
              Technical Package
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 truncate">{value}</span>
    </>
  );
}
