'use client';

import { useState, useEffect } from 'react';
import type { AdminSuggestion } from '@/types/admin';

const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-bega-border-2 text-[13px] text-bega-text-1 bg-white placeholder:text-bega-text-3 focus:outline-none focus:ring-2 focus:ring-bega-black/10 focus:border-bega-black/40 transition-colors resize-none';
const LABEL = 'block text-[11px] font-semibold text-bega-text-2 uppercase tracking-wider mb-1.5';

interface Props {
  suggestion: AdminSuggestion | null;
  defaultSortOrder?: number;
  onSave: (data: Omit<AdminSuggestion, 'id'>) => Promise<void>;
  onClose: () => void;
}

export default function SuggestionForm({ suggestion, defaultSortOrder = 1, onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);

  useEffect(() => {
    if (suggestion) {
      setText(suggestion.text);
      setIsActive(suggestion.isActive);
      setSortOrder(suggestion.sortOrder);
    } else {
      setSortOrder(defaultSortOrder);
    }
  }, [suggestion, defaultSortOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onSave({ text: text.trim(), isActive, sortOrder });
    } finally {
      setSaving(false);
    }
  };

  const isEdit = suggestion !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-bega-border-1">
          <div>
            <h2 className="text-[16px] font-semibold text-bega-text-1">
              {isEdit ? 'Edit Suggestion' : 'Add Suggestion'}
            </h2>
            <p className="text-[12px] text-bega-text-3 mt-0.5">
              Chat suggestions appear below the search bar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-bega-text-3 hover:bg-bega-bg-1 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Text */}
          <div>
            <label className={LABEL}>Suggestion Text <span className="text-red-500">*</span></label>
            <textarea
              className={INPUT}
              rows={3}
              placeholder="e.g. Recommend lighting for a luxury hotel entrance"
              value={text}
              onChange={e => setText(e.target.value)}
              required
              autoFocus
            />
            <p className="text-[11px] text-bega-text-3 mt-1">
              {text.length} characters — keep it concise and action-oriented.
            </p>
          </div>

          {/* Sort order */}
          <div>
            <label className={LABEL}>Sort Order</label>
            <input
              type="number"
              min={1}
              className={`${INPUT} w-24`}
              value={sortOrder}
              onChange={e => setSortOrder(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bega-bg-1 border border-bega-border-1">
            <div>
              <p className="text-[12px] font-medium text-bega-text-1">Active</p>
              <p className="text-[10.5px] text-bega-text-3">Show this suggestion in the chat UI</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(v => !v)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors
                          ${isActive ? 'bg-bega-black' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transform transition-transform
                                ${isActive ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bega-border-2 text-[13px] font-medium text-bega-text-2 hover:bg-bega-bg-1 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !text.trim()}
              className="flex-1 py-2.5 bg-bega-black text-white text-[13px] font-medium rounded-xl
                         hover:bg-bega-black/85 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Suggestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
