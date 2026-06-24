'use client';
import { useState, useEffect } from 'react';
import {
  fetchLeadTable, fetchSessionConversation, stripShortlistContext,
  type LeadTableRow, type ChatMessage, type LeadTemperature,
} from '@/services/insights/insightsV2Service';
import AnimatedBanner from '../widgets/AnimatedBanner';
import { useGSAPEntrance } from '@/hooks/useGSAPEntrance';
import { FilterBar, PaginationFooter } from '@/components/admin/DataTableControls';

const PAGE_SIZE = 15;

// ── Lead temperature badge ───────────────────────────────────────────────────

function temperatureColor(temp: LeadTemperature) {
  if (temp === 'hot')  return 'bg-rose-50 text-rose-700';
  if (temp === 'warm') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-50 text-slate-600';
}

function TemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${temperatureColor(temperature)}`}>
      {temperature}
    </span>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string | null }) {
  if (source === 'quote_request') {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-bega-black text-white whitespace-nowrap">
        Quote Request
      </span>
    );
  }
  if (source === 'inquiry') {
    return (
      <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-bega-border-2 text-bega-text-3 whitespace-nowrap">
        Inquiry
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-dashed border-bega-border-2 text-bega-text-3 whitespace-nowrap">
      AI Detected
    </span>
  );
}

// ── Shortlist / BOM parsing helpers ──────────────────────────────────────────

interface QuoteShortlistItem {
  catalogNumber: string;
  quantity: number;
  kind: string;
}

interface QuoteBomLineItem {
  catalogNumber: string;
  description?: string;
  familyName?: string;
  quantity: number;
  lineTotalDnp?: number;
  leadTime?: string;
}

interface QuoteBomReport {
  lineItems: QuoteBomLineItem[];
  subtotalDnp: number;
  currency: string;
  itemCount: number;
}

function parseJson<T>(json: string | null): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

// ── Attached shortlist/BOM panel — shown for quote-request leads ────────────

function QuoteAttachmentPanel({ lead }: { lead: LeadTableRow }) {
  const shortlist = parseJson<QuoteShortlistItem[]>(lead.shortlistJson);
  const bom       = parseJson<QuoteBomReport>(lead.bomReportJson);

  if (!shortlist?.length && !bom) return null;

  return (
    <div className="px-6 py-3.5 bg-amber-50/60 border-b border-bega-border-1 flex-shrink-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-amber-700 mb-2.5">
        Requested Items{lead.company ? ` · ${lead.company}` : ''}
      </p>

      {bom ? (
        <div className="space-y-1.5">
          {bom.lineItems.map((li, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="font-mono font-semibold text-bega-text-1">{li.catalogNumber}</span>
              <span className="text-bega-text-2 flex-1 truncate px-2">{li.description ?? li.familyName ?? '—'}</span>
              <span className="text-bega-text-3 flex-shrink-0">×{li.quantity}</span>
              <span className="text-bega-text-1 font-medium flex-shrink-0 w-16 text-right">
                {li.lineTotalDnp != null ? `$${li.lineTotalDnp.toFixed(2)}` : '—'}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-amber-200/60">
            <span className="text-[11px] font-bold text-bega-text-1">Subtotal (DNP)</span>
            <span className="text-[12px] font-bold text-bega-text-1">${bom.subtotalDnp.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {shortlist!.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="font-mono font-semibold text-bega-text-1">{s.catalogNumber}</span>
              <span className="text-bega-text-3 capitalize">{s.kind}</span>
              <span className="text-bega-text-2 flex-shrink-0">×{s.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-bega-text-1 truncate">{lead.name}</p>
              <SourceBadge source={lead.source} />
            </div>
            {lead.email && <p className="text-[12px] text-bega-text-3 truncate">{lead.email}</p>}
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
            <TemperatureBadge temperature={lead.temperature} />
          </div>
        </div>

        {lead.source === 'quote_request' && <QuoteAttachmentPanel lead={lead} />}

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
                  {msg.role === 'user' ? stripShortlistContext(msg.content) : msg.content}
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
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [temperature, setTemperature] = useState('');
  const [source, setSource]   = useState('');
  const [loading, setLoading] = useState(true);
  const rowsRef = useGSAPEntrance<HTMLTableSectionElement>(0.025, [loading]);

  useEffect(() => {
    setLoading(true);
    fetchLeadTable({ page, pageSize: PAGE_SIZE, search, temperature: temperature as never, source })
      .then(d => { setLeads(d.leads); setTotal(d.total); })
      .catch(() => { setLeads([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search, temperature, source]);

  // Filter changes reset to page 1
  useEffect(() => { setPage(1); }, [search, temperature, source]);

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email or brief…"
        filters={[
          {
            key: 'temperature', label: 'Temperature', type: 'select',
            options: [
              { value: 'hot', label: 'Hot' },
              { value: 'warm', label: 'Warm' },
              { value: 'cold', label: 'Cold' },
            ],
          },
          {
            key: 'source', label: 'Source', type: 'select',
            options: [
              { value: 'quote_request', label: 'Quote Request' },
              { value: 'inquiry', label: 'Inquiry' },
            ],
          },
        ]}
        filterValues={{ temperature, source }}
        onFilterChange={(key, value) => {
          if (key === 'temperature') setTemperature(value);
          if (key === 'source') setSource(value);
        }}
      />

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 bg-bega-bg-1 rounded-xl" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <p className="text-[13px] text-bega-text-3 text-center py-8">
          No leads match the current filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="border-b border-bega-border-1">
                {['Name', 'Source', 'Email', 'Lead Brief', 'Date', 'Temp', ''].map(h => (
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
                  key={lead.sessionId}
                  onClick={() => onSelect(lead)}
                  className="border-b border-bega-border-1/50 cursor-pointer hover:bg-bega-bg-1/50 transition-colors group"
                >
                  <td className="py-3 pr-4 text-[12px] font-medium text-bega-text-1 whitespace-nowrap">
                    {lead.name}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <SourceBadge source={lead.source} />
                  </td>
                  <td className="py-3 pr-4 text-[12px] text-bega-text-3 whitespace-nowrap">
                    {lead.email || '—'}
                  </td>
                  <td className="py-3 pr-4 max-w-[240px]">
                    <span className="block truncate text-[12px] text-bega-text-2">{lead.preview}</span>
                  </td>
                  <td className="py-3 pr-4 text-[11px] text-bega-text-3 whitespace-nowrap">
                    {lead.date}
                  </td>
                  <td className="py-3 pr-4">
                    <TemperatureBadge temperature={lead.temperature} />
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
      )}

      <PaginationFooter page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </>
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
        description="Click any row to open the full chat transcript that produced the lead — AI-classified as cold, warm, or hot based on the funnel stage reached and what was actually said."
      />

      <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-[14px] font-semibold text-bega-text-1">All Leads</h2>
          <p className="text-[11px] text-bega-text-3">Click any row to view the full conversation</p>
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
