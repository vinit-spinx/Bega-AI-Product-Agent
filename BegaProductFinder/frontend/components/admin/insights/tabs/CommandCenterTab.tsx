'use client';
import { useState, useEffect } from 'react';
import {
  fetchOverviewV2, fetchLeadInsights,
  type OverviewData, type TimeRange, type LeadInsightsData,
} from '@/services/insights/insightsV2Service';
import ExecutiveBrief from '../widgets/ExecutiveBrief';
import KPICardV2 from '../widgets/KPICardV2';
import AnimatedBanner from '../widgets/AnimatedBanner';
import LeadInsightCard from '../widgets/LeadInsightCard';
import FunnelChart from '../widgets/FunnelChart';
import { useGSAPEntrance, useGSAPScrollReveal } from '@/hooks/useGSAPEntrance';
import LineChart from '../LineChart';

const RANGES: TimeRange[] = ['7D', '30D', '90D', '12M'];

const KPI_ICONS = {
  conversations: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-full h-full"><path d="M3 5h14a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V6a1 1 0 011-1z"/></svg>,
  leads:         <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="8" cy="7" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6"/><path d="M14 13l2 2 4-4"/></svg>,
  conversion:    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-full h-full"><path d="M4 16l4-8 4 4 3-5 3 4"/></svg>,
  queries:       <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className="w-full h-full"><circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/></svg>,
};

function SkeletonCard() {
  return (
    <div className="bg-white border border-bega-border-1 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3.5">
        <div className="h-5 bg-bega-bg-1 rounded-full w-28" />
        <div className="w-9 h-9 bg-bega-bg-1 rounded-full" />
      </div>
      <div className="h-4 bg-bega-bg-1 rounded w-full mb-2" />
      <div className="h-4 bg-bega-bg-1 rounded w-10/12 mb-2" />
      <div className="h-3 bg-bega-bg-1 rounded w-full mt-3" />
      <div className="h-3 bg-bega-bg-1 rounded w-9/12 mt-1.5" />
      <div className="mt-4 pt-3 border-t border-bega-border-1 h-7 bg-bega-bg-1 rounded" />
    </div>
  );
}

export default function CommandCenterTab() {
  const [data, setData]         = useState<OverviewData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [range, setRange]       = useState<TimeRange>('30D');
  const [active, setActive]     = useState(false);

  const [leadData, setLeadData]       = useState<LeadInsightsData | null>(null);
  const [leadLoading, setLeadLoading] = useState(true);

  const kpiRef    = useGSAPEntrance(0.08, [loading]);
  const funnelRef = useGSAPScrollReveal();
  const chartRef  = useGSAPScrollReveal();
  const cardsRef  = useGSAPEntrance(0.06, [leadLoading]);

  useEffect(() => {
    setLoading(true);
    setActive(false);
    fetchOverviewV2(range)
      .then(d => { setData(d); setTimeout(() => setActive(true), 100); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    fetchLeadInsights()
      .then(setLeadData)
      .catch(() => setLeadData(null))
      .finally(() => setLeadLoading(false));
  }, []);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">

      {/* Executive Brief */}
      <ExecutiveBrief />

      {/* Range selector */}
      <div className="flex items-center gap-1">
        {RANGES.map(r => (
          <button key={r} type="button" onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              range === r ? 'bg-bega-black text-white' : 'text-bega-text-3 hover:text-bega-text-2 hover:bg-bega-bg-1'
            }`}
          >{r}</button>
        ))}
      </div>

      {/* KPI row */}
      <div ref={kpiRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardV2 label="Total Conversations"  value={kpis?.totalConversations ?? 0} icon={KPI_ICONS.conversations} trend={kpis?.trends.conversations} sub="unique sessions" active={active && !loading} />
        <KPICardV2 label="Leads Captured"       value={kpis?.totalLeads ?? 0}         icon={KPI_ICONS.leads}         trend={kpis?.trends.leads}         sub="via Connect form"  active={active && !loading} />
        <KPICardV2 label="Conversion Rate"      value={kpis?.conversionRate ?? 0}     icon={KPI_ICONS.conversion}    trend={kpis?.trends.conversion}    format="percent"        active={active && !loading} />
        <KPICardV2 label="Total Queries"        value={kpis?.totalQueries ?? 0}       icon={KPI_ICONS.queries}       trend={kpis?.trends.queries}       sub="messages to AI"    active={active && !loading} />
      </div>

      {/* Category + Project highlights */}
      {!loading && kpis && (kpis.mostActiveCategory !== '—' || kpis.mostActiveProject !== '—') && (
        <div className="grid grid-cols-2 gap-4">
          {kpis.mostActiveCategory !== '—' && (
            <div className="bg-white border border-bega-border-1 rounded-2xl p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-bega-text-3 mb-2">Most Active Category</p>
              <p className="text-[16px] font-semibold text-bega-text-1">{kpis.mostActiveCategory}</p>
            </div>
          )}
          {kpis.mostActiveProject !== '—' && (
            <div className="bg-white border border-bega-border-1 rounded-2xl p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-bega-text-3 mb-2">Most Active Project Type</p>
              <p className="text-[16px] font-semibold text-bega-text-1">{kpis.mostActiveProject}</p>
            </div>
          )}
        </div>
      )}

      {/* Conversion funnel */}
      <div ref={funnelRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Conversion Funnel</p>
        <p className="text-[11px] text-bega-text-3 mb-4">Query → Product Viewed → Shortlisted → BOM Generated → Lead Captured</p>
        <FunnelChart range={range} />
      </div>

      {/* Activity chart */}
      <div ref={chartRef} className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Query & Lead Activity</p>
        <p className="text-[11px] text-bega-text-3 mb-4">Queries and leads over selected period</p>
        {loading ? (
          <div className="h-48 bg-bega-bg-1 rounded-xl animate-pulse" />
        ) : data?.activity.length ? (
          <LineChart
            data={data.activity}
            series={[
              { key: 'queries', label: 'Queries', color: '#1A1A1A' },
              { key: 'leads',   label: 'Leads',   color: '#97968F' },
            ]}
            height={192}
          />
        ) : (
          <div className="h-48 flex items-center justify-center text-[12px] text-bega-text-3">
            No activity recorded for this period yet.
          </div>
        )}
      </div>

      {/* Leads Feed */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[14px] font-semibold text-bega-text-1">Leads Feed</h2>
            <p className="text-[11px] text-bega-text-3">AI-generated insights from real lead data · click to expand</p>
          </div>
          {!leadLoading && leadData?.cards.length ? (
            <span className="text-[10px] font-medium text-bega-text-3 bg-bega-bg-1 px-2.5 py-1 rounded-full flex-shrink-0">
              {leadData.cards.length} insight{leadData.cards.length !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        {!leadLoading && !leadData?.hasData ? (
          <div className="bg-white border border-bega-border-1 rounded-2xl py-12 text-center">
            <p className="text-[13px] font-medium text-bega-text-2 mb-1">No Leads Yet</p>
            <p className="text-[12px] text-bega-text-3">
              AI-powered insights appear here once visitors submit Connect with BEGA inquiries.
            </p>
          </div>
        ) : (
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leadLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : leadData?.cards.map((card, i) => <LeadInsightCard key={i} card={card} index={i} />)
            }
          </div>
        )}
      </section>
    </div>
  );
}
