'use client';

import { useState } from 'react';
import { trackEvent, triggerSessionFinalize } from '@/services/insights/analyticsTracker';
import { TextField, TextAreaField, ErrorMsg } from './ContactFormSteps';

interface ConnectFormCardProps {
  sessionId: string;
}

export default function ConnectFormCard({ sessionId }: ConnectFormCardProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (!query.trim()) { setError('Please describe your project or question.'); return; }
    setError('');
    setSubmitting(true);

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

      trackEvent('lead_captured', JSON.stringify({ source: 'inquiry' }), sessionId);
      triggerSessionFinalize(sessionId);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-5 flex items-start gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-green-200
                        flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-bega-text-1 text-sm font-semibold leading-tight">Your inquiry has been received!</p>
          <p className="text-bega-text-2 text-xs mt-1 leading-relaxed">
            A BEGA representative will be in touch at{' '}
            <span className="text-bega-black font-medium">{email}</span> shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-bega-border-1 bg-white px-5 py-4 max-w-md">
      <p className="text-bega-black text-[11px] font-semibold uppercase tracking-widest mb-3">
        Connect with BEGA Team
      </p>
      <div className="space-y-3">
        <TextField label="Name" value={name} onChange={setName} placeholder="Your full name" autoFocus />
        <TextField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
        <TextAreaField
          label="What can BEGA help you with?"
          value={query}
          onChange={setQuery}
          placeholder="Describe your project, questions, or requirements…"
          rows={3}
        />
      </div>
      {error && <div className="mt-3"><ErrorMsg msg={error} /></div>}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2.5 rounded-md text-sm font-semibold bg-bega-black text-white
                     hover:bg-bega-text-2 disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-button transition-all duration-150"
        >
          {submitting ? 'Sending…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
