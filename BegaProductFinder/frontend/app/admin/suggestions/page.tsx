'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import SuggestionForm from '@/components/admin/forms/SuggestionForm';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  fetchAdminSuggestions,
  createAdminSuggestion,
  updateAdminSuggestion,
  deleteAdminSuggestion,
  saveAdminSuggestionOrder,
} from '@/services/admin/suggestionsAdminService';
import type { AdminSuggestion } from '@/types/admin';

// ── Drag-and-drop sortable item ───────────────────────────────────────────────
interface ItemProps {
  suggestion: AdminSuggestion;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function SuggestionItem({
  suggestion, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onEdit, onDelete, onToggle,
}: ItemProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-2xl border transition-all duration-150 select-none
                  ${isDragOver
                    ? 'border-bega-black shadow-md -translate-y-0.5'
                    : 'border-bega-border-1 hover:shadow-sm'
                  }
                  ${!suggestion.isActive ? 'opacity-55' : ''}`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Drag handle */}
        <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-bega-text-3 hover:text-bega-text-2 transition-colors px-1">
          <svg viewBox="0 0 16 20" fill="currentColor" className="w-3 h-4">
            <circle cx="5" cy="4"  r="1.5" /><circle cx="11" cy="4"  r="1.5" />
            <circle cx="5" cy="10" r="1.5" /><circle cx="11" cy="10" r="1.5" />
            <circle cx="5" cy="16" r="1.5" /><circle cx="11" cy="16" r="1.5" />
          </svg>
        </div>

        {/* Sort order */}
        <span className="text-[10px] font-bold text-bega-text-3 w-5 text-center flex-shrink-0">
          {suggestion.sortOrder}
        </span>

        {/* Text */}
        <p className="flex-1 text-[13px] text-bega-text-1 leading-snug min-w-0">
          {suggestion.text}
        </p>

        {/* Status */}
        <StatusBadge variant={suggestion.isActive ? 'active' : 'inactive'} />

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onToggle}
            title={suggestion.isActive ? 'Deactivate' : 'Activate'}
            className="p-2 rounded-lg text-bega-text-3 hover:text-bega-text-1 hover:bg-bega-bg-1 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-3.5 h-3.5">
              <circle cx="8" cy="8" r="5.5" />
              {suggestion.isActive
                ? <path d="M6 8l1.5 1.5L10 6" />
                : <path d="M6 6l4 4M10 6l-4 4" />
              }
            </svg>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-lg text-bega-text-3 hover:text-bega-text-1 hover:bg-bega-bg-1 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M11.5 2.5l2 2-9 9H2.5v-2l9-9z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg text-bega-text-3 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-bega-border-1 px-4 py-3.5 flex items-center gap-3 animate-pulse">
      <div className="w-3 h-4 bg-bega-bg-2 rounded flex-shrink-0" />
      <div className="flex-1 h-3 bg-bega-bg-2 rounded" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminSuggestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSuggestion | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSuggestions(await fetchAdminSuggestions());
    } catch {
      setError('Failed to load suggestions. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Persist reordered list (debounced)
  const persistOrder = useCallback((items: AdminSuggestion[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveAdminSuggestionOrder(items).catch(console.error);
    }, 600);
  }, []);

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const reordered = [...suggestions];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    const updated = reordered.map((s, i) => ({ ...s, sortOrder: i + 1 }));
    setSuggestions(updated);
    persistOrder(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async (data: Omit<AdminSuggestion, 'id'>) => {
    if (editingItem) {
      const updated = await updateAdminSuggestion(editingItem.id, data);
      setSuggestions(prev => prev.map(s => s.id === updated.id ? updated : s));
    } else {
      const created = await createAdminSuggestion({ ...data, sortOrder: suggestions.length + 1 });
      setSuggestions(prev => [...prev, created]);
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteAdminSuggestion(deleteTarget.id);
    const remaining = suggestions
      .filter(s => s.id !== deleteTarget.id)
      .map((s, i) => ({ ...s, sortOrder: i + 1 }));
    setSuggestions(remaining);
    setDeleteTarget(null);
  };

  const handleToggle = async (item: AdminSuggestion) => {
    const updated = await updateAdminSuggestion(item.id, { ...item, isActive: !item.isActive });
    setSuggestions(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Suggestions"
        description="Chat suggestions shown below the search bar. Drag to reorder — the order updates automatically."
        count={suggestions.length}
        action={{
          label: 'Add Suggestion',
          onClick: () => { setEditingItem(null); setFormOpen(true); },
        }}
      />

      {/* Drag hint */}
      {suggestions.length > 1 && (
        <div className="flex items-center gap-2 mb-5 text-[11.5px] text-bega-text-3">
          <svg viewBox="0 0 16 20" fill="currentColor" className="w-2.5 h-3.5 opacity-60">
            <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="10" r="1.5" /><circle cx="11" cy="10" r="1.5" />
            <circle cx="5" cy="16" r="1.5" /><circle cx="11" cy="16" r="1.5" />
          </svg>
          Drag the handle to reorder suggestions
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
          : suggestions.length === 0
            ? (
              <div className="text-center py-16 text-bega-text-3">
                <p className="text-[15px] font-medium mb-1">No suggestions yet</p>
                <p className="text-[13px]">Click Add Suggestion to create the first one.</p>
              </div>
            )
            : suggestions.map((s, index) => (
              <SuggestionItem
                key={s.id}
                suggestion={s}
                isDragOver={dragOverIndex === index}
                onDragStart={() => setDragIndex(index)}
                onDragOver={e => { e.preventDefault(); setDragOverIndex(index); }}
                onDrop={e => { e.preventDefault(); handleDrop(index); }}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                onEdit={() => { setEditingItem(s); setFormOpen(true); }}
                onDelete={() => setDeleteTarget(s)}
                onToggle={() => handleToggle(s)}
              />
            ))
        }
      </div>

      {formOpen && (
        <SuggestionForm
          suggestion={editingItem}
          defaultSortOrder={suggestions.length + 1}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingItem(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Suggestion"
          message={`"${deleteTarget.text}" will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
