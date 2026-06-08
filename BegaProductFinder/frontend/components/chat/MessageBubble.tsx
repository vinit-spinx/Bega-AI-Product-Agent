'use client';

import type { UiMessage } from '@/types';
import BomTable from '../product/BomTable';
import FurnitureCard from '../product/FurnitureCard';
import ProductCard from '../product/ProductCard';
import ProjectAreaCard from '../product/ProjectAreaCard';
import SuggestedActions from '../product/SuggestedActions';
import NextStepsPanel from './NextStepsPanel';
import StreamingText from './StreamingText';
import VisionPlacementMap from './VisionPlacementMap';

interface MessageBubbleProps {
  message: UiMessage;
  sessionId: string;
  onSuggestedAction: (action: string) => void;
}

export default function MessageBubble({ message, sessionId, onSuggestedAction }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2 animate-fade-in">
        <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-bega-bg-2 border border-bega-border-1 px-4 py-3">
          {/* Image thumbnail — shown when the user attached a photo */}
          {message.imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.imagePreview}
              alt="Attached image"
              className="mb-2 max-h-48 rounded-lg object-cover border border-bega-border-2"
            />
          )}
          <p className="text-bega-text-1 text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const hasRichData =
    (message.products?.length ?? 0) > 0 ||
    (message.furnitureItems?.length ?? 0) > 0 ||
    (message.projectAreas?.length ?? 0) > 0 ||
    message.bomReport != null;

  return (
    <div className="flex justify-start px-4 py-2 animate-fade-in">
      <div className="max-w-full w-full">

        {/* ── Vision context panel ─────────────────────────────────────────── */}
        {message.contextImagePreview && (
          <div className="ml-10 mb-3">
            {/* Once placement markers arrive, swap the plain preview for the interactive map */}
            {message.placementMap && message.placementMap.length > 0 ? (
              <VisionPlacementMap
                imageUrl={message.contextImagePreview}
                markers={message.placementMap}
                products={message.products ?? []}
                furnitureItems={message.furnitureItems ?? []}
              />
            ) : (
              /* Simple preview shown while streaming (before markers arrive) */
              <div>
                <p className="text-[11px] text-bega-text-3 mb-2 font-semibold uppercase tracking-widest">
                  Visual Analysis
                </p>
                <div className="relative inline-block rounded-lg overflow-hidden border border-bega-border-1 max-w-xs shadow-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.contextImagePreview}
                    alt="Analysed scene"
                    className="block max-h-52 w-full object-cover"
                  />
                  {message.products && message.products.length > 0 && message.products[0].familyListPageImage && (
                    <div className="absolute bottom-2 right-2 w-20 rounded-lg border-2 border-bega-black
                                    bg-white/95 shadow-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.products[0].familyListPageImage}
                        alt={`Recommended: ${message.products[0].catalogNumber}`}
                        className="w-full h-14 object-contain p-1"
                      />
                      <div className="bg-bega-black text-white text-[9px] font-bold text-center py-0.5 px-1 truncate">
                        #{message.products[0].catalogNumber}
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-white/90 text-bega-text-2 text-[10px] px-2 py-0.5 rounded-full border border-bega-border-1">
                    Your image
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Rich data panels rendered FIRST so they appear above the text ── */}
        {hasRichData && (
          <div className="ml-10 space-y-5 mb-3">
            {/* Products */}
            {message.products && message.products.length > 0 && (
              <section>
                <p className="text-[11px] text-bega-text-3 mb-2.5 font-semibold uppercase tracking-widest">
                  Luminaires ({message.products.length})
                </p>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {message.products.map((p, i) => (
                    <ProductCard key={`${p.productId}-${p.catalogNumber}-${i}`} product={p} />
                  ))}
                </div>
              </section>
            )}

            {/* Furniture */}
            {message.furnitureItems && message.furnitureItems.length > 0 && (
              <section>
                <p className="text-[11px] text-bega-text-3 mb-2.5 font-semibold uppercase tracking-widest">
                  Furniture &amp; Urban Elements ({message.furnitureItems.length})
                </p>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {message.furnitureItems.map((item, i) => (
                    <FurnitureCard key={`${item.productId}-${item.catalogNumber}-${i}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Project recommendations */}
            {message.projectAreas && message.projectAreas.length > 0 && (
              <section>
                <p className="text-[11px] text-bega-text-3 mb-2.5 font-semibold uppercase tracking-widest">
                  Project Recommendations
                </p>
                <div className="space-y-3">
                  {message.projectAreas.map(area => (
                    <ProjectAreaCard key={area.areaName} area={area} />
                  ))}
                </div>
              </section>
            )}

            {/* BOM */}
            {message.bomReport && (
              <BomTable report={message.bomReport} />
            )}
          </div>
        )}

        {/* ── BEGA avatar + text bubble ── */}
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-7 h-7 rounded-sm bg-bega-black flex items-center justify-center mt-0.5">
            <span className="text-white text-xs font-bold tracking-tight">B</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl rounded-tl-sm border border-bega-border-1 px-4 py-3
                            inline-block max-w-full shadow-card">
              {message.error ? (
                <div className="text-red-600 text-sm">
                  <span className="font-medium">Error: </span>
                  {message.error}
                </div>
              ) : (
                <div className="text-sm min-w-0">
                  <StreamingText content={message.content} isStreaming={message.isStreaming} />
                </div>
              )}
            </div>

            {/* Suggested actions pinned directly below the text bubble */}
            {!message.isStreaming && message.suggestedActions && message.suggestedActions.length > 0 && (
              <div className="mt-2">
                <SuggestedActions actions={message.suggestedActions} onSelect={onSuggestedAction} />
              </div>
            )}
          </div>
        </div>

        {/* ── Next steps panel — shown once streaming ends and recommendations are present ── */}
        {!message.isStreaming && hasRichData && (
          <NextStepsPanel sessionId={sessionId} />
        )}

      </div>
    </div>
  );
}
