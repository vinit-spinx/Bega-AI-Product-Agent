'use client';

import { useEffect } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  danger = true,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4
                        ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
          <svg viewBox="0 0 20 20" fill="none" stroke={danger ? '#DC2626' : '#D97706'}
               strokeWidth={1.6} strokeLinecap="round" className="w-5 h-5">
            <path d="M10 7v4M10 13.5h.01" />
            <path d="M10 2L1.5 17h17L10 2z" />
          </svg>
        </div>

        <h2 className="text-[16px] font-semibold text-bega-text-1 mb-2">{title}</h2>
        <p className="text-[13px] text-bega-text-3 leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-bega-border-2 text-[13px] font-medium
                       text-bega-text-2 hover:bg-bega-bg-1 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium text-white transition-colors
                        ${danger
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-bega-black hover:bg-bega-black/85'
                        }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
