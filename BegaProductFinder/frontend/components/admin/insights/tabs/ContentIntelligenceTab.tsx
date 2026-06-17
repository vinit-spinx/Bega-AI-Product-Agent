'use client';
import { useState, useEffect } from 'react';
import { fetchContentIntel, type ContentData } from '@/services/insights/insightsV2Service';
import { useGSAPEntrance, useGSAPScrollReveal } from '@/hooks/useGSAPEntrance';

export default function ContentIntelligenceTab() {
  const [data, setData]       = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);

  const repeatedRef = useGSAPEntrance(0.06, [loading]);
  const gapsRef     = useGSAPScrollReveal();
  const clickRef    = useGSAPScrollReveal();

  useEffect(() => {
    fetchContentIntel()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const topClicks = data?.topSuggestions[0]?.clicks ?? 1;

  return (
    <div className="space-y-5">
      {/* Repeated queries */}
      <div className="bg-white border border-bega-border-1 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bega-border-1 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-bega-text-1">High-Frequency Queries</p>
            <p className="text-[11px] text-bega-text-3 mt-0.5">Questions asked multiple times — prioritise content for these</p>
          </div>
          {data?.totalAnalysed ? (
            <span className="text-[10px] font-medium text-bega-text-3 bg-bega-bg-1 px-2.5 py-1 rounded-full">
              {data.totalAnalysed} total analysed
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="divide-y divide-bega-border-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4 animate-pulse">
                <div className="h-3 bg-bega-bg-1 rounded flex-1" />
                <div className="h-5 bg-bega-bg-1 rounded-full w-8" />
              </div>
            ))}
          </div>
        ) : data?.repeatedQueries.length ? (
          <div ref={repeatedRef} className="divide-y divide-bega-border-1">
            {data.repeatedQueries.map((q, i) => (
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

      {/* Content gaps + Suggestion clicks */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Content gaps — uses data.contentGaps: { topic, demand, action } */}
        <div ref={gapsRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Content Gaps</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Topics users ask about that may need better content</p>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-bega-bg-1 rounded-xl" />
              ))}
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

        {/* Suggestion clicks — uses data.topSuggestions: { text, clicks } */}
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
                      <div
                        className="h-full bg-bega-black rounded-full transition-all duration-700"
                        style={{ width: `${barPct}%` }}
                      />
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
