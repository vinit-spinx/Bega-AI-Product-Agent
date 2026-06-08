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
    <div className="rounded-lg border border-bega-border-1 bg-white overflow-hidden animate-fade-in
                    flex flex-col shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex gap-0">
        {/* Product image */}
        {item.familyListPageImage && !imgError ? (
          <div className="w-24 flex-shrink-0 bg-bega-bg-1 flex items-center justify-center overflow-hidden
                          border-r border-bega-border-1">
            <img
              src={item.familyListPageImage}
              alt={item.familyName ?? item.catalogNumber}
              className="w-full h-full object-contain max-h-28"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-24 flex-shrink-0 bg-bega-bg-1 flex items-center justify-center
                          min-h-[7rem] border-r border-bega-border-1">
            <svg className="w-8 h-8 text-bega-border-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}

        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono font-bold text-bega-black text-base leading-tight block">
              {item.catalogNumber}
            </span>
            {/* Pin to shortlist */}
            <button
              onClick={handlePin}
              title={pinned ? 'Remove from shortlist' : 'Add to shortlist'}
              className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-all duration-150 border
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
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {item.familyName && (
              <span className="inline-block rounded bg-bega-bg-2 text-bega-text-2 text-[11px] px-2 py-0.5 border border-bega-border-1">
                {item.familyName}
              </span>
            )}
            {item.subFamilyName && (
              <span className="inline-block rounded bg-bega-bg-1 text-bega-text-3 text-[11px] px-2 py-0.5 border border-bega-border-1">
                {item.subFamilyName}
              </span>
            )}
            {item.groupsName && (
              <span className="inline-block rounded bg-violet-50 text-violet-700 border border-violet-200 text-[11px] px-2 py-0.5">
                {item.groupsName}
              </span>
            )}
          </div>
          {item.categoryName && (
            <p className="text-[11px] text-bega-text-3 mt-1 tracking-wide">{item.categoryName}</p>
          )}
        </div>
      </div>

      <div className="px-3 pb-3 border-t border-bega-border-1">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 text-xs">
          {item.application && (
            <>
              <span className="text-bega-text-3">Application</span>
              <span className="text-bega-text-1 truncate">{item.application}</span>
            </>
          )}
          {item.finish && (
            <>
              <span className="text-bega-text-3">Finish</span>
              <span className="text-bega-text-1 truncate">{item.finish}</span>
            </>
          )}
          {item.leadTime && (
            <>
              <span className="text-bega-text-3">Lead time</span>
              <span className="text-bega-text-1">{item.leadTime}</span>
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
              className="text-[11px] rounded border border-bega-black/50 text-bega-black
                         hover:bg-bega-black/5 px-3 py-1.5 transition-colors font-medium"
            >
              View Spec Sheet
            </a>
          )}
          {item.technicalDocumentUrl && (
            <a
              href={item.technicalDocumentUrl}
              download
              className="text-[11px] rounded border border-bega-border-2 text-bega-text-2
                         hover:text-bega-text-1 hover:border-bega-border-3 px-3 py-1.5 transition-colors"
            >
              Technical Package
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
