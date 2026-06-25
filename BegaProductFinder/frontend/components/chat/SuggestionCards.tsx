'use client';

import { useActiveSuggestions } from '@/hooks/useAdminStore';
import { trackEvent } from '@/services/insights/analyticsTracker';

interface Props {
  onSend: (message: string) => void;
}

export default function SuggestionCards({ onSend }: Props) {
  const suggestions = useActiveSuggestions();

  if (suggestions.length === 0) return null;

  return (
    <div
      className="flex flex-wrap justify-center gap-2 mt-5 animate-fade-in"
      style={{ animationDelay: '360ms' }}
    >
      {suggestions.map((s, idx) => (
        <button
          key={s.id}
          onClick={() => { trackEvent('suggestion_click', s.text); onSend(s.text); }}
          style={{ animationDelay: `${380 + idx * 45}ms` }}
          className="animate-fade-in px-4 py-2 rounded-full border border-bega-border-2
                     bg-white text-[12px] font-medium uppercase tracking-wide text-bega-text-2
                     hover:border-bega-black hover:text-bega-text-1 hover:shadow-card
                     transition-all duration-200 whitespace-nowrap"
        >
          {s.text}
        </button>
      ))}
    </div>
  );
}
