interface EmptyStateProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export default function EmptyState({
  title = 'No data available',
  description = 'Data will appear here once the AI assistant starts receiving queries.',
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}>
      <div className="w-10 h-10 rounded-xl bg-bega-bg-1 flex items-center justify-center mb-3">
        <svg viewBox="0 0 20 20" fill="none" stroke="#C8C4BE" strokeWidth={1.4} strokeLinecap="round" className="w-5 h-5">
          <path d="M3 15l4-8 4 4 3-5 3 4" />
          <path d="M3 17h14" />
        </svg>
      </div>
      <p className="text-[13px] font-medium text-bega-text-2 mb-1">{title}</p>
      {!compact && <p className="text-[12px] text-bega-text-3 max-w-xs leading-relaxed">{description}</p>}
    </div>
  );
}
