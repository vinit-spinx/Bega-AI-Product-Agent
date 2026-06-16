'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import ActionForm from '@/components/admin/forms/ActionForm';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  fetchAdminActions,
  createAdminAction,
  updateAdminAction,
  deleteAdminAction,
  reorderAdminActions,
} from '@/services/admin/aiActionsAdminService';
import type { AdminAction, ActionIconName } from '@/types/admin';

// ── Inline icon renderer (mirrors ActionCard icons) ───────────────────────────
function ActionIcon({ name }: { name: ActionIconName }) {
  const icons: Record<ActionIconName, React.ReactNode> = {
    compare:  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="2" y="5" width="7" height="11" rx="1.5" /><rect x="11" y="4" width="7" height="11" rx="1.5" /></svg>,
    shield:   <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M10 2L3.5 5v5c0 3.8 2.9 6.6 6.5 7.8C13.6 16.6 16.5 13.8 16.5 10V5L10 2z" /></svg>,
    building: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 18V7l7-4 7 4v11M3 18h14" /></svg>,
    star:     <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M10 2l2.2 4.8 5.3.8-3.8 3.7.9 5.3L10 14.1l-4.6 2.5.9-5.3L2.5 7.6l5.3-.8L10 2z" /></svg>,
    controls: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 5h14M3 10h14M3 15h14" /></svg>,
    city:     <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="1" y="9" width="6" height="9" /><rect x="7" y="6" width="6" height="12" /><rect x="13" y="11" width="6" height="7" /></svg>,
    leaf:     <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M17 3s-3 0-8 5c-3 3-4.5 7-4.5 7s4.5-.5 7.5-4 5-8 5-8z" /></svg>,
    document: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" /></svg>,
  };
  return <>{icons[name]}</>;
}

// ── Row component ─────────────────────────────────────────────────────────────
interface RowProps {
  action: AdminAction;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ActionRow({ action, isFirst, isLast, onEdit, onDelete, onToggle, onMoveUp, onMoveDown }: RowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border border-bega-border-1 overflow-hidden
                     transition-shadow hover:shadow-sm ${!action.isActive ? 'opacity-60' : ''}`}>
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Sort controls */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 rounded text-bega-text-3 hover:text-bega-text-1 hover:bg-bega-bg-1
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-3 h-3">
              <path d="M2 8l4-4 4 4" />
            </svg>
          </button>
          <span className="text-[10px] font-bold text-bega-text-3 text-center w-5 leading-none">{action.sortOrder}</span>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 rounded text-bega-text-3 hover:text-bega-text-1 hover:bg-bega-bg-1
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-3 h-3">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
        </div>

        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-bega-bg-1 flex items-center justify-center text-bega-text-3 flex-shrink-0">
          <ActionIcon name={action.icon} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-semibold text-bega-text-1 truncate">{action.title}</span>
            <StatusBadge variant={action.isActive ? 'active' : 'inactive'} />
            {action.isFeatured && <StatusBadge variant="featured" />}
          </div>
          <p className="text-[12px] text-bega-text-3 truncate">{action.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            title="View prompt"
            className="p-2 rounded-lg text-bega-text-3 hover:text-bega-text-1 hover:bg-bega-bg-1 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-3.5 h-3.5">
              <path d={expanded ? 'M2 10l6-6 6 6' : 'M2 6l6 6 6-6'} />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            title={action.isActive ? 'Deactivate' : 'Activate'}
            className="p-2 rounded-lg text-bega-text-3 hover:text-bega-text-1 hover:bg-bega-bg-1 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-3.5 h-3.5">
              {action.isActive
                ? <path d="M10 8a2 2 0 11-4 0 2 2 0 014 0zM3 8a5 5 0 1010 0A5 5 0 003 8z" />
                : <><path d="M2 2l12 12" /><path d="M10 8a2 2 0 11-4 0" /><path d="M3 8a5 5 0 0010 0" /></>
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

      {/* Expanded prompt */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-bega-border-1 pt-3 bg-bega-bg-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-bega-text-3 mb-1.5">AI Prompt</p>
          <p className="text-[12px] text-bega-text-2 leading-relaxed whitespace-pre-wrap">{action.prompt}</p>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-bega-border-1 px-5 py-4 flex items-center gap-4 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-bega-bg-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-3 bg-bega-bg-2 rounded w-1/4 mb-2" />
        <div className="h-2.5 bg-bega-bg-2 rounded w-2/5" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AiActionsPage() {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<AdminAction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setActions(await fetchAdminActions());
    } catch {
      setError('Failed to load actions. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Omit<AdminAction, 'id'>) => {
    if (editingAction) {
      const updated = await updateAdminAction(editingAction.id, data);
      setActions(prev => prev.map(a => a.id === updated.id ? updated : a).sort((a, b) => a.sortOrder - b.sortOrder));
    } else {
      const created = await createAdminAction({ ...data, sortOrder: actions.length + 1 });
      setActions(prev => [...prev, created]);
    }
    setFormOpen(false);
    setEditingAction(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteAdminAction(deleteTarget.id);
    setActions(prev => prev.filter(a => a.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleToggle = async (action: AdminAction) => {
    const updated = await updateAdminAction(action.id, { ...action, isActive: !action.isActive });
    setActions(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const reordered = [...actions];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    [reordered[index], reordered[swapIdx]] = [reordered[swapIdx], reordered[index]];
    const updated = reordered.map((a, i) => ({ ...a, sortOrder: i + 1 }));
    setActions(updated);
    await reorderAdminActions(updated.map(a => a.id));
  };

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="AI Actions"
        description="Manage AI workflow actions displayed in the Action Center sidebar at /chat/sidebar."
        count={actions.length}
        action={{
          label: 'Add Action',
          onClick: () => { setEditingAction(null); setFormOpen(true); },
        }}
      />

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2.5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)
          : actions.length === 0
            ? (
              <div className="text-center py-16 text-bega-text-3">
                <p className="text-[15px] font-medium mb-1">No actions yet</p>
                <p className="text-[13px]">Click Add Action to create the first workflow action.</p>
              </div>
            )
            : actions.map((action, index) => (
              <ActionRow
                key={action.id}
                action={action}
                isFirst={index === 0}
                isLast={index === actions.length - 1}
                onEdit={() => { setEditingAction(action); setFormOpen(true); }}
                onDelete={() => setDeleteTarget(action)}
                onToggle={() => handleToggle(action)}
                onMoveUp={() => handleMove(index, 'up')}
                onMoveDown={() => handleMove(index, 'down')}
              />
            ))
        }
      </div>

      {formOpen && (
        <ActionForm
          action={editingAction}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingAction(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Action"
          message={`"${deleteTarget.title}" will be permanently removed from the Action Center.`}
          confirmLabel="Delete Action"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
