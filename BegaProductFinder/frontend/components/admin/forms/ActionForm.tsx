'use client';

import { useState, useEffect } from 'react';
import type { AdminAction, ActionIconName } from '@/types/admin';

const ICONS: { name: ActionIconName; label: string; svg: React.ReactNode }[] = [
  {
    name: 'compare', label: 'Compare',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="5" width="7" height="11" rx="1.5" /><rect x="11" y="4" width="7" height="11" rx="1.5" /><path d="M4 8.5h3M4 11h2M13 7.5h3M13 10h3M13 12.5h2" /></svg>,
  },
  {
    name: 'shield', label: 'Shield',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10 2L3.5 5v5c0 3.8 2.9 6.6 6.5 7.8C13.6 16.6 16.5 13.8 16.5 10V5L10 2z" /><path d="M7 10l2 2 4-4" /></svg>,
  },
  {
    name: 'building', label: 'Building',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 18V7l7-4 7 4v11" /><path d="M3 18h14" /><rect x="8" y="12" width="4" height="6" /><path d="M7 9h1M12 9h1M7 12h1M12 12h1" /></svg>,
  },
  {
    name: 'star', label: 'Star',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10 2l2.2 4.8 5.3.8-3.8 3.7.9 5.3L10 14.1l-4.6 2.5.9-5.3L2.5 7.6l5.3-.8L10 2z" /></svg>,
  },
  {
    name: 'controls', label: 'Controls',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 5h14M3 10h14M3 15h14" /><circle cx="7" cy="5" r="2" fill="white" /><circle cx="13" cy="10" r="2" fill="white" /><circle cx="9" cy="15" r="2" fill="white" /></svg>,
  },
  {
    name: 'city', label: 'City',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="1" y="9" width="6" height="9" /><rect x="7" y="6" width="6" height="12" /><rect x="13" y="11" width="6" height="7" /><path d="M1 18h18" /></svg>,
  },
  {
    name: 'leaf', label: 'Leaf',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 3s-3 0-8 5c-3 3-4.5 7-4.5 7s4.5-.5 7.5-4 5-8 5-8z" /><path d="M3 17c3-2.5 4.5-7 4.5-7" /></svg>,
  },
  {
    name: 'document', label: 'Document',
    svg: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M12 2v4h4" /><path d="M7 10h6M7 13h4" /></svg>,
  },
];

const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-bega-border-2 text-[13px] text-bega-text-1 bg-white placeholder:text-bega-text-3 focus:outline-none focus:ring-2 focus:ring-bega-black/10 focus:border-bega-black/40 transition-colors';
const LABEL = 'block text-[11px] font-semibold text-bega-text-2 uppercase tracking-wider mb-1.5';

interface Props {
  action: AdminAction | null;
  onSave: (data: Omit<AdminAction, 'id'>) => Promise<void>;
  onClose: () => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200
                  ${checked ? 'bg-bega-black' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transform transition-transform duration-200
                    ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

export default function ActionForm({ action, onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<AdminAction, 'id'>>({
    title: '',
    description: '',
    prompt: '',
    icon: 'compare',
    isActive: true,
    isFeatured: false,
    sortOrder: 1,
  });

  useEffect(() => {
    if (action) {
      const { id: _id, ...rest } = action;
      setForm(rest);
    }
  }, [action]);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.prompt.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const isEdit = action !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-bega-border-1 flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold text-bega-text-1">
              {isEdit ? 'Edit Action' : 'Create Action'}
            </h2>
            <p className="text-[12px] text-bega-text-3 mt-0.5">
              {isEdit ? 'Update this AI workflow action.' : 'Add a new AI workflow action to the sidebar.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-bega-text-3 hover:text-bega-text-1 hover:bg-bega-bg-1 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form id="action-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className={LABEL}>Title <span className="text-red-500">*</span></label>
            <input
              className={INPUT}
              placeholder="e.g. Fixture Comparison"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={LABEL}>Description</label>
            <input
              className={INPUT}
              placeholder="Short description shown on the action card"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Prompt */}
          <div>
            <label className={LABEL}>AI Prompt <span className="text-red-500">*</span></label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={5}
              placeholder="Full prompt sent to the AI when this action is clicked…"
              value={form.prompt}
              onChange={e => set('prompt', e.target.value)}
              required
            />
            <p className="text-[11px] text-bega-text-3 mt-1">
              This is the exact text sent to the AI. End with a directive like "Do not ask clarifying questions — present results immediately."
            </p>
          </div>

          {/* Icon */}
          <div>
            <label className={LABEL}>Icon</label>
            <div className="grid grid-cols-8 gap-2">
              {ICONS.map(icon => (
                <button
                  key={icon.name}
                  type="button"
                  title={icon.label}
                  onClick={() => set('icon', icon.name)}
                  className={`aspect-square flex items-center justify-center rounded-xl border transition-all
                              ${form.icon === icon.name
                                ? 'bg-bega-black text-white border-bega-black'
                                : 'bg-bega-bg-1 text-bega-text-3 border-bega-border-1 hover:border-bega-border-3 hover:text-bega-text-1'
                              }`}
                >
                  {icon.svg}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className={LABEL}>Sort Order</label>
            <input
              type="number"
              min={1}
              className={`${INPUT} w-28`}
              value={form.sortOrder}
              onChange={e => set('sortOrder', parseInt(e.target.value, 10) || 1)}
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-bega-border-1 bg-bega-bg-1">
              <div>
                <p className="text-[12px] font-medium text-bega-text-1">Active</p>
                <p className="text-[10.5px] text-bega-text-3">Visible in the sidebar</p>
              </div>
              <Toggle checked={form.isActive} onChange={v => set('isActive', v)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-bega-border-1 bg-bega-bg-1">
              <div>
                <p className="text-[12px] font-medium text-bega-text-1">Featured</p>
                <p className="text-[10.5px] text-bega-text-3">Show in Featured section</p>
              </div>
              <Toggle checked={form.isFeatured} onChange={v => set('isFeatured', v)} />
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-bega-border-1 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-bega-border-2 text-[13px] font-medium text-bega-text-2 hover:bg-bega-bg-1 transition-colors"
          >
            Cancel
          </button>
          <button
            form="action-form"
            type="submit"
            disabled={saving || !form.title.trim() || !form.prompt.trim()}
            className="px-5 py-2.5 bg-bega-black text-white text-[13px] font-medium rounded-xl
                       hover:bg-bega-black/85 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all active:scale-[0.98]"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Action'}
          </button>
        </div>
      </div>
    </div>
  );
}
