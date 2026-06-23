'use client';

import { useState, useEffect, useRef } from 'react';

// Shared sub-components for multi-step contact forms in chat — used by both
// NextStepsPanel.tsx ("Connect with BEGA Team") and RequestQuoteDrawer.tsx ("Request a Quote").

export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <span
          key={n}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            n === current ? 'bg-bega-black' : n < current ? 'bg-bega-black/40' : 'bg-bega-border-2'
          }`}
        />
      ))}
    </div>
  );
}

export function FormStep({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-bega-text-1 text-sm font-medium leading-tight">{label}</p>
        <p className="text-bega-text-3 text-[11px] mt-0.5">{hint}</p>
      </div>
      {children}
    </div>
  );
}

export function FormActions({
  onBack,
  onNext,
  nextLabel,
  nextDisabled = false,
  nextPrimary = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextPrimary?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-1">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="text-bega-text-3 hover:text-bega-text-2 text-xs transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`px-4 py-2 rounded-md text-xs font-medium transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${nextPrimary
            ? 'bg-bega-black text-white hover:bg-bega-text-2 shadow-button'
            : 'border border-bega-black/50 bg-bega-black/5 text-bega-black hover:bg-bega-black/10 hover:border-bega-black'
          }`}
      >
        {nextLabel}
      </button>
    </div>
  );
}

const FIELD_CLASS =
  'w-full bg-bega-bg-1 border border-bega-border-2 rounded-md px-3 py-2.5 ' +
  'text-bega-text-1 text-sm placeholder-bega-text-3 ' +
  'focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20 ' +
  'hover:border-bega-border-3 disabled:opacity-50 transition-colors';

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  type = 'text',
  onEnter,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
  type?: 'text' | 'email' | 'tel';
  onEnter?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="text-bega-text-2 text-[11px] font-medium mb-1 block">
        {label} {optional && <span className="text-bega-text-3">(optional)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={FIELD_CLASS}
      />
    </div>
  );
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
  countryCode: string | null;
}

/** Location field with live OpenStreetMap (Nominatim) suggestions — falls back to plain free text if nothing is selected. */
export function LocationAutocompleteField({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: GeocodeResult | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json().catch(() => []);
        setSuggestions(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePick = (s: GeocodeResult) => {
    onChange(s.displayName);
    onSelect(s);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-bega-text-2 text-[11px] font-medium mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); onSelect(null); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={FIELD_CLASS}
      />
      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-bega-border-2 rounded-md shadow-lg
                         max-h-56 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-2.5 text-[12px] text-bega-text-3">Searching…</p>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePick(s)}
                className="w-full text-left px-3 py-2.5 text-[12px] text-bega-text-1 hover:bg-bega-bg-1
                           transition-colors border-b border-bega-border-1 last:border-b-0"
              >
                {s.displayName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optional?: boolean;
}) {
  return (
    <div>
      <label className="text-bega-text-2 text-[11px] font-medium mb-1 block">
        {label} {optional && <span className="text-bega-text-3">(optional)</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${FIELD_CLASS} appearance-none cursor-pointer`}
      >
        <option value="">Select…</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  rows = 3,
  autoFocus = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
  rows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-bega-text-2 text-[11px] font-medium mb-1 block">
        {label} {optional && <span className="text-bega-text-3">(optional)</span>}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        disabled={disabled}
        className={`${FIELD_CLASS} resize-none`}
      />
    </div>
  );
}

export function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-600 text-[11px] flex items-center gap-1.5">
      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  );
}
