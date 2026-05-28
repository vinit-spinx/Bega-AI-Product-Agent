'use client';

interface SuggestedActionsProps {
  actions: string[];
  onSelect: (action: string) => void;
}

export default function SuggestedActions({ actions, onSelect }: SuggestedActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map(action => (
        <button
          key={action}
          onClick={() => onSelect(action)}
          className="rounded-full border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20
                     text-amber-300 hover:text-amber-200 text-xs px-3 py-1.5
                     transition-colors cursor-pointer"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
