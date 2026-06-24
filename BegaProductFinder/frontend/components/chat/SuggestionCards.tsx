'use client';

import { useActiveSuggestions } from '@/hooks/useAdminStore';

interface Props {
  onSend: (message: string) => void;
  /** Use the short, no-extra-delay entrance instead of the long fixed-delay one
   * tuned for an already-loaded chat session. Suggestions come from a CMS fetch
   * (see useActiveSuggestions), so this component mounts late — only once that
   * fetch resolves — regardless of context. In the /new-ui hero that's often
   * after the light/title have already finished their own reveal, so a long
   * up-front delay just makes the cards sit invisible even longer and then pop
   * in; a short stagger starting immediately on mount keeps it feeling like one
   * continuous animation no matter when the data actually arrives. */
  syncWithParent?: boolean;
}

export default function SuggestionCards({ onSend, syncWithParent = false }: Props) {
  const suggestions = useActiveSuggestions();

  if (suggestions.length === 0) return null;

  return (
    <div
      className="flex flex-wrap justify-center gap-2 mt-5 animate-fade-in"
      style={syncWithParent ? undefined : { animationDelay: '360ms' }}
    >
      {suggestions.map((s, idx) => (
        <button
          key={s.id}
          onClick={() => onSend(s.text)}
          style={{ animationDelay: syncWithParent ? `${idx * 45}ms` : `${380 + idx * 45}ms` }}
          className="animate-fade-in px-4 py-2 rounded-full border border-bega-border-2
                     bg-white text-[12px] text-bega-text-2
                     hover:border-bega-border-3 hover:text-bega-text-1 hover:shadow-card
                     transition-all duration-200 whitespace-nowrap"
        >
          {s.text}
        </button>
      ))}
    </div>
  );
}
