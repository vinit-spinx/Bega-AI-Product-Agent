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

// Inline BEGA B mark used as the AI avatar
function BegaAvatar() {
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-sm bg-bega-black flex items-center justify-center mt-0.5 shadow-button">
      <svg width="9" height="12" viewBox="0 0 20 27" fill="white" fillRule="evenodd">
        <path d="M5.007,5.386 L5.007,11.272 C5.085,11.278 5.147,11.289 5.21,11.289 C6.935,11.289 8.661,11.304 10.387,11.284 C11.325,11.273 12.221,11.047 13.027,10.538 C13.776,10.064 14.208,9.391 14.226,8.477 C14.244,7.507 13.979,6.661 13.169,6.064 C12.45,5.534 11.617,5.374 10.753,5.371 C8.935,5.364 7.117,5.38 5.299,5.386 C5.208,5.387 5.118,5.386 5.007,5.386 Z M5.005,22.619 C5.102,22.625 5.183,22.635 5.265,22.635 C7.028,22.635 8.791,22.651 10.554,22.626 C11.086,22.618 11.63,22.55 12.146,22.418 C13.243,22.137 14.134,21.561 14.57,20.432 C14.806,19.82 14.825,19.181 14.755,18.546 C14.624,17.356 14.049,16.448 12.978,15.899 C12.246,15.524 11.462,15.37 10.643,15.372 C8.862,15.375 7.08,15.374 5.298,15.375 C5.201,15.375 5.103,15.375 5.005,15.375 Z M0,1.056 C0.092,1.049 0.184,1.035 0.276,1.035 C4.388,1.034 8.501,1.015 12.613,1.044 C14.357,1.056 15.953,1.588 17.286,2.773 C18.29,3.666 18.827,4.821 18.993,6.151 C19.126,7.21 19.141,8.272 18.798,9.298 C18.31,10.762 17.29,11.79 16.047,12.621 C15.946,12.688 15.843,12.751 15.742,12.816 C15.735,12.821 15.732,12.831 15.712,12.861 C15.795,12.907 15.877,12.953 15.961,12.997 C17.725,13.921 19.057,15.24 19.691,17.19 C20.037,18.254 20.048,19.351 19.929,20.449 C19.807,21.567 19.511,22.635 18.921,23.602 C17.958,25.18 16.521,26.093 14.798,26.598 C13.895,26.862 12.969,26.982 12.029,26.982 C8.084,26.983 4.138,26.982 0.193,26.983 Z"/>
      </svg>
    </div>
  );
}

// Section header with a subtle rule
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] text-bega-text-3 font-semibold uppercase tracking-[0.14em] whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-bega-border-1" />
    </div>
  );
}

export default function MessageBubble({ message, sessionId, onSuggestedAction }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end px-5 py-1.5 animate-slide-in-right">
        <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-white border border-bega-border-1
                        shadow-card px-4 py-3">
          {message.imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.imagePreview}
              alt="Attached image"
              className="mb-2 max-h-48 rounded-xl object-cover border border-bega-border-2"
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
    <div className="flex justify-start px-4 py-2 animate-slide-in-left">
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

        {/* ── Rich data panels ── */}
        {hasRichData && (
          <div className="ml-10 space-y-6 mb-4">
            {message.products && message.products.length > 0 && (
              <section>
                <SectionLabel>Luminaires ({message.products.length})</SectionLabel>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {message.products.map((p, i) => (
                    <ProductCard key={`${p.productId}-${p.catalogNumber}-${i}`} product={p} sessionId={sessionId} />
                  ))}
                </div>
              </section>
            )}

            {message.furnitureItems && message.furnitureItems.length > 0 && (
              <section>
                <SectionLabel>Furniture &amp; Urban Elements ({message.furnitureItems.length})</SectionLabel>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {message.furnitureItems.map((item, i) => (
                    <FurnitureCard key={`${item.productId}-${item.catalogNumber}-${i}`} item={item} sessionId={sessionId} />
                  ))}
                </div>
              </section>
            )}

            {message.projectAreas && message.projectAreas.length > 0 && (
              <section>
                <SectionLabel>Project Recommendations</SectionLabel>
                <div className="space-y-3">
                  {message.projectAreas.map(area => (
                    <ProjectAreaCard key={area.areaName} area={area} />
                  ))}
                </div>
              </section>
            )}

            {message.bomReport && (
              <BomTable report={message.bomReport} />
            )}
          </div>
        )}

        {/* ── BEGA avatar + text bubble ── */}
        <div className="flex gap-3 items-start">
          <BegaAvatar />
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl rounded-tl-sm border border-bega-border-1
                            px-4 py-3 block max-w-full shadow-card">
              {message.error ? (
                <div className="flex items-start gap-2.5">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}
                       strokeLinecap="round" className="w-4 h-4 text-bega-text-3 flex-shrink-0 mt-0.5">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 5v3.5M8 10.5h.01" />
                  </svg>
                  <div>
                    <p className="text-[13px] text-bega-text-1 font-medium leading-snug">
                      Something went wrong
                    </p>
                    <p className="text-[12px] text-bega-text-3 mt-0.5">
                      We couldn&apos;t process your request. Please try again or connect with the BEGA team directly.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm min-w-0">
                  <StreamingText content={message.content} isStreaming={message.isStreaming} />
                </div>
              )}

              {!message.isStreaming && message.suggestedActions && message.suggestedActions.length > 0 && (
                <div className="border-t border-bega-border-1 mt-3 pt-3">
                  <SuggestedActions actions={message.suggestedActions} onSelect={() => {}} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Next steps panel — shown after rich data or on error ── */}
        {!message.isStreaming && (hasRichData || !!message.error) && (
          <NextStepsPanel sessionId={sessionId} />
        )}

      </div>
    </div>
  );
}
