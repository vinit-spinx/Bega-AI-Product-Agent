'use client';

import { isFlowAction, COMPARE_ACTION, GENERATE_BOM_ACTION, REQUEST_QUOTE_ACTION, CONNECT_ACTION, FIND_REP_ACTION } from '@/lib/flowActions';

interface SuggestedActionsProps {
  actions: string[];
  onSelect: (action: string) => void;
}

// One distinct icon per flow action so each next-step button reads instantly, not just as text.
function FlowIcon({ action }: { action: string }) {
  const common = { className: 'w-4 h-4 flex-shrink-0', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 } as const;
  switch (action) {
    case COMPARE_ACTION:
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18M9 7H4.5a1.5 1.5 0 00-1.5 1.5v7A1.5 1.5 0 004.5 17H9m6-14v18m0-14h4.5a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H15" />
        </svg>
      );
    case GENERATE_BOM_ACTION:
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case REQUEST_QUOTE_ACTION:
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M3 11V7a2 2 0 012-2h4l10 10-6 6L3 11z" />
        </svg>
      );
    case CONNECT_ACTION:
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
        </svg>
      );
    case FIND_REP_ACTION:
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function SuggestedActions({ actions, onSelect }: SuggestedActionsProps) {
  if (actions.length === 0) return null;

  const flowActions = actions.filter(isFlowAction);
  const plainActions = actions.filter(a => !isFlowAction(a));

  return (
    <div className="space-y-3">
      {/* ── Flow actions — the only clickable suggestions, styled to be noticed ── */}
      {flowActions.length > 0 && (
        <div className="space-y-1.5">
          {flowActions.map(action => (
            <button
              key={action}
              type="button"
              data-tour={action === GENERATE_BOM_ACTION ? 'generate-bom-btn' : undefined}
              onClick={() => onSelect(action)}
              className="w-full flex items-center gap-2.5 text-sm font-semibold text-white
                         bg-gradient-to-r from-bega-black to-bega-text-2 hover:to-bega-black
                         rounded-md px-4 py-2.5 shadow-button transition-all duration-150
                         hover:shadow-lg hover:-translate-y-px cursor-pointer text-left"
            >
              <FlowIcon action={action} />
              <span className="flex-1">{action}</span>
              <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* ── Plain suggestions — informational only, not interactive ── */}
      {plainActions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bega-text-3 mb-1.5">
            What else you can ask
          </p>
          <div className="space-y-1">
            {plainActions.map(action => (
              <p key={action} className="flex items-baseline gap-2 text-sm text-bega-text-2">
                <span className="text-bega-border-3 text-xs flex-shrink-0">›</span>
                {action}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
