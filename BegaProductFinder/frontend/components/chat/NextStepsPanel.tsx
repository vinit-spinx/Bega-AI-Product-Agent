'use client';

import { useState } from 'react';

interface NextStepsPanelProps {
  sessionId: string;
}

type PanelState =
  | 'idle'
  | 'form-name'
  | 'form-email'
  | 'form-query'
  | 'submitting'
  | 'success'
  | 'hidden';

export default function NextStepsPanel({ sessionId }: NextStepsPanelProps) {
  const [state, setState] = useState<PanelState>('idle');
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleNextName = () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setError('');
    setState('form-email');
  };

  const handleNextEmail = () => {
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setError('');
    setState('form-query');
  };

  const handleSubmit = async () => {
    if (!query.trim()) { setError('Please describe your project or question.'); return; }
    setError('');
    setState('submitting');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, name: name.trim(), email: email.trim(), query: query.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('form-query');
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  if (state === 'hidden') return null;

  return (
    <div className="ml-10 mt-3">
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/50 overflow-hidden">

        {/* ── Success ──────────────────────────────────────────────────────── */}
        {state === 'success' && (
          <div className="px-5 py-5 flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30
                            flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-zinc-100 text-sm font-semibold leading-tight">
                Your inquiry has been received!
              </p>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                A BEGA representative will be in touch at <span className="text-amber-400">{email}</span> shortly.
                You can continue searching below.
              </p>
            </div>
          </div>
        )}

        {/* ── Idle — two buttons ───────────────────────────────────────────── */}
        {state === 'idle' && (
          <div className="px-5 py-4">
            <p className="text-zinc-300 text-xs font-medium mb-3 uppercase tracking-wider">
              Ready to move forward?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setState('hidden')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium
                           border border-zinc-600 bg-zinc-700/60 text-zinc-200
                           hover:bg-zinc-700 hover:border-zinc-500 hover:text-zinc-100
                           transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Continue Search
              </button>
              <button
                onClick={() => setState('form-name')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium
                           border border-amber-500/60 bg-amber-500/15 text-amber-300
                           hover:bg-amber-500/25 hover:border-amber-400 hover:text-amber-200
                           transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                Connect with BEGA Team
              </button>
            </div>
          </div>
        )}

        {/* ── Contact form steps ───────────────────────────────────────────── */}
        {(state === 'form-name' || state === 'form-email' || state === 'form-query' || state === 'submitting') && (
          <div className="px-5 py-4">
            {/* Header + step indicator */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">
                Connect with BEGA Team
              </p>
              <StepDots current={state === 'form-name' ? 1 : state === 'form-email' ? 2 : 3} />
            </div>

            {/* Step 1 — Name */}
            {state === 'form-name' && (
              <FormStep
                label="What's your name?"
                hint="Step 1 of 3"
              >
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNextName()}
                  placeholder="Your full name"
                  autoFocus
                  className="w-full bg-zinc-900 border border-zinc-600 rounded-xl px-3 py-2.5
                             text-zinc-100 text-sm placeholder-zinc-500
                             focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30
                             transition-colors"
                />
                {error && <ErrorMsg msg={error} />}
                <FormActions onNext={handleNextName} nextLabel="Next →" />
              </FormStep>
            )}

            {/* Step 2 — Email */}
            {state === 'form-email' && (
              <FormStep
                label="What's your email address?"
                hint="Step 2 of 3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNextEmail()}
                  placeholder="you@company.com"
                  autoFocus
                  className="w-full bg-zinc-900 border border-zinc-600 rounded-xl px-3 py-2.5
                             text-zinc-100 text-sm placeholder-zinc-500
                             focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30
                             transition-colors"
                />
                {error && <ErrorMsg msg={error} />}
                <FormActions onBack={() => { setError(''); setState('form-name'); }} onNext={handleNextEmail} nextLabel="Next →" />
              </FormStep>
            )}

            {/* Step 3 — Query */}
            {(state === 'form-query' || state === 'submitting') && (
              <FormStep
                label="What can BEGA help you with?"
                hint="Step 3 of 3"
              >
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Describe your project, questions, or requirements…"
                  rows={3}
                  autoFocus
                  disabled={state === 'submitting'}
                  className="w-full bg-zinc-900 border border-zinc-600 rounded-xl px-3 py-2.5
                             text-zinc-100 text-sm placeholder-zinc-500 resize-none
                             focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30
                             disabled:opacity-50 transition-colors"
                />
                {error && <ErrorMsg msg={error} />}
                <FormActions
                  onBack={state === 'form-query' ? () => { setError(''); setState('form-email'); } : undefined}
                  onNext={handleSubmit}
                  nextLabel={state === 'submitting' ? 'Sending…' : 'Submit'}
                  nextDisabled={state === 'submitting'}
                  nextPrimary
                />
              </FormStep>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(n => (
        <span
          key={n}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            n === current ? 'bg-amber-400' : n < current ? 'bg-amber-600/60' : 'bg-zinc-600'
          }`}
        />
      ))}
    </div>
  );
}

function FormStep({
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
        <p className="text-zinc-100 text-sm font-medium leading-tight">{label}</p>
        <p className="text-zinc-500 text-[11px] mt-0.5">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function FormActions({
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
            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${nextPrimary
            ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400 shadow-sm shadow-amber-500/20'
            : 'border border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400'
          }`}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-red-400 text-[11px] flex items-center gap-1.5">
      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  );
}
