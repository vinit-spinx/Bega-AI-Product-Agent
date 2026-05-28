import type { ProjectAreaRecommendation } from '@/types';
import ProductCard from './ProductCard';

interface ProjectAreaCardProps {
  area: ProjectAreaRecommendation;
}

export default function ProjectAreaCard({ area }: ProjectAreaCardProps) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 overflow-hidden animate-fade-in">
      <div className="flex items-start justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/60">
        <div>
          <h4 className="font-semibold text-zinc-100 capitalize">{area.areaName}</h4>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{area.rationale}</p>
        </div>
        {area.estimatedTotalDnp > 0 && (
          <div className="text-right flex-shrink-0 ml-4">
            <p className="text-xs text-zinc-500">Est. DNP</p>
            <p className="font-mono font-semibold text-amber-400 text-sm">
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
