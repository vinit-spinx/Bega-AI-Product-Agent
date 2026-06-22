'use client';
import { useState, useEffect } from 'react';
import {
  fetchConversations, fetchSessionConversation,
  type ConversationRow, type ChatMessage, type LeadTemperature,
} from '@/services/insights/insightsV2Service';
import { useGSAPEntrance } from '@/hooks/useGSAPEntrance';
import { FilterBar, PaginationFooter } from '@/components/admin/DataTableControls';

const PAGE_SIZE = 15;

const STAGE_LABELS: Record<string, string> = {
  query: 'Query',
  product_viewed: 'Product Viewed',
  shortlisted: 'Shortlisted',
  bom_generated: 'BOM Generated',
  lead_captured: 'Lead Captured',
};

function StageBadge({ stage }: { stage: string }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full
                      border border-bega-border-2 text-bega-text-3 whitespace-nowrap">
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}

function temperatureColor(temp: LeadTemperature) {
  if (temp === 'hot')  return 'bg-rose-50 text-rose-700';
  if (temp === 'warm') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-50 text-slate-600';
}

function TemperatureBadge({ temperature }: { temperature: LeadTemperature | null }) {
  if (!temperature) return <span className="text-[11px] text-bega-text-3">—</span>;
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${temperatureColor(temperature)}`}>
      {temperature}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Conversation offcanvas — AI summary on top, full transcript below ───────

function ConversationOffcanvas({
  conversation,
  onClose,
}: {
  conversation: ConversationRow | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);

  useEffect(() => {
    if (!conversation) return;
    setMessages([]);
    setError(false);
    setLoading(true);
    fetchSessionConversation(conversation.sessionId)
      .then(d => setMessages(d.messages ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [conversation]);

  useEffect(() => {
    if (!conversation) return;
    import('gsap').then(({ gsap }) => {
      gsap.fromTo('#conversation-offcanvas-panel',
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
    });
  }, [conversation]);

  if (!conversation) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div id="conversation-offcanvas-panel" className="fixed top-0 right-0 h-full w-[500px] max-w-[calc(100vw-2rem)] bg-white z-50 shadow-2xl flex flex-col">

        <div className="px-6 py-4 border-b border-bega-border-1 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-bega-text-1 truncate">{conversation.name}</p>
              <StageBadge stage={conversation.stage} />
            </div>
            {conversation.email && <p className="text-[12px] text-bega-text-3 truncate">{conversation.email}</p>}
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
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-bega-text-3 mb-1.5">AI Summary</p>
          <p className="text-[12px] text-bega-text-2 leading-relaxed">
            {conversation.summary || 'No summary available for this session.'}
          </p>
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-[10px] text-bega-text-3">{formatDate(conversation.lastActivityAt)}</span>
            {conversation.isLead && <TemperatureBadge temperature={conversation.temperature} />}
          </div>
        </div>

        <div className="px-6 py-2.5 border-b border-bega-border-1 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-bega-text-3">
            Conversation History · {conversation.messageCount} messages
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 0, 1, 0, 1].map((r, i) => (
                <div key={i} className={`flex ${r ? 'justify-end' : 'justify-start'}`}>
                  <div className="h-14 bg-bega-bg-1 rounded-2xl" style={{ width: `${55 + i * 5}%` }} />
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

// ── Conversations table ───────────────────────────────────────────────────────

function ConversationsTable({ onSelect }: { onSelect: (c: ConversationRow) => void }) {
  const [items, setItems]     = useState<ConversationRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [stage, setStage]     = useState('');
  const [temperature, setTemperature] = useState('');
  const [loading, setLoading] = useState(true);
  const rowsRef = useGSAPEntrance<HTMLTableSectionElement>(0.025, [loading]);

  useEffect(() => {
    setLoading(true);
    fetchConversations({ page, pageSize: PAGE_SIZE, search, stage, temperature: temperature as never })
      .then(d => { setItems(d.items); setTotal(d.total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search, stage, temperature]);

  useEffect(() => { setPage(1); }, [search, stage, temperature]);

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by visitor, email or summary…"
        filters={[
          {
            key: 'stage', label: 'Stage', type: 'select',
            options: Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label })),
          },
          // {
          //   key: 'temperature', label: 'Temperature', type: 'select',
          //   options: [
          //     { value: 'hot', label: 'Hot' },
          //     { value: 'warm', label: 'Warm' },
          //     { value: 'cold', label: 'Cold' },
          //   ],
          // },
        ]}
        filterValues={{ stage, temperature }}
        onFilterChange={(key, value) => {
          if (key === 'stage') setStage(value);
          // if (key === 'temperature') setTemperature(value);
        }}
      />

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 bg-bega-bg-1 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-bega-text-3 text-center py-8">
          No finished conversations match the current filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[680px]">
            <thead>
              <tr className="border-b border-bega-border-1">
                {['Visitor', 'Stage',  'Summary', 'Last Activity', ''].map(h => (
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
              {items.map(c => (
                <tr
                  key={c.sessionId}
                  onClick={() => onSelect(c)}
                  className="border-b border-bega-border-1/50 cursor-pointer hover:bg-bega-bg-1/50 transition-colors group"
                >
                  <td className="py-3 pr-4 text-[12px] font-medium text-bega-text-1 whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <StageBadge stage={c.stage} />
                  </td>
                  {/* <td className="py-3 pr-4 whitespace-nowrap">
                    <TemperatureBadge temperature={c.isLead ? c.temperature : null} />
                  </td> */}
                  <td className="py-3 pr-4 max-w-[280px]">
                    <span className="block truncate text-[12px] text-bega-text-2">
                      {c.summary || '—'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[11px] text-bega-text-3 whitespace-nowrap">
                    {formatDate(c.lastActivityAt)}
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

export default function ConversationsTab() {
  const [selected, setSelected] = useState<ConversationRow | null>(null);

  return (
    <div className="bg-white border border-bega-border-1 rounded-2xl p-5">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-[14px] font-semibold text-bega-text-1">Finished Conversations</h2>
        <p className="text-[11px] text-bega-text-3">
          Click any row to view the full transcript and AI-generated summary
        </p>
      </div>
      <ConversationsTable onSelect={setSelected} />

      <ConversationOffcanvas conversation={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
