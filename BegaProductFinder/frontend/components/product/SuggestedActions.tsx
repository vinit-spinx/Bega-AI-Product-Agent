'use client';

interface SuggestedActionsProps {
  actions: string[];
  onSelect: (action: string) => void;
}

export default function SuggestedActions({ actions }: SuggestedActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bega-text-3 mb-2">
        What else do you want 
      </p>
      <div className="space-y-1">
        {actions.map(action => (
          <div key={action} className="flex items-baseline gap-2 text-sm text-bega-text-2">
            <span className="text-bega-border-3 text-xs flex-shrink-0">›</span>
            {action}
          </div>
        ))}
      </div>
    </div>
  );
}
