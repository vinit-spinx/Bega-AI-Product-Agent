'use client';
import { useState, useEffect } from 'react';
import {
  fetchLeadInsights, fetchLeadTable, fetchSessionConversation,
  type LeadInsightsData, type LeadTableRow, type ChatMessage,
} from '@/services/insights/insightsV2Service';
import LeadInsightCard from '../widgets/LeadInsightCard';
import { useGSAPEntrance } from '@/hooks/useGSAPEntrance';

// ── Score badge colour ────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700';
  if (score >= 60) return 'bg-amber-50 text-amber-700';
  return 'bg-bega-bg-1 text-bega-text-3';
}

// ── Conversation offcanvas ────────────────────────────────────────────────────

function ConversationOffcanvas({
  lead,
  onClose,
}: {
  lead: LeadTableRow | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);

  useEffect(() => {
    if (!lead) return;
    setMessages([]);
    setError(false);
    setLoading(true);
    fetchSessionConversation(lead.sessionId)
      .then(d => setMessages(d.messages ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [lead]);

  if (!lead) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[500px] max-w-[calc(100vw-2rem)] bg-white z-50 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-bega-border-1 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-bega-text-1 truncate">{lead.name}</p>
            <p className="text-[12px] text-bega-text-3 truncate">{lead.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-bega-text-3 hover:text-bega-text-1 transition-colors mt-0.5 flex-shrink-0"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Lead brief */}
        <div className="px-6 py-3.5 bg-bega-bg-1/60 border-b border-bega-border-1 flex-shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-bega-text-3 mb-1.5">Lead Brief</p>
          <p className="text-[12px] text-bega-text-2 leading-relaxed">{lead.query}</p>
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-[10px] text-bega-text-3">{lead.date}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${scoreColor(lead.score)}`}>
              Score {lead.score}
            </span>
          </div>
        </div>

        {/* Conversation label */}
        <div className="px-6 py-2.5 border-b border-bega-border-1 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-bega-text-3">
            Conversation History
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 0, 1, 0, 1].map((r, i) => (
                <div key={i} className={`flex ${r ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="h-14 bg-bega-bg-1 rounded-2xl"
                    style={{ width: `${55 + i * 5}%` }}
                  />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <p className="text-[13px] text-bega-text-2 font-medium mb-1">Conversation unavailable</p>
              <p className="text-[11px] text-bega-text-3">The session may have expired or been cleared.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[13px] text-bega-text-3">No messages recorded for this session.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-bega-black text-white rounded-br-sm'
                      : 'bg-bega-bg-1 text-bega-text-1 rounded-bl-sm'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Lead table ────────────────────────────────────────────────────────────────

function LeadTable({ onSelect }: { onSelect: (lead: LeadTableRow) => void }) {
  const [leads, setLeads]     = useState<LeadTableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadTable()
      .then(d => setLeads(d.leads))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 bg-bega-bg-1 rounded-xl" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <p className="text-[13px] text-bega-text-3 text-center py-8">
        No leads captured in the past 30 days.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[600px]">
        <thead>
          <tr className="border-b border-bega-border-1">
            {['Name', 'Email', 'Lead Brief', 'Date', 'Score', ''].map(h => (
              <th
                key={h}
                className="pb-2.5 pr-4 text-[9px] font-bold uppercase tracking-[0.22em] text-bega-text-3 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr
              key={lead.id}
              onClick={() => onSelect(lead)}
              className="border-b border-bega-border-1/50 cursor-pointer hover:bg-bega-bg-1/50 transition-colors group"
            >
              <td className="py-3 pr-4 text-[12px] font-medium text-bega-text-1 whitespace-nowrap">
                {lead.name}
              </td>
              <td className="py-3 pr-4 text-[12px] text-bega-text-3 whitespace-nowrap">
                {lead.email}
              </td>
              <td className="py-3 pr-4 max-w-[240px]">
                <span className="block truncate text-[12px] text-bega-text-2">{lead.preview}</span>
              </td>
              <td className="py-3 pr-4 text-[11px] text-bega-text-3 whitespace-nowrap">
                {lead.date}
              </td>
              <td className="py-3 pr-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scoreColor(lead.score)}`}>
                  {lead.score}
                </span>
              </td>
              <td className="py-3">
                <span className="flex items-center gap-1 text-[11px] text-bega-text-3 group-hover:text-bega-text-1 transition-colors">
                  View
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3">
                    <path d="M2 6h8M6 2l4 4-4 4" />
                  </svg>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

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
      <div className="h-3 bg-bega-bg-1 rounded w-11/12 mt-1.5" />
      <div className="mt-4 pt-3 border-t border-bega-border-1 h-7 bg-bega-bg-1 rounded" />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyLeadIntelligence() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 mx-auto mb-6 text-bega-text-3">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" className="w-full h-full">
          <circle cx="32" cy="22" r="10" />
          <path d="M12 56c0-11 9-20 20-20" />
          <path d="M38 38l5 5 10-10" />
        </svg>
      </div>
      <h3 className="text-[16px] font-semibold text-bega-text-1 mb-2">No Lead Intelligence Yet</h3>
      <p className="text-[13px] text-bega-text-3 max-w-[380px] leading-relaxed">
        AI-powered lead insights will appear here as visitors submit Connect with BEGA inquiries.
        The more leads captured, the richer the intelligence.
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left">
        {[
          { icon: '01', label: 'Visitors chat with the AI', detail: 'Users ask about BEGA products and lighting solutions' },
          { icon: '02', label: 'Lead form submitted',       detail: 'Visitors complete Connect with BEGA to speak with sales' },
          { icon: '03', label: 'Insights generated',        detail: 'AI analyzes patterns to surface conversion opportunities' },
        ].map(s => (
          <div key={s.icon} className="bg-white border border-bega-border-1 rounded-xl p-4">
            <span className="text-[10px] font-bold text-bega-text-3">{s.icon}</span>
            <p className="text-[12px] font-semibold text-bega-text-1 mt-1 mb-1">{s.label}</p>
            <p className="text-[11px] text-bega-text-3 leading-snug">{s.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function LeadIntelligenceTab() {
  const [data, setData]             = useState<LeadInsightsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadTableRow | null>(null);

  const cardsRef = useGSAPEntrance(0.06, [loading]);

  useEffect(() => {
    fetchLeadInsights()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const noData = !loading && (!data || !data.hasData);

  return (
    <div className="space-y-6">
      {noData ? (
        <EmptyLeadIntelligence />
      ) : (
        <>
          {/* Lead Intelligence Feed */}
          <section>
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-[14px] font-semibold text-bega-text-1">Lead Intelligence Feed</h2>
                <p className="text-[11px] text-bega-text-3">AI-generated insights from real lead data · click to expand</p>
              </div>
              {!loading && data?.cards.length ? (
                <span className="text-[10px] font-medium text-bega-text-3 bg-bega-bg-1 px-2.5 py-1 rounded-full flex-shrink-0">
                  {data.cards.length} insight{data.cards.length !== 1 ? 's' : ''}
                </span>
              ) : null}
            </div>

            <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : data?.cards.map((card, i) => <LeadInsightCard key={i} card={card} index={i} />)
              }
            </div>

            {!loading && (data?.cards.length ?? 0) === 0 && data?.hasData && (
              <div className="text-center py-10">
                <p className="text-[13px] text-bega-text-3">
                  No specific patterns detected yet. Insights become richer as more leads accumulate.
                </p>
              </div>
            )}
          </section>

          {/* Recent Leads — 30-day table */}
          <section>
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-[14px] font-semibold text-bega-text-1">Recent Leads</h2>
              <p className="text-[11px] text-bega-text-3">Past 30 days · click any row to view the full conversation</p>
            </div>
            <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
              <LeadTable onSelect={setSelectedLead} />
            </div>
          </section>
        </>
      )}

      {/* Right-side offcanvas — conversation viewer */}
      <ConversationOffcanvas
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
