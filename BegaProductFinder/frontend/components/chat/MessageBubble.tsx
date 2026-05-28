'use client';

import type { UiMessage } from '@/types';
import BomTable from '../product/BomTable';
import FurnitureCard from '../product/FurnitureCard';
import ProductCard from '../product/ProductCard';
import ProjectAreaCard from '../product/ProjectAreaCard';
import SuggestedActions from '../product/SuggestedActions';
import StreamingText from './StreamingText';

interface MessageBubbleProps {
  message: UiMessage;
  onSuggestedAction: (action: string) => void;
}

export default function MessageBubble({ message, onSuggestedAction }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2 animate-fade-in">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-amber-600/25 border border-amber-500/30 px-4 py-2.5">
          <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-4 py-2 animate-fade-in">
      <div className="max-w-full w-full">
        {/* BEGA avatar + text */}
        <div className="flex gap-3 items-start mb-2">
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
          </div>
        </div>

        {/* Rich data panels — rendered below the text bubble */}
        <div className="ml-10 space-y-3">
          {/* Products */}
          {message.products && message.products.length > 0 && (
            <section>
              <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
                Luminaires
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {message.products.map(p => (
                  <ProductCard key={`${p.catalogNumber}-${p.productId}`} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Furniture */}
          {message.furnitureItems && message.furnitureItems.length > 0 && (
            <section>
              <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
                Furniture &amp; Urban Elements
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {message.furnitureItems.map(item => (
                  <FurnitureCard key={`${item.catalogNumber}-${item.productId}`} item={item} />
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

          {/* Suggested actions */}
          {!message.isStreaming && message.suggestedActions && message.suggestedActions.length > 0 && (
            <SuggestedActions actions={message.suggestedActions} onSelect={onSuggestedAction} />
          )}
        </div>
      </div>
    </div>
  );
}
