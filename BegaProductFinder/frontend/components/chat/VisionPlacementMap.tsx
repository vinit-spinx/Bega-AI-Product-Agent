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
        ? 'bg-emerald-400 border-emerald-200 text-bega-black scale-125 shadow-emerald-400/50'
        : 'bg-emerald-500/95 border-emerald-300/80 text-bega-black hover:scale-110 hover:bg-emerald-400'
      : isActive
        ? 'bg-bega-black border-bega-black-light text-white scale-125'
        : 'bg-bega-black/90 border-bega-black-light/80 text-white hover:scale-110 hover:bg-bega-black';

  const pingColor = (kind: 'product' | 'furniture' | null) =>
    kind === 'furniture' ? 'bg-emerald-400/40' : 'bg-bega-black/40';

  const accentBorder = (kind: 'product' | 'furniture' | null) =>
    kind === 'furniture' ? 'border-emerald-300/60' : 'border-bega-black/40';

  const accentLine = (kind: 'product' | 'furniture' | null) =>
    kind === 'furniture'
      ? 'bg-gradient-to-r from-emerald-500 to-transparent'
      : 'bg-gradient-to-r from-bega-black to-transparent';

  const legendActive = (kind: 'product' | 'furniture' | null) =>
    kind === 'furniture'
      ? 'bg-emerald-50 border-emerald-300 shadow-sm'
      : 'bg-amber-50 border-bega-black/50 shadow-sm';

  const dotActive = (kind: 'product' | 'furniture' | null, isActive: boolean) =>
    kind === 'furniture'
      ? isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-400/80 text-white'
      : isActive ? 'bg-bega-black text-white' : 'bg-bega-black/80 text-white';

  const hasFurniture = markers.some(m => getItem(m.catalogNumber)?.kind === 'furniture');
  const hasLighting  = markers.some(m => getItem(m.catalogNumber)?.kind === 'product');

  return (
    <div className="space-y-3">

      {/* ── Annotated image ─────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-lg overflow-hidden border border-bega-border-1 select-none shadow-card">

        {/* Base image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Analysed scene"
          className="block w-full h-auto"
          draggable={false}
        />

        {/* Bottom gradient for readability */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* Badge: Visual Placement Analysis */}
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white
                        text-[11px] font-medium px-3 py-1.5 rounded-full border border-white/20
                        flex items-center gap-1.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-bega-black inline-block animate-pulse" />
          Visual Placement Analysis
        </div>

        {/* Legend: lighting / furniture type indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
          {hasLighting && (
            <div className="bg-black/70 backdrop-blur-sm text-[10px] px-2 py-1 rounded-full
                            border border-bega-black/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-bega-black flex-shrink-0" />
              <span className="text-white">Lighting</span>
            </div>
          )}
          {hasFurniture && (
            <div className="bg-black/70 backdrop-blur-sm text-[10px] px-2 py-1 rounded-full
                            border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-white">Furniture</span>
            </div>
          )}
          <div className="bg-black/70 backdrop-blur-sm text-white/70
                          text-[10px] px-2 py-1 rounded-full border border-white/20">
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
                  className="absolute left-1/2 -translate-x-px w-0.5 bg-white/50 pointer-events-none"
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
                  <div className={`bg-white/97 backdrop-blur-md border ${accentBorder(kind)}
                                    rounded-xl shadow-card-hover w-52 overflow-hidden`}>

                    {/* Image */}
                    {found?.item.familyListPageImage ? (
                      <div className="w-full h-28 bg-bega-bg-1 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={found.item.familyListPageImage}
                          alt={found.item.familyName ?? ''}
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-16 bg-bega-bg-2 flex items-center justify-center">
                        <div className="text-center">
                          <div className={`text-2xl mb-1 ${kind === 'furniture' ? 'text-emerald-400' : 'text-bega-black'}`}>
                            {kind === 'furniture' ? '⬡' : '◉'}
                          </div>
                          <span className="text-bega-text-3 text-[10px]">{marker.label}</span>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-3 space-y-1.5">
                      {/* Type badge + number */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {marker.catalogNumber ? (
                            <p className={`font-bold text-sm leading-tight
                              ${kind === 'furniture' ? 'text-emerald-600' : 'text-bega-black'}`}>
                              #{marker.catalogNumber}
                            </p>
                          ) : (
                            <p className={`font-bold text-sm leading-tight
                              ${kind === 'furniture' ? 'text-emerald-600' : 'text-bega-black'}`}>
                              {marker.label}
                            </p>
                          )}
                          <p className="text-bega-text-1 text-xs leading-tight mt-0.5 truncate">
                            {found?.item.familyName ?? (marker.catalogNumber ? marker.label : marker.zone)}
                          </p>
                          {found?.item.subFamilyName && (
                            <p className="text-bega-text-3 text-[10px] leading-tight truncate">
                              {found.item.subFamilyName}
                            </p>
                          )}
                        </div>
                        <span className={`w-6 h-6 rounded-full text-white flex-shrink-0
                                          text-[10px] font-bold flex items-center justify-center
                                          ${kind === 'furniture' ? 'bg-emerald-500' : 'bg-bega-black'}`}>
                          {marker.id}
                        </span>
                      </div>

                      {/* Zone */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                          ${kind === 'furniture' ? 'bg-emerald-400' : 'bg-bega-black'}`} />
                        <p className="text-bega-text-3 text-[10px] leading-tight">{marker.zone}</p>
                      </div>

                      {/* Specs — lighting */}
                      {found?.kind === 'product' && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 border-t border-bega-border-1 mt-1">
                          {found.item.ledWattage && (
                            <span className="text-[10px] text-bega-text-2">{found.item.ledWattage}</span>
                          )}
                          {found.item.lumenOutputLm != null && (
                            <span className="text-[10px] text-bega-text-2">{found.item.lumenOutputLm} lm</span>
                          )}
                          {found.item.controlProtocol && (
                            <span className="text-[10px] text-bega-text-3">{found.item.controlProtocol}</span>
                          )}
                          {found.item.dnpPrice != null && found.item.dnpPrice > 0 && (
                            <span className="text-[10px] text-bega-text-2 ml-auto font-medium">
                              ${found.item.dnpPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Specs — furniture */}
                      {found?.kind === 'furniture' && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 border-t border-bega-border-1 mt-1">
                          {found.item.groupsName && (
                            <span className="text-[10px] text-bega-text-2">{found.item.groupsName}</span>
                          )}
                          {found.item.finish && (
                            <span className="text-[10px] text-bega-text-3">{found.item.finish}</span>
                          )}
                          {found.item.leadTime && (
                            <span className="text-[10px] text-bega-text-3 ml-auto">{found.item.leadTime}</span>
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
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left
                transition-all duration-150 border shadow-button
                ${isActive
                  ? `${legendActive(kind)} scale-[1.02]`
                  : 'bg-white border-bega-border-1 hover:border-bega-border-2 hover:bg-bega-bg-1'
                }`}
            >
              <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center
                font-bold text-[10px] transition-colors ${dotActive(kind, isActive)}`}>
                {marker.id}
              </span>

              <div className="min-w-0 flex-1 overflow-hidden">
                <p className={`text-[10px] font-semibold truncate leading-tight
                  ${kind === 'furniture' ? 'text-emerald-600' : 'text-bega-black'}`}>
                  {marker.catalogNumber ? `#${marker.catalogNumber}` : marker.label}
                </p>
                <p className="text-bega-text-3 text-[9px] truncate leading-tight mt-0.5">
                  {marker.zone}
                </p>
              </div>

              {/* Thumbnail */}
              {found?.item.familyListPageImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={found.item.familyListPageImage}
                  alt=""
                  className="w-8 h-8 object-contain rounded-md bg-bega-bg-1 flex-shrink-0 p-0.5 border border-bega-border-1"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile hint */}
      <p className="text-bega-text-3 text-[10px] text-center">
        Tap a marker to see product details
      </p>
    </div>
  );
}
