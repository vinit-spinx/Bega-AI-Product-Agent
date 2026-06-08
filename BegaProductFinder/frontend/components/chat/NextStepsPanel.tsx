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
      <div className="rounded-lg border border-bega-border-1 bg-white overflow-hidden shadow-card">

        {/* ── Success ──────────────────────────────────────────────────────── */}
        {state === 'success' && (
          <div className="px-5 py-5 flex items-start gap-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-50 border border-green-200
                            flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-bega-text-1 text-sm font-semibold leading-tight">
                Your inquiry has been received!
              </p>
              <p className="text-bega-text-2 text-xs mt-1 leading-relaxed">
                A BEGA representative will be in touch at{' '}
                <span className="text-bega-black font-medium">{email}</span> shortly.
                You can continue searching below.
              </p>
            </div>
          </div>
        )}

        {/* ── Idle — two buttons ───────────────────────────────────────────── */}
        {state === 'idle' && (
          <div className="px-5 py-4">
            <p className="text-bega-text-3 text-[11px] font-semibold mb-3 uppercase tracking-widest">
              Ready to move forward?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setState('hidden')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium
                           border border-bega-border-2 bg-white text-bega-text-2
                           hover:bg-bega-bg-1 hover:border-bega-border-3 hover:text-bega-text-1
                           transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Continue Search
              </button>
              <button
                onClick={() => setState('form-name')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium
                           border border-bega-black/50 bg-bega-black/5 text-bega-black
                           hover:bg-bega-black/10 hover:border-bega-black
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
              <p className="text-bega-black text-[11px] font-semibold uppercase tracking-widest">
                Connect with BEGA Team
              </p>
              <StepDots current={state === 'form-name' ? 1 : state === 'form-email' ? 2 : 3} />
            </div>

            {/* Step 1 — Name */}
            {state === 'form-name' && (
              <FormStep label="What's your name?" hint="Step 1 of 3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNextName()}
                  placeholder="Your full name"
                  autoFocus
                  className="w-full bg-bega-bg-1 border border-bega-border-2 rounded-md px-3 py-2.5
                             text-bega-text-1 text-sm placeholder-bega-text-3
                             focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20
                             hover:border-bega-border-3 transition-colors"
                />
                {error && <ErrorMsg msg={error} />}
                <FormActions onNext={handleNextName} nextLabel="Next →" />
              </FormStep>
            )}

            {/* Step 2 — Email */}
            {state === 'form-email' && (
              <FormStep label="What's your email address?" hint="Step 2 of 3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNextEmail()}
                  placeholder="you@company.com"
                  autoFocus
                  className="w-full bg-bega-bg-1 border border-bega-border-2 rounded-md px-3 py-2.5
                             text-bega-text-1 text-sm placeholder-bega-text-3
                             focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20
                             hover:border-bega-border-3 transition-colors"
                />
                {error && <ErrorMsg msg={error} />}
                <FormActions onBack={() => { setError(''); setState('form-name'); }} onNext={handleNextEmail} nextLabel="Next →" />
              </FormStep>
            )}

            {/* Step 3 — Query */}
            {(state === 'form-query' || state === 'submitting') && (
              <FormStep label="What can BEGA help you with?" hint="Step 3 of 3">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Describe your project, questions, or requirements…"
                  rows={3}
                  autoFocus
                  disabled={state === 'submitting'}
                  className="w-full bg-bega-bg-1 border border-bega-border-2 rounded-md px-3 py-2.5
                             text-bega-text-1 text-sm placeholder-bega-text-3 resize-none
                             focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20
                             hover:border-bega-border-3
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
            n === current ? 'bg-bega-black' : n < current ? 'bg-bega-black/40' : 'bg-bega-border-2'
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
        <p className="text-bega-text-1 text-sm font-medium leading-tight">{label}</p>
        <p className="text-bega-text-3 text-[11px] mt-0.5">{hint}</p>
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

function ErrorMsg({ msg }: { msg: string }) {
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
