'use client';
import { useState, useEffect } from 'react';
import {
  fetchLeadTable, fetchSessionConversation,
  type LeadTableRow, type ChatMessage,
} from '@/services/insights/insightsV2Service';
import AnimatedBanner from '../widgets/AnimatedBanner';
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

  useEffect(() => {
    if (!lead) return;
    import('gsap').then(({ gsap }) => {
      gsap.fromTo('#lead-offcanvas-panel',
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
    });
  }, [lead]);

  if (!lead) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div id="lead-offcanvas-panel" className="fixed top-0 right-0 h-full w-[500px] max-w-[calc(100vw-2rem)] bg-white z-50 shadow-2xl flex flex-col">

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

        <div className="px-6 py-2.5 border-b border-bega-border-1 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-bega-text-3">
            Conversation History
          </p>
        </div>

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
  const rowsRef = useGSAPEntrance<HTMLTableSectionElement>(0.025, [loading]);

  useEffect(() => {
    fetchLeadTable()
      .then(d => setLeads(d.leads))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
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
        <tbody ref={rowsRef}>
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

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function LeadPipelineTab() {
  const [selectedLead, setSelectedLead] = useState<LeadTableRow | null>(null);

  return (
    <div className="space-y-6">
      <AnimatedBanner
        eyebrow="Lead Pipeline"
        title="Every captured lead, with the conversation behind it"
        description="Click any row to open the full chat transcript that produced the inquiry — verified against error-state and noise filters so only genuine Connect with BEGA submissions appear."
      />

      <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-[14px] font-semibold text-bega-text-1">Recent Leads</h2>
          <p className="text-[11px] text-bega-text-3">Past 30 days · click any row to view the full conversation</p>
        </div>
        <LeadTable onSelect={setSelectedLead} />
      </div>

      <ConversationOffcanvas
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
