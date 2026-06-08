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
          className="rounded-full border border-bega-border-2 bg-white
                     hover:bg-bega-bg-1 hover:border-bega-black/50
                     text-bega-text-2 hover:text-bega-black
                     text-xs px-3.5 py-1.5 transition-all duration-150 cursor-pointer shadow-button"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
