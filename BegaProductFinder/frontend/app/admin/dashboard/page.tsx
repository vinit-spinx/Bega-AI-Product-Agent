'use client';
import { useEffect, useState } from 'react';
import { fetchDashboard, type DashboardData } from '@/services/insights/insightsV2Service';
import AnimatedBanner from '@/components/admin/insights/widgets/AnimatedBanner';
import KPICardV2 from '@/components/admin/insights/widgets/KPICardV2';
import WorldMap from '@/components/admin/insights/widgets/WorldMap';
import LineChart from '@/components/admin/insights/LineChart';
import { useGSAPEntrance, useGSAPScrollReveal } from '@/hooks/useGSAPEntrance';

const KPI_ICONS = {
  queries: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-full h-full"><circle cx="9" cy="9" r="6" /><path d="M15 15l3 3" /></svg>,
  intent:  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M10 2l2.5 5.5L18 9l-5 4 1.5 6L10 16l-4.5 3L7 13l-5-4 5.5-1.5z" /></svg>,
  clicks:  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M9 2l1 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" /></svg>,
  gaps:    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M10 2l7 3.5v7l-7 3.5-7-3.5v-7z" /><path d="M10 2v14M3 6l7 3.5 7-3.5" /></svg>,
};

const DONUT_COLORS = ['#1A1A1A', '#575652', '#97968F', '#BBBBB6', '#D3D3CF'];

