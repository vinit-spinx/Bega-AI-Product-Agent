'use client';

import { useState } from 'react';
import type { BomReport } from '@/types';
import { useShortlist } from '@/context/ShortlistContext';
import { trackEvent } from '@/services/insights/analyticsTracker';
import { TextField, SelectField, LocationAutocompleteField, TextAreaField, ErrorMsg, type GeocodeResult } from './ContactFormSteps';

const DESIGNATIONS = ['Architect', 'Electrician', 'Contractor', 'Interior Designer', 'Lighting Designer', 'End User', 'Other'];

interface QuoteFormCardProps {
  sessionId: string;
  bomReport?: BomReport;
}

export default function QuoteFormCard({ sessionId, bomReport }: QuoteFormCardProps) {
  const { entries } = useShortlist();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [locationGeo, setLocationGeo] = useState<GeocodeResult | null>(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (!location.trim()) { setError('Please enter the project or site location.'); return; }
    if (!message.trim()) { setError('Please add a message describing your requirements.'); return; }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/contact/submit-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: name.trim(),
          email: email.trim(),
          designation: designation || undefined,
          company: company.trim() || undefined,
          location: location.trim(),
          message: message.trim(),
          latitude: locationGeo?.lat,
          longitude: locationGeo?.lon,
          city: locationGeo?.city ?? undefined,
          country: locationGeo?.country ?? undefined,
          countryCode: locationGeo?.countryCode ?? undefined,
          shortlist: entries.map(e => ({
            catalogNumber: e.catalogNumber,
            quantity: e.quantity,
            kind: e.kind,
          })),
          bomReport,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      trackEvent('lead_captured', JSON.stringify({
        source: 'quote_cta',
        itemCount: entries.length,
        hasBom: !!bomReport,
      }), sessionId);

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
          <p className="text-bega-text-1 text-sm font-semibold leading-tight">Quote request received!</p>
          <p className="text-bega-text-2 text-xs mt-1 leading-relaxed">
            A BEGA representative will follow up at{' '}
            <span className="font-medium text-bega-black">{email}</span> with pricing and availability.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-bega-border-1 bg-white px-5 py-4 max-w-md">
      <p className="text-bega-black text-[11px] font-semibold uppercase tracking-widest mb-3">
        Request a Quote
      </p>
      <div className="space-y-3">
        <TextField label="Name" value={name} onChange={setName} placeholder="Your full name" autoFocus />
        <TextField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
        <SelectField label="Designation" value={designation} onChange={setDesignation} options={DESIGNATIONS} optional />
        <TextField label="Company" value={company} onChange={setCompany} placeholder="Architecture firm, contractor, etc." optional />
        <LocationAutocompleteField
          label="Project Location"
          value={location}
          onChange={setLocation}
          onSelect={setLocationGeo}
          placeholder="Project or site location"
        />
        <TextAreaField
          label="Message"
          value={message}
          onChange={setMessage}
          placeholder="Describe your requirements, timeline, or any questions for the BEGA team…"
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
          {submitting ? 'Sending…' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}
