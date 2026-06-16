interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  count?: number;
}

export default function PageHeader({ title, description, action, count }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[22px] font-semibold text-bega-text-1 tracking-tight">{title}</h1>
          {count !== undefined && (
            <span className="text-[11px] font-semibold text-bega-text-3 bg-bega-bg-2 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[13px] text-bega-text-3 leading-relaxed max-w-xl">{description}</p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-bega-black text-white text-[13px] font-medium
                     rounded-xl hover:bg-bega-black/85 active:scale-[0.98] transition-all duration-150
                     flex-shrink-0 shadow-sm"
        >
          {action.icon ?? (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}
                 strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M8 3v10M3 8h10" />
            </svg>
          )}
          {action.label}
        </button>
      )}
    </div>
  );
}