function CategoryDonut({ data }: { data: DashboardData['topCategories'] }) {
  if (!data.length) return <p className="text-[12px] text-bega-text-3 py-10 text-center">No category data yet.</p>;
  const r = 60, cx = 70, cy = 70, circumference = 2 * Math.PI * r;
  let offset = 0;
  const total = data.reduce((s, d) => s + d.mentions, 0);

  return (
    <div className="flex items-center gap-6">
      <svg width={140} height={140} viewBox="0 0 140 140" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EDEAE5" strokeWidth={18} />
        {data.map((d, i) => {
          const frac = d.mentions / Math.max(total, 1);
          const dash = frac * circumference;
          const circle = (
            <circle
              key={d.category}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={18}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return circle;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-bega-text-1" style={{ fontSize: 20, fontWeight: 700 }}>{total.toLocaleString()}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-bega-text-3" style={{ fontSize: 9 }}>Total</text>
      </svg>
      <div className="flex-1 space-y-2 min-w-0">
        {data.map((d, i) => (
          <div key={d.category} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-bega-text-2 truncate flex-1">{d.category}</span>
            <span className="font-bold text-bega-text-1 flex-shrink-0">{d.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunityScoreCard({ score }: { score: number }) {
  const r = 52, circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  return (
    <div className="bg-bega-black rounded-2xl p-5 flex flex-col items-center justify-center text-center h-full">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-1">Opportunity Score</p>
      <p className="text-[11px] text-white/40 mb-4">Based on demand & intent</p>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10} />
        <circle
          cx={65} cy={65} r={r} fill="none" stroke="#D9A441" strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`} transform="rotate(-90 65 65)"
        />
        <text x={65} y={62} textAnchor="middle" className="fill-white" style={{ fontSize: 28, fontWeight: 700 }}>{score}</text>
        <text x={65} y={80} textAnchor="middle" className="fill-white/40" style={{ fontSize: 11 }}>/100</text>
      </svg>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const kpiRef   = useGSAPEntrance(0.08, [loading]);
  const rowRef   = useGSAPScrollReveal();
  const chartRef = useGSAPScrollReveal();
  const bottomRef = useGSAPScrollReveal();

  useEffect(() => {
    fetchDashboard().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <AnimatedBanner
        eyebrow="Dashboard"
        title="BEGA AI Product Advisor — Overview"
        description="Real-time demand, lead, and content intelligence at a glance."
      />

      {/* KPI row */}
      <div ref={kpiRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardV2 label="Total Queries" value={kpis?.totalQueries ?? 0} icon={KPI_ICONS.queries} trend={kpis?.totalQueriesTrend} sub="vs last 7 days" active={!loading} />
        <KPICardV2 label="High-Intent Queries" value={kpis?.highIntentQueries ?? 0} icon={KPI_ICONS.intent} trend={kpis?.highIntentTrend} sub="vs last 7 days" active={!loading} />
        <KPICardV2 label="AI Suggestions Clicked" value={kpis?.suggestionsClicked ?? 0} icon={KPI_ICONS.clicks} trend={kpis?.suggestionsClickedTrend} sub="vs last 7 days" active={!loading} />
        <KPICardV2 label="Content Gaps Found" value={kpis?.contentGapsFound ?? 0} icon={KPI_ICONS.gaps} sub="topics needing content" active={!loading} />
      </div>

      {/* High-Frequency Queries + AI Recommendations */}
      <div ref={rowRef} className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-bega-border-1 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-bega-border-1">
            <p className="text-[13px] font-semibold text-bega-text-1">High-Frequency Queries</p>
            <p className="text-[11px] text-bega-text-3 mt-0.5">Top questions asked multiple times — prioritize content for these</p>
          </div>
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-bega-bg-1 rounded-xl" />)}
            </div>
          ) : data?.highFrequencyQueries.length ? (
            <div className="divide-y divide-bega-border-1">
              {data.highFrequencyQueries.map((q, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-[10px] text-bega-text-3 flex-shrink-0 w-4 text-right">{i + 1}</span>
                  <p className="text-[12px] text-bega-text-1 flex-1 leading-relaxed">{q.query}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    q.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                    q.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-bega-bg-1 text-bega-text-3'
                  }`}>{q.priority}</span>
                  <span className="text-[11px] font-bold text-bega-text-2 flex-shrink-0 bg-bega-bg-1 px-2.5 py-1 rounded-full">×{q.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-[12px] text-bega-text-3">No repeated queries yet.</p>
          )}
        </div>

        <div className="bg-white border border-bega-border-1 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-bega-border-1">
            <p className="text-[13px] font-semibold text-bega-text-1">AI Recommendations</p>
            <p className="text-[11px] text-bega-text-3 mt-0.5">Smart recommendations to improve content and capture demand</p>
          </div>
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-bega-bg-1 rounded-xl" />)}
            </div>
          ) : data?.aiRecommendations.length ? (
            <div className="divide-y divide-bega-border-1">
              {data.aiRecommendations.map((r, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-bega-black flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth={1.4} className="w-4 h-4"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-bega-text-1 leading-snug">{r.title}</p>
                    <p className="text-[11px] text-bega-text-3 mt-0.5">{r.detectedQueries} queries detected · Potential impact: <span className="text-emerald-600 font-medium">+{r.potentialImpactPct}%</span></p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    r.priority === 'High Priority' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>{r.priority}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-[12px] text-bega-text-3">No recommendations yet.</p>
          )}
        </div>
      </div>

      {/* Search Trend + Top Categories + Geographic */}
      <div ref={chartRef} className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Search Trend</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Query volume over the last 7 days</p>
          {loading ? (
            <div className="h-48 bg-bega-bg-1 rounded-xl animate-pulse" />
          ) : data?.searchTrend.length ? (
            <LineChart data={data.searchTrend} series={[{ key: 'queries', label: 'Queries', color: '#1A1A1A' }]} height={192} />
          ) : (
            <div className="h-48 flex items-center justify-center text-[12px] text-bega-text-3">No activity recorded yet.</div>
          )}
        </div>

        <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Top Categories</p>
          <p className="text-[11px] text-bega-text-3 mb-4">By query volume</p>
          {loading ? <div className="h-40 bg-bega-bg-1 rounded-xl animate-pulse" /> : <CategoryDonut data={data?.topCategories ?? []} />}
        </div>

        <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Geographic Interest</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Top countries by interest</p>
          {loading ? (
            <div className="h-40 bg-bega-bg-1 rounded-xl animate-pulse" />
          ) : data?.geographic.countries.length ? (
            <div className="space-y-2.5">
              {data.geographic.countries.slice(0, 5).map(c => (
                <div key={c.country} className="flex items-center justify-between text-[12px]">
                  <span className="text-bega-text-1 font-medium">{c.country}</span>
                  <span className="text-bega-text-3 font-bold">{c.pct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-bega-text-3 py-8 text-center">No geographic data yet.</p>
          )}
        </div>
      </div>

      {/* Content Gaps + Opportunity Score */}
      <div ref={bottomRef} className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Content Gaps</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Topics users want to know more about</p>
          {loading ? (
            <div className="flex gap-2 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 w-32 bg-bega-bg-1 rounded-full" />)}
            </div>
          ) : data?.contentGaps.length ? (
            <div className="flex flex-wrap gap-2">
              {data.contentGaps.map(topic => (
                <span key={topic} className="px-3.5 py-2 rounded-full bg-bega-bg-1 border border-bega-border-1 text-[12px] text-bega-text-1">
                  {topic}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-bega-text-3 py-4 text-center">No content gaps detected yet.</p>
          )}
        </div>

        {!loading && <OpportunityScoreCard score={data?.opportunityScore ?? 0} />}
        {loading && <div className="h-40 bg-bega-bg-1 rounded-2xl animate-pulse" />}
      </div>

      {data && data.geographic.cities.length > 0 && (
        <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Demand Map</p>
          <p className="text-[11px] text-bega-text-3 mb-4">Quote requests by location</p>
          <WorldMap cities={data.geographic.cities} height={300} />
        </div>
      )}
    </div>
  );
}
