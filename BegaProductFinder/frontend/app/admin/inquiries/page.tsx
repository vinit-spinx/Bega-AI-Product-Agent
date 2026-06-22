'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { FilterBar, PaginationFooter } from '@/components/admin/DataTableControls';

const PAGE_SIZE = 15;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

interface Inquiry {
  inquiryId: number;
  name: string;
  email: string;
  query: string;
  sessionId: string;
  createdAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Single inquiry card ───────────────────────────────────────────────────────

function InquiryCard({
  inquiry,
  onDelete,
}: {
  inquiry: Inquiry;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    await navigator.clipboard.writeText(inquiry.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const isLong = inquiry.query.length > 160;

  return (
    <div className="bg-white rounded-2xl border border-bega-border-1 px-5 py-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">

        {/* Avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-bega-bg-2 flex items-center justify-center
                        text-[13px] font-semibold text-bega-text-2 select-none mt-0.5">
          {inquiry.name.charAt(0).toUpperCase()}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">

          {/* Top row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-[13.5px] font-semibold text-bega-text-1">{inquiry.name}</span>
              <span className="mx-2 text-bega-border-3">·</span>
              <button
                type="button"
                onClick={copyEmail}
                title="Copy email"
                className="text-[12.5px] text-bega-text-3 hover:text-bega-text-1 transition-colors
                           underline underline-offset-2 decoration-bega-border-2"
              >
                {inquiry.email}
              </button>
              {copied && (
                <span className="ml-2 text-[10.5px] text-emerald-600 font-medium">Copied!</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-bega-text-3">{formatDate(inquiry.createdAt)}</span>
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-lg text-bega-text-3 hover:text-red-500 hover:bg-red-50
                           transition-colors"
                title="Delete inquiry"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-3.5 h-3.5">
                  <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l.8 9h6.4l.8-9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Query text */}
          <p className={`mt-2 text-[13px] text-bega-text-2 leading-relaxed whitespace-pre-wrap
                         ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            {inquiry.query}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="mt-1 text-[11.5px] text-bega-text-3 hover:text-bega-text-1 transition-colors"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}

          {/* Reply shortcut */}
          <div className="mt-3">
            <a
              href={`mailto:${inquiry.email}?subject=Re: Your BEGA Lighting Inquiry`}
              className="inline-flex items-center gap-1.5 text-[11.5px] text-bega-text-3
                         hover:text-bega-text-1 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <path d="M1 3h14a1 1 0 011 1v7a1 1 0 01-1 1H1a1 1 0 01-1-1V4a1 1 0 011-1z" />
                <path d="M0 4l8 5 8-5" />
              </svg>
              Reply via email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Inquiry | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Debounce the search box so we don't hit the server on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const res = await fetch(`${API_URL}/api/admin/cms/inquiries?${qs.toString()}`, {
        headers: { 'X-Admin-Api-Key': ADMIN_KEY },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setInquiries(data.items);
      setTotal(data.total);
    } catch {
      setError('Failed to load inquiries. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, from, to]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`${API_URL}/api/admin/cms/inquiries/${deleteTarget.inquiryId}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Api-Key': ADMIN_KEY },
    });
    setInquiries(prev => prev.filter(i => i.inquiryId !== deleteTarget.inquiryId));
    setTotal(prev => prev - 1);
    setDeleteTarget(null);
  };

  const filtered = inquiries;

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Contact Inquiries"
        description="Visitors who requested to connect with the BEGA team from the chat interface."
        count={total}
      />

      {/* Search & filters */}
      <div className="mt-6">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, email or message…"
          filters={[
            { key: 'from', label: 'From', type: 'date' },
            { key: 'to', label: 'To', type: 'date' },
          ]}
          filterValues={{ from, to }}
          onFilterChange={(key, value) => {
            if (key === 'from') setFrom(value);
            if (key === 'to') setTo(value);
          }}
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-bega-text-3">
          <svg className="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
          Loading inquiries…
        </div>
      )}

      {!loading && error && (
        <div className="py-8 text-center">
          <p className="text-[13px] text-red-600">{error}</p>
          <button onClick={load} className="mt-3 text-[12px] text-bega-text-3 underline">Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={1.2}
               strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-bega-border-3 mb-3">
            <path d="M5 8h30a2 2 0 012 2v20a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2z" />
            <path d="M3 10l17 12L37 10" />
          </svg>
          <p className="text-[13px] text-bega-text-2 font-medium">
            {search ? 'No inquiries match your search' : 'No inquiries yet'}
          </p>
          <p className="text-[12px] text-bega-text-3 mt-1">
            {search ? 'Try a different search term.' : 'Visitor inquiries from the chat will appear here.'}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="space-y-3">
            {filtered.map(inquiry => (
              <InquiryCard
                key={inquiry.inquiryId}
                inquiry={inquiry}
                onDelete={() => setDeleteTarget(inquiry)}
              />
            ))}
          </div>
          <PaginationFooter page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete inquiry"
          message={`Remove the inquiry from ${deleteTarget.name}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
