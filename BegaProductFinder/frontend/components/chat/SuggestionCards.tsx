'use client';

const SUGGESTIONS = [
  'Find bollard lights with Dark Sky compliance',
  'Recommend lighting for a 5-star hotel entrance',
  'Find DALI-compatible exterior luminaires',
  'Suggest lighting for a luxurious garden at night',
] as const;

interface Props {
  onSend: (message: string) => void;
}

export default function SuggestionCards({ onSend }: Props) {
  return (
    <div
      className="flex flex-wrap justify-center gap-2 mt-5 animate-fade-in"
      style={{ animationDelay: '360ms' }}
    >
      {SUGGESTIONS.map((label, idx) => (
        <button
          key={label}
          onClick={() => onSend(label)}
          style={{ animationDelay: `${380 + idx * 45}ms` }}
          className="animate-fade-in px-4 py-2 rounded-full border border-bega-border-2
                     bg-white text-[12px] text-bega-text-2
                     hover:border-bega-border-3 hover:text-bega-text-1 hover:shadow-card
                     transition-all duration-200 whitespace-nowrap"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
