'use client';
import { useState, useEffect, useRef } from 'react';
import {
  fetchProducts, fetchSpecifications, fetchContentIntel, fetchGeography,
  type ProductData, type SpecData, type ContentData, type GeographyData,
} from '@/services/insights/insightsV2Service';
import AnimatedBanner from '../widgets/AnimatedBanner';
import SegmentedNav from '../SegmentedNav';
import WorldMap from '../widgets/WorldMap';
import { useGSAPEntrance, useGSAPScrollReveal } from '@/hooks/useGSAPEntrance';

const CAT_COLORS = ['#1A1A1A', '#575652', '#97968F', '#BBBBB6', '#D3D3CF', '#E6E6E3'];
const HIGH_FREQ_LIMIT = 5;

type Segment = 'category' | 'specification' | 'content' | 'geographic';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'category',      label: 'Category' },
  { id: 'specification', label: 'Specification' },
  { id: 'content',       label: 'Content' },
  { id: 'geographic',    label: 'Geographic' },
];

// ── Category panel — product demand ────────────────────────────────────────

function CategoryPanel() {
  const [data, setData]       = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const catRef    = useGSAPEntrance(0.07, [loading]);
  const demandRef = useGSAPScrollReveal();
  const compRef   = useGSAPScrollReveal();
  const barRefs   = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetchProducts().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !data?.categories.length) return;
    import('gsap').then(({ gsap }) => {
      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const pct = el.dataset.pct ?? '0';
        gsap.fromTo(el, { width: '0%' }, { width: `${pct}%`, duration: 0.65, delay: i * 0.07, ease: 'power2.out' });
      });
    });
  }, [data, loading]);

  const topMentions       = data?.categories[0]?.mentions ?? 1;
  const topFamilyMentions = data?.familyDemand[0]?.mentioned ?? 1;

  return (
    <div className="space-y-5">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div ref={compRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Comparison Queries</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Users comparing products or alternatives</p>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-bega-bg-1 rounded-xl" />)}
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
                      <div className="h-full bg-bega-black rounded-full" style={{ width: `${barPct}%` }} />
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

// ── Specification panel ─────────────────────────────────────────────────────

function SpecificationPanel() {
  const [data, setData]       = useState<SpecData | null>(null);
  const [loading, setLoading] = useState(true);
  const projectRef = useGSAPEntrance(0.07, [loading]);
  const trendsRef  = useGSAPScrollReveal();

  useEffect(() => {
    fetchSpecifications().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const topProjectCount = data?.projectTypes[0]?.count ?? 1;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Project Type Distribution</p>
        <p className="text-[11px] text-bega-text-3 mb-4">What project types are specifiers researching</p>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-bega-bg-1 rounded-xl" />)}
          </div>
        ) : data?.projectTypes.length ? (
          <div ref={projectRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.projectTypes.map(pt => {
              const widthPct = topProjectCount > 0 ? Math.round((pt.count / topProjectCount) * 100) : 0;
              return (
                <div key={pt.type} className="bg-bega-bg-1/50 rounded-xl p-3.5 border border-bega-border-1">
                  <p className="text-[12px] font-semibold text-bega-text-1 leading-snug mb-1.5">{pt.type}</p>
                  <p className="text-[18px] font-bold text-bega-text-1">{pt.count.toLocaleString()}</p>
                  <div className="h-1 bg-bega-bg-2 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-bega-black rounded-full" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-[13px] font-medium text-bega-text-2 mb-1">No project type data yet</p>
            <p className="text-[12px] text-bega-text-3">
              Project types are detected from queries mentioning hotels, villas, campuses, etc.
            </p>
          </div>
        )}
      </div>

      <div ref={trendsRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Emerging Specification Trends</p>
        <p className="text-[11px] text-bega-text-3 mb-4">Spec terms with growing frequency this period</p>
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="h-3 bg-bega-bg-1 rounded w-24" />
                <div className="h-3 bg-bega-bg-1 rounded w-12" />
              </div>
            ))}
          </div>
        ) : data?.emerging.length ? (
          <div className="space-y-2.5">
            {data.emerging.map((trend, i) => (
              <div key={trend.term} className="flex items-center gap-3">
                <span className="text-[10px] text-bega-text-3 w-4 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-[12px] font-medium text-bega-text-1 flex-1">{trend.term}</span>
                <span className="text-[11px] text-bega-text-2 flex-shrink-0">{trend.total}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-bega-text-3 py-6 text-center">
            Specification trends will surface as users ask about IP ratings, CCT, control protocols, etc.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Content panel ────────────────────────────────────────────────────────────

function ContentPanel() {
  const [data, setData]       = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const repeatedRef = useGSAPEntrance(0.06, [loading]);
  const gapsRef     = useGSAPScrollReveal();
  const clickRef    = useGSAPScrollReveal();

  useEffect(() => {
    fetchContentIntel().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const topClicks    = data?.topSuggestions[0]?.clicks ?? 1;
  const repeatedTop5 = data?.repeatedQueries.slice(0, HIGH_FREQ_LIMIT) ?? [];

  return (
    <div className="space-y-5">
      <div className="bg-white border border-bega-border-1 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bega-border-1 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-bega-text-1">High-Frequency Queries</p>
            <p className="text-[11px] text-bega-text-3 mt-0.5">Top {HIGH_FREQ_LIMIT} questions asked multiple times — prioritise content for these</p>
          </div>
          {data?.totalAnalysed ? (
            <span className="text-[10px] font-medium text-bega-text-3 bg-bega-bg-1 px-2.5 py-1 rounded-full">
              {data.totalAnalysed} total analysed
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="divide-y divide-bega-border-1">
            {Array.from({ length: HIGH_FREQ_LIMIT }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4 animate-pulse">
                <div className="h-3 bg-bega-bg-1 rounded flex-1" />
                <div className="h-5 bg-bega-bg-1 rounded-full w-8" />
              </div>
            ))}
          </div>
        ) : repeatedTop5.length ? (
          <div ref={repeatedRef} className="divide-y divide-bega-border-1">
            {repeatedTop5.map((q, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-bega-bg-1/50 transition-colors">
                <span className="text-[10px] text-bega-text-3 flex-shrink-0 w-4 text-right">{i + 1}</span>
                <p className="text-[12px] text-bega-text-1 flex-1 leading-relaxed">{q.query}</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  q.priority === 'high'   ? 'bg-rose-100 text-rose-700' :
                  q.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-bega-bg-1 text-bega-text-3'
                }`}>{q.priority}</span>
                <span className="text-[11px] font-bold text-bega-text-2 flex-shrink-0 bg-bega-bg-1 px-2.5 py-1 rounded-full">
                  ×{q.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-medium text-bega-text-2 mb-1">No repeated queries yet</p>
            <p className="text-[12px] text-bega-text-3">Queries that appear 2+ times will be listed here.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div ref={gapsRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Content Gaps</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Topics users ask about that may need better content</p>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-bega-bg-1 rounded-xl" />)}
            </div>
          ) : data?.contentGaps.length ? (
            <div className="space-y-2.5">
              {data.contentGaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                    <circle cx="7" cy="7" r="5.5" />
                    <path d="M7 5v2.5M7 9.5v.5" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-amber-800">{gap.topic}</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">{gap.demand} related queries · {gap.action}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-bega-text-3 py-6 text-center">
              Content gaps will appear as recurring topics with low product match rates surface.
            </p>
          )}
        </div>

        <div ref={clickRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Top Suggestion Clicks</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Most-clicked AI suggestion cards</p>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 bg-bega-bg-1 rounded flex-1" />
                  <div className="h-5 bg-bega-bg-1 rounded-full w-8" />
                </div>
              ))}
            </div>
          ) : data?.topSuggestions.length ? (
            <div className="space-y-2">
              {data.topSuggestions.map((s, i) => {
                const barPct = Math.round((s.clicks / topClicks) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[12px] text-bega-text-1 flex-1 pr-4 truncate" title={s.text}>{s.text}</p>
                      <span className="text-[11px] font-bold text-bega-text-2 flex-shrink-0">{s.clicks}</span>
                    </div>
                    <div className="h-1 bg-bega-bg-2 rounded-full overflow-hidden">
                      <div className="h-full bg-bega-black rounded-full transition-all duration-700" style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-bega-text-3 py-6 text-center">
              Suggestion clicks appear here when users interact with AI suggestion cards.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Geographic panel ─────────────────────────────────────────────────────────

function GeographicPanel() {
  const [data, setData]       = useState<GeographyData | null>(null);
  const [loading, setLoading] = useState(true);
  const listRef = useGSAPEntrance(0.07, [loading]);
  const mapRef  = useGSAPScrollReveal();

  useEffect(() => {
    fetchGeography().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const topCount = data?.countries[0]?.count ?? 1;

  if (!loading && (!data || data.totalGeotagged === 0)) {
    return (
      <div className="bg-white border border-bega-border-1 rounded-2xl py-10 text-center">
        <p className="text-[13px] font-medium text-bega-text-2 mb-1">No geographic data yet</p>
        <p className="text-[12px] text-bega-text-3">
          This view populates once visitors submit a Request a Quote form with a resolved location.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div ref={mapRef} className="xl:col-span-2 bg-white border border-bega-border-1 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Geographic Interest</p>
        <p className="text-[11px] text-bega-text-3 mb-4">Where Request a Quote submissions originate</p>
        {loading ? (
          <div className="h-[280px] bg-bega-bg-1 rounded-xl animate-pulse" />
        ) : (
          <WorldMap cities={data!.cities} height={280} />
        )}
      </div>

      <div ref={listRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Top Countries</p>
        <p className="text-[11px] text-bega-text-3 mb-4">By quote request volume</p>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-6 bg-bega-bg-1 rounded-xl" />)}
          </div>
        ) : data?.countries.length ? (
          <div className="space-y-3">
            {data.countries.slice(0, 8).map(c => {
              const widthPct = topCount > 0 ? Math.round((c.count / topCount) * 100) : 0;
              return (
                <div key={c.country}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-bega-text-1">{c.country}</span>
                    <span className="text-[11px] font-bold text-bega-text-1">{c.count} · {c.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-bega-bg-2 rounded-full overflow-hidden">
                    <div className="h-full bg-bega-black rounded-full" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function DemandIntelligenceTab() {
  const [segment, setSegment] = useState<Segment>('category');
  const panelRef = useRef<HTMLDivElement>(null);
  const prevIndexRef = useRef(0);

  useEffect(() => {
    const idx = SEGMENTS.findIndex(s => s.id === segment);
    const dir = idx > prevIndexRef.current ? 1 : idx < prevIndexRef.current ? -1 : 0;
    prevIndexRef.current = idx;
    if (!panelRef.current || dir === 0) return;
    import('gsap').then(({ gsap }) => {
      gsap.fromTo(panelRef.current,
        { x: dir * 28, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.38, ease: 'power2.out' });
    });
  }, [segment]);

  return (
    <div className="space-y-6">
      <AnimatedBanner
        eyebrow="Demand Trends"
        title="What people want, and how content is performing"
        description=""
      />

      <SegmentedNav tabs={SEGMENTS} active={segment} onChange={setSegment} />

      <div ref={panelRef}>
        {segment === 'category'      && <CategoryPanel />}
        {segment === 'specification' && <SpecificationPanel />}
        {segment === 'content'       && <ContentPanel />}
        {segment === 'geographic'    && <GeographicPanel />}
      </div>
    </div>
  );
}
