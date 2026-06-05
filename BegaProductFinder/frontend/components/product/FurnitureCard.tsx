'use client';

import { useState } from 'react';
import type { FurnitureSearchResult } from '@/types';
import { useShortlist } from '@/context/ShortlistContext';
import DimensionTable from './DimensionTable';

interface FurnitureCardProps {
  item: FurnitureSearchResult;
}

export default function FurnitureCard({ item }: FurnitureCardProps) {
  const [imgError, setImgError] = useState(false);
  const { pin, unpin, isPinned } = useShortlist();
  const pinned = isPinned(item.catalogNumber);

  const handlePin = () => {
    if (pinned) unpin(item.catalogNumber);
    else pin(item, 'furniture');
  };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/80 overflow-hidden animate-fade-in flex flex-col">
      <div className="flex gap-0">
        {item.familyListPageImage && !imgError ? (
          <div className="w-28 flex-shrink-0 bg-zinc-900 flex items-center justify-center overflow-hidden">
            <img
              src={item.familyListPageImage}
              alt={item.familyName ?? item.catalogNumber}
              className="w-full h-full object-contain max-h-32"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-28 flex-shrink-0 bg-zinc-900 flex items-center justify-center min-h-[7rem]">
            <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}

        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono font-bold text-amber-400 text-lg leading-tight block">
              {item.catalogNumber}
            </span>
            {/* Pin to shortlist */}
            <button
              onClick={handlePin}
              title={pinned ? 'Remove from shortlist' : 'Add to shortlist'}
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150
                ${pinned
                  ? 'bg-amber-500 text-zinc-900 shadow-sm shadow-amber-500/40'
                  : 'bg-zinc-700 text-zinc-400 hover:bg-amber-500/20 hover:text-amber-400'
                }`}
            >
              <svg className="w-3.5 h-3.5" fill={pinned ? 'currentColor' : 'none'}
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {item.familyName && (
              <span className="inline-block rounded-full bg-zinc-700 text-zinc-200 text-xs px-2 py-0.5">
                {item.familyName}
              </span>
            )}
            {item.subFamilyName && (
              <span className="inline-block rounded-full bg-zinc-700/60 text-zinc-400 text-xs px-2 py-0.5">
                {item.subFamilyName}
              </span>
            )}
            {item.groupsName && (
              <span className="inline-block rounded-full bg-violet-900/50 text-violet-300 border border-violet-700/50 text-xs px-2 py-0.5">
                {item.groupsName}
              </span>
            )}
          </div>
          {item.categoryName && (
            <p className="text-xs text-zinc-500 mt-1">{item.categoryName}</p>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
          {item.application && (
            <>
              <span className="text-zinc-500">Application</span>
              <span className="text-zinc-200 truncate">{item.application}</span>
            </>
          )}
          {item.finish && (
            <>
              <span className="text-zinc-500">Finish</span>
              <span className="text-zinc-200 truncate">{item.finish}</span>
            </>
          )}
          {item.leadTime && (
            <>
              <span className="text-zinc-500">Lead time</span>
              <span className="text-zinc-200">{item.leadTime}</span>
            </>
          )}
        </div>

        <DimensionTable
          a={item.dimensionA} aFraction={item.dimensionAFraction}
          b={item.dimensionB} bFraction={item.dimensionBFraction}
          c={item.dimensionC} cFraction={item.dimensionCFraction}
          d={item.dimensionD} dFraction={item.dimensionDFraction}
          e={item.dimensionE} eFraction={item.dimensionEFraction}
        />

        <div className="flex flex-wrap gap-2 mt-3">
          {item.specDocumentUrl && (
            <a
              href={item.specDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs rounded-lg border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 px-3 py-1.5 transition-colors"
            >
              View Spec Sheet
            </a>
          )}
          {item.technicalDocumentUrl && (
            <a
              href={item.technicalDocumentUrl}
              download
              className="text-xs rounded-lg border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-400 px-3 py-1.5 transition-colors"
            >
              Technical Package
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
