'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchProducts, type ProductData } from '@/services/insights/insightsV2Service';
import { useGSAPEntrance, useGSAPScrollReveal } from '@/hooks/useGSAPEntrance';

const CAT_COLORS = ['#1A1A1A', '#5A5750', '#9A9590', '#B5A99A', '#D5CFC9', '#E5E0DB'];

export default function ProductIntelligenceTab() {
  const [data, setData]       = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  const catRef    = useGSAPEntrance(0.07, [loading]);
  const demandRef = useGSAPScrollReveal();
  const compRef   = useGSAPScrollReveal();

  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetchProducts()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !data?.categories.length) return;
    import('gsap').then(({ gsap }) => {
      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const pct = el.dataset.pct ?? '0';
        gsap.fromTo(el,
          { width: '0%' },
          { width: `${pct}%`, duration: 0.65, delay: i * 0.07, ease: 'power2.out' }
        );
      });
    });
  }, [data, loading]);

  // top mentions value for relative bar widths
  const topMentions = data?.categories[0]?.mentions ?? 1;
  // top family mentions for bar widths
  const topFamilyMentions = data?.familyDemand[0]?.mentioned ?? 1;

  return (
    <div className="space-y-5">
      {/* Category breakdown */}
      <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Category Query Distribution</p>
        <p className="text-[11px] text-bega-text-3 mb-5">How users are searching across BEGA product categories</p>
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="h-2.5 bg-bega-bg-1 rounded w-28 mb-2" />
                <div className="h-8 bg-bega-bg-1 rounded-xl" style={{ width: `${90 - i * 14}%` }} />
              </div>
            ))}
          </div>
        ) : data?.categories.length ? (
          <div ref={catRef} className="space-y-3">
            {data.categories.map((cat, i) => {
              const widthPct = topMentions > 0 ? Math.round((cat.mentions / topMentions) * 100) : 0;
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium text-bega-text-1">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-bega-text-1">{cat.mentions.toLocaleString()}</span>
                      <span className="text-[10px] text-bega-text-3 w-10 text-right">{cat.share.toFixed(0)}%</span>
                      {cat.growth > 0 && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          +{cat.growth}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-8 bg-bega-bg-1 rounded-xl overflow-hidden">
                    <div
                      ref={el => { barRefs.current[i] = el; }}
                      data-pct={widthPct}
                      className="h-full rounded-xl flex items-center pl-3"
                      style={{ background: CAT_COLORS[i % CAT_COLORS.length], width: 0 }}
                    >
                      <span className="text-[10px] text-white/70 font-medium whitespace-nowrap overflow-hidden">
                        {cat.category}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-[13px] font-medium text-bega-text-2 mb-1">No category data yet</p>
            <p className="text-[12px] text-bega-text-3">Category trends will appear as users query the AI advisor.</p>
          </div>
        )}
      </div>

      {/* Comparisons + Family demand */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Comparison queries */}
        <div ref={compRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Comparison Queries</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Users comparing products or alternatives</p>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-bega-bg-1 rounded-xl" />
              ))}
            </div>
          ) : data?.comparisons.length ? (
            <div className="space-y-2">
              {data.comparisons.map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-bega-bg-1/50 rounded-xl">
                  <span className="text-[10px] font-bold text-bega-text-3 bg-white border border-bega-border-1 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-bega-text-1 leading-snug">{q.pattern}</p>
                    <p className="text-[10px] text-bega-text-3 mt-0.5">{q.count} occurrence{q.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-bega-text-3 py-6 text-center">
              No comparison queries detected yet. These appear when users ask to compare products.
            </p>
          )}
        </div>

        {/* Family demand */}
        <div ref={demandRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Top Product Families</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Most mentioned product families in AI queries</p>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 bg-bega-bg-1 rounded flex-1" />
                  <div className="h-3 bg-bega-bg-1 rounded w-12" />
                </div>
              ))}
            </div>
          ) : data?.familyDemand.length ? (
            <div className="space-y-2.5">
              {data.familyDemand.map((fam, i) => {
                const barPct = topFamilyMentions > 0 ? Math.round((fam.mentioned / topFamilyMentions) * 100) : 0;
                return (
                  <div key={fam.family} className="flex items-center gap-3">
                    <span className="text-[10px] text-bega-text-3 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 h-1 bg-bega-bg-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-bega-black rounded-full"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-medium text-bega-text-1 truncate max-w-[120px]">{fam.family}</span>
                    <span className="text-[10px] text-bega-text-3 flex-shrink-0">{fam.mentioned}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-bega-text-3 py-6 text-center">
              Family demand data will appear once products are queried.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
