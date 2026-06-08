import type { ProjectAreaRecommendation } from '@/types';
import ProductCard from './ProductCard';

interface ProjectAreaCardProps {
  area: ProjectAreaRecommendation;
}

export default function ProjectAreaCard({ area }: ProjectAreaCardProps) {
  return (
    <div className="rounded-lg border border-bega-border-1 bg-white overflow-hidden animate-fade-in shadow-card">
      <div className="flex items-start justify-between px-4 py-3 border-b border-bega-border-1 bg-bega-bg-1">
        <div>
          <h4 className="font-semibold text-bega-text-1 capitalize tracking-tight">{area.areaName}</h4>
          <p className="text-xs text-bega-text-2 mt-0.5 leading-relaxed">{area.rationale}</p>
        </div>
        {area.estimatedTotalDnp > 0 && (
          <div className="text-right flex-shrink-0 ml-4">
            <p className="text-[11px] text-bega-text-3">Est. DNP</p>
            <p className="font-mono font-semibold text-bega-black text-sm">
              ${area.estimatedTotalDnp.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {area.recommendedProducts.length > 0 && (
        <div className="p-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {area.recommendedProducts.map(p => (
            <ProductCard key={p.catalogNumber} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
