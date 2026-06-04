'use client';

import type { FurnitureSearchResult, PlacementMapItem, ProductSearchResult } from '@/types';
import { useState } from 'react';

interface VisionPlacementMapProps {
  imageUrl: string;
  markers: PlacementMapItem[];
  products: ProductSearchResult[];
  furnitureItems?: FurnitureSearchResult[];
}

type FoundItem =
  | { kind: 'product';   item: ProductSearchResult }
  | { kind: 'furniture'; item: FurnitureSearchResult }
  | null;

export default function VisionPlacementMap({
  imageUrl,
  markers,
  products,
  furnitureItems = [],
}: VisionPlacementMapProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const getItem = (catalogNumber: string): FoundItem => {
    if (!catalogNumber) return null;
    const product = products.find(p => p.catalogNumber === catalogNumber);
    if (product) return { kind: 'product', item: product };
    const furniture = furnitureItems.find(f => f.catalogNumber === catalogNumber);
    if (furniture) return { kind: 'furniture', item: furniture };
    return null;
  };

  const toggleMarker = (id: number) =>
    setActiveId(prev => (prev === id ? null : id));

  // Amber = lighting, emerald = furniture
  const markerColors = (kind: 'product' | 'furniture' | null, isActive: boolean) =>
    kind === 'furniture'
      ? isActive
        ? 'bg-emerald-400 border-emerald-200 text-zinc-900 scale-125 shadow-emerald-400/50'
        : 'bg-emerald-500/95 border-emerald-300/80 text-zinc-900 hover:scale-110 hover:bg-emerald-400'
      : isActive
        ? 'bg-amber-400 border-amber-200 text-zinc-900 scale-125 shadow-amber-400/50'
        : 'bg-amber-500/95 border-amber-300/80 text-zinc-900 hover:scale-110 hover:bg-amber-400';

  const pingColor = (kind: 'product' | 'furniture' | null) =>
    kind === 'furniture' ? 'bg-emerald-400/40' : 'bg-amber-400/40';

  const accentBorder = (kind: 'product' | 'furniture' | null) =>
    kind === 'furniture' ? 'border-emerald-400/50' : 'border-amber-400/50';

  const accentLine = (kind: 'product' | 'furniture' | null) =>
    kind === 'furniture'
      ? 'bg-gradient-to-r from-emerald-500 to-transparent'
      : 'bg-gradient-to-r from-amber-500 to-transparent';

  const legendActive = (kind: 'product' | 'furniture' | null) =>
    kind === 'furniture'
      ? 'bg-emerald-500/15 border-emerald-400/50 shadow-sm shadow-emerald-400/10'
      : 'bg-amber-500/15 border-amber-400/50 shadow-sm shadow-amber-400/10';

  const dotActive = (kind: 'product' | 'furniture' | null, isActive: boolean) =>
    kind === 'furniture'
      ? isActive ? 'bg-emerald-400 text-zinc-900' : 'bg-emerald-500/80 text-zinc-900'
      : isActive ? 'bg-amber-400 text-zinc-900' : 'bg-amber-500/80 text-zinc-900';

  const hasFurniture = markers.some(m => getItem(m.catalogNumber)?.kind === 'furniture');
  const hasLighting  = markers.some(m => getItem(m.catalogNumber)?.kind === 'product');

  return (
    <div className="space-y-3">

      {/* ── Annotated image ─────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-xl overflow-hidden border border-zinc-700 select-none">

        {/* Base image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Analysed scene"
          className="block w-full h-auto"
          draggable={false}
        />

        {/* Bottom gradient for readability */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-950/70 to-transparent pointer-events-none" />

        {/* Badge: Visual Placement Analysis */}
        <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-sm text-zinc-200
                        text-[11px] font-medium px-3 py-1.5 rounded-full border border-zinc-600/60
                        flex items-center gap-1.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
          Visual Placement Analysis
        </div>

        {/* Legend: lighting / furniture type indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
          {hasLighting && (
            <div className="bg-zinc-900/80 backdrop-blur-sm text-[10px] px-2 py-1 rounded-full
                            border border-amber-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-zinc-300">Lighting</span>
            </div>
          )}
          {hasFurniture && (
            <div className="bg-zinc-900/80 backdrop-blur-sm text-[10px] px-2 py-1 rounded-full
                            border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-zinc-300">Furniture</span>
            </div>
          )}
          <div className="bg-zinc-900/80 backdrop-blur-sm text-zinc-400
                          text-[10px] px-2 py-1 rounded-full border border-zinc-700/60">
            {markers.length} placement{markers.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Placement markers ──────────────────────────────────────────────── */}
        {markers.map(marker => {
          const found = getItem(marker.catalogNumber);
          const kind  = found?.kind ?? null;
          const isActive = activeId === marker.id;
          const popoverBelow = marker.y < 30;

          return (
            <div
              key={marker.id}
              className="absolute z-10"
              style={{
                left: `${Math.min(Math.max(marker.x, 5), 95)}%`,
                top:  `${Math.min(Math.max(marker.y, 5), 95)}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => toggleMarker(marker.id)}
              onMouseEnter={() => setActiveId(marker.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              {/* Animated ping ring */}
              <span
                className={`absolute rounded-full ${pingColor(kind)} animate-ping pointer-events-none`}
                style={{ inset: '-6px' }}
              />

              {/* Number badge */}
              <button
                className={`relative z-10 w-8 h-8 rounded-full border-2 font-bold text-xs
                  flex items-center justify-center shadow-xl cursor-pointer
                  transition-all duration-200 ease-out
                  ${markerColors(kind, isActive)}`}
                aria-label={`Placement ${marker.id}: ${marker.label} at ${marker.zone}`}
              >
                {marker.id}
              </button>

              {/* Connector line */}
              {isActive && (
                <div
                  className="absolute left-1/2 -translate-x-px w-0.5 bg-zinc-400/50 pointer-events-none"
                  style={{
                    [popoverBelow ? 'top' : 'bottom']: '100%',
                    height: '10px',
                  }}
                />
              )}

              {/* ── Popover card ──────────────────────────────────────────── */}
              {isActive && (
                <div
                  className={`absolute ${popoverBelow ? 'top-full mt-3' : 'bottom-full mb-3'}
                    left-1/2 pointer-events-none z-20
                    ${marker.x > 65 ? '-translate-x-[85%]' : marker.x < 35 ? '-translate-x-[15%]' : '-translate-x-1/2'}`}
                >
                  <div className={`bg-zinc-900/96 backdrop-blur-md border ${accentBorder(kind)}
                                    rounded-2xl shadow-2xl shadow-zinc-950/80 w-52 overflow-hidden`}>

                    {/* Image */}
                    {found?.item.familyListPageImage ? (
                      <div className="w-full h-28 bg-zinc-800 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={found.item.familyListPageImage}
                          alt={found.item.familyName ?? ''}
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-16 bg-zinc-800 flex items-center justify-center">
                        <div className="text-center">
                          <div className={`text-2xl mb-1 ${kind === 'furniture' ? 'text-emerald-500/60' : 'text-amber-500/60'}`}>
                            {kind === 'furniture' ? '⬡' : '◉'}
                          </div>
                          <span className="text-zinc-500 text-[10px]">{marker.label}</span>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-3 space-y-1.5">
                      {/* Type badge + number */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Catalog number or label */}
                          {marker.catalogNumber ? (
                            <p className={`font-bold text-sm leading-tight
                              ${kind === 'furniture' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              #{marker.catalogNumber}
                            </p>
                          ) : (
                            <p className={`font-bold text-sm leading-tight
                              ${kind === 'furniture' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {marker.label}
                            </p>
                          )}
                          <p className="text-zinc-200 text-xs leading-tight mt-0.5 truncate">
                            {found?.item.familyName ?? (marker.catalogNumber ? marker.label : marker.zone)}
                          </p>
                          {found?.item.subFamilyName && (
                            <p className="text-zinc-500 text-[10px] leading-tight truncate">
                              {found.item.subFamilyName}
                            </p>
                          )}
                        </div>
                        <span className={`w-6 h-6 rounded-full text-zinc-900 flex-shrink-0
                                          text-[10px] font-bold flex items-center justify-center
                                          ${kind === 'furniture' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          {marker.id}
                        </span>
                      </div>

                      {/* Zone */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                          ${kind === 'furniture' ? 'bg-emerald-400/70' : 'bg-amber-400/70'}`} />
                        <p className="text-zinc-400 text-[10px] leading-tight">{marker.zone}</p>
                      </div>

                      {/* Specs — lighting */}
                      {found?.kind === 'product' && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 border-t border-zinc-700/60 mt-1">
                          {found.item.ledWattage && (
                            <span className="text-[10px] text-zinc-400">{found.item.ledWattage}</span>
                          )}
                          {found.item.lumenOutputLm != null && (
                            <span className="text-[10px] text-zinc-400">{found.item.lumenOutputLm} lm</span>
                          )}
                          {found.item.controlProtocol && (
                            <span className="text-[10px] text-zinc-500">{found.item.controlProtocol}</span>
                          )}
                          {found.item.dnpPrice != null && found.item.dnpPrice > 0 && (
                            <span className="text-[10px] text-zinc-400 ml-auto font-medium">
                              ${found.item.dnpPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Specs — furniture */}
                      {found?.kind === 'furniture' && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 border-t border-zinc-700/60 mt-1">
                          {found.item.groupsName && (
                            <span className="text-[10px] text-zinc-400">{found.item.groupsName}</span>
                          )}
                          {found.item.finish && (
                            <span className="text-[10px] text-zinc-500">{found.item.finish}</span>
                          )}
                          {found.item.leadTime && (
                            <span className="text-[10px] text-zinc-500 ml-auto">{found.item.leadTime}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Accent line */}
                    <div className={`h-0.5 ${accentLine(kind)}`} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Placement legend grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {markers.map(marker => {
          const found = getItem(marker.catalogNumber);
          const kind  = found?.kind ?? null;
          const isActive = activeId === marker.id;

          return (
            <button
              key={marker.id}
              onClick={() => toggleMarker(marker.id)}
              onMouseEnter={() => setActiveId(marker.id)}
              onMouseLeave={() => setActiveId(null)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left
                transition-all duration-150 border
                ${isActive
                  ? `${legendActive(kind)} scale-[1.02]`
                  : 'bg-zinc-800/70 border-zinc-700/80 hover:border-zinc-600 hover:bg-zinc-800'
                }`}
            >
              <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center
                font-bold text-[10px] transition-colors ${dotActive(kind, isActive)}`}>
                {marker.id}
              </span>

              <div className="min-w-0 flex-1 overflow-hidden">
                <p className={`text-[10px] font-semibold truncate leading-tight
                  ${kind === 'furniture' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {marker.catalogNumber ? `#${marker.catalogNumber}` : marker.label}
                </p>
                <p className="text-zinc-400 text-[9px] truncate leading-tight mt-0.5">
                  {marker.zone}
                </p>
              </div>

              {/* Thumbnail */}
              {found?.item.familyListPageImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={found.item.familyListPageImage}
                  alt=""
                  className="w-8 h-8 object-contain rounded-lg bg-zinc-700/80 flex-shrink-0 p-0.5"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile hint */}
      <p className="text-zinc-600 text-[10px] text-center">
        Tap a marker to see product details
      </p>
    </div>
  );
}
