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
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-amber-600/25 border border-amber-500/30 px-4 py-2.5">
          {/* Image thumbnail — shown when the user attached a photo */}
          {message.imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.imagePreview}
              alt="Attached image"
              className="mb-2 max-h-48 rounded-xl object-cover border border-amber-500/30"
            />
          )}
          <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
                <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
                  Visual Analysis
                </p>
                <div className="relative inline-block rounded-xl overflow-hidden border border-zinc-700 max-w-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.contextImagePreview}
                    alt="Analysed scene"
                    className="block max-h-52 w-full object-cover"
                  />
                  {message.products && message.products.length > 0 && message.products[0].familyListPageImage && (
                    <div className="absolute bottom-2 right-2 w-20 rounded-lg border-2 border-amber-400
                                    bg-zinc-900/90 shadow-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.products[0].familyListPageImage}
                        alt={`Recommended: ${message.products[0].catalogNumber}`}
                        className="w-full h-14 object-contain p-1"
                      />
                      <div className="bg-amber-400 text-zinc-900 text-[9px] font-bold text-center py-0.5 px-1 truncate">
                        #{message.products[0].catalogNumber}
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-zinc-900/75 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full">
                    Your image
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Rich data panels rendered FIRST so they appear above the text ── */}
        {hasRichData && (
          <div className="ml-10 space-y-4 mb-3">
            {/* Products */}
            {message.products && message.products.length > 0 && (
              <section>
                <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
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
                <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
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
                <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
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
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center mt-0.5">
            <span className="text-zinc-900 text-xs font-bold">B</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-zinc-800 rounded-2xl rounded-tl-sm border border-zinc-700 px-4 py-3 inline-block max-w-full">
              {message.error ? (
                <div className="text-red-400 text-sm">
                  <span className="font-medium">Error: </span>
                  {message.error}
                </div>
              ) : (
                <p className="text-zinc-100 text-sm">
                  <StreamingText content={message.content} isStreaming={message.isStreaming} />
                </p>
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
