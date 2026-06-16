type Variant = 'active' | 'inactive' | 'featured' | 'phase2';

interface Props {
  variant: Variant;
  label?: string;
}

const STYLES: Record<Variant, string> = {
  active:   'bg-emerald-50 text-emerald-700 border border-emerald-100',
  inactive: 'bg-gray-100 text-gray-500 border border-gray-200',
  featured: 'bg-amber-50 text-amber-700 border border-amber-100',
  phase2:   'bg-bega-bg-2 text-bega-text-3 border border-bega-border-1',
};

const DEFAULT_LABELS: Record<Variant, string> = {
  active:   'Active',
  inactive: 'Inactive',
  featured: 'Featured',
  phase2:   'Phase 2',
};

export default function StatusBadge({ variant, label }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold
                      tracking-wide flex-shrink-0 ${STYLES[variant]}`}>
      {label ?? DEFAULT_LABELS[variant]}
    </span>
  );
}
