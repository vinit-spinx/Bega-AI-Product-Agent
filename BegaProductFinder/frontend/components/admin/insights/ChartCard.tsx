interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function ChartCard({ title, description, children, action, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-bega-border-1 p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[13px] font-semibold text-bega-text-1">{title}</p>
          {description && <p className="text-[11px] text-bega-text-3 mt-0.5">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
