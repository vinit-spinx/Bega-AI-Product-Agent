'use client';

import { useEffect, useState } from 'react';
import type { BomReport } from '@/types';
import { useShortlist } from '@/context/ShortlistContext';
import { trackEvent } from '@/services/insights/analyticsTracker';
import {
  StepDots, FormStep, FormActions, ErrorMsg,
  TextField, SelectField, TextAreaField,
} from './ContactFormSteps';

const DESIGNATIONS = ['Architect', 'Electrician', 'Contractor', 'Interior Designer', 'Lighting Designer', 'End User', 'Other'];
const PROJECT_TYPES = ['Hospitality', 'Residential', 'Commercial', 'Landscape', 'Campus', 'Other'];

interface RequestQuoteDrawerProps {
  open: boolean;
  /** Close this drawer only — return to the Compare Drawer underneath. */
  onClose: () => void;
  /** Close both drawers, keep the current chat session and shortlist exactly as they are. */
  onContinue: () => void;
  /** Close both drawers and start a brand new chat session (same effect as the "New chat" header button). */
  onDone: () => void;
  sessionId: string;
  bomReport: BomReport;
}

type Step = 'about-you' | 'about-project' | 'message' | 'submitting' | 'followup';

export default function RequestQuoteDrawer({
  open, onClose, onContinue, onDone, sessionId, bomReport,
}: RequestQuoteDrawerProps) {
  const { entries } = useShortlist();
  const [step, setStep] = useState<Step>('about-you');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [company, setCompany] = useState('');
  const [projectType, setProjectType] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const dismiss = () => {
    if (step === 'submitting') return;
    if (step === 'followup') onContinue();
    else onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  if (!open) return null;

  const handleNextAboutYou = () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setError('');
    setStep('about-project');
  };

  const handleNextAboutProject = () => {
    if (!location.trim()) { setError('Please enter the project or site location.'); return; }
    setError('');
    setStep('message');
  };

  const handleSubmit = async () => {
    if (!message.trim()) { setError('Please add a message describing your requirements.'); return; }
    setError('');
    setStep('submitting');

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
          projectType: projectType || undefined,
          location: location.trim(),
          contact: contact.trim() || undefined,
          message: message.trim(),
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
        hasBom: true,
      }), sessionId);

      setStep('followup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('message');
    }
  };

  return (
    <>
      {/* Backdrop — layered above the Compare Drawer's own backdrop */}
      <div
        className="fixed inset-0 z-[55] bg-bega-black/30 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden
      />

      {/* Stacked drawer — sits on top of CompareDrawer (z-50), which remains mounted underneath */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[60] max-h-[80vh] flex flex-col
                   bg-white border-t border-bega-border-2 rounded-t-2xl shadow-drawer
                   overflow-hidden animate-slide-up"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-bega-border-1 flex-shrink-0">
          <h2 className="font-semibold text-bega-text-1 text-sm tracking-tight">Request a Quote</h2>
          {step !== 'followup' && (
            <div className="flex items-center gap-3">
              {step !== 'submitting' && (
                <StepDots current={step === 'about-you' ? 1 : step === 'about-project' ? 2 : 3} total={3} />
              )}
              <button
                onClick={onClose}
                disabled={step === 'submitting'}
                className="w-8 h-8 rounded-md border border-bega-border-2 bg-bega-bg-1
                           hover:bg-bega-bg-2 text-bega-text-2 hover:text-bega-text-1
                           disabled:opacity-40 flex items-center justify-center transition-colors"
                aria-label="Close quote form"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {step === 'followup' ? (
            <div className="max-w-md mx-auto py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 mx-auto mb-4
                              flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-bega-text-1 text-base font-semibold mb-1.5">
                Quote request received!
              </p>
              <p className="text-bega-text-2 text-sm leading-relaxed mb-6">
                A BEGA representative will follow up at{' '}
                <span className="font-medium text-bega-black">{email}</span> with pricing and availability.
              </p>
              <p className="text-bega-text-2 text-sm font-medium mb-3">
                Would you like to keep asking the AI questions, or are you done for now?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onContinue}
                  className="px-5 py-2.5 rounded-md text-sm font-medium border border-bega-black/50
                             bg-bega-black/5 text-bega-black hover:bg-bega-black/10 hover:border-bega-black
                             transition-all duration-150"
                >
                  Continue chatting
                </button>
                <button
                  onClick={onDone}
                  className="px-5 py-2.5 rounded-md text-sm font-medium bg-bega-black text-white
                             hover:bg-bega-text-2 shadow-button transition-all duration-150"
                >
                  I&rsquo;m done — new chat
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              {step === 'about-you' && (
                <FormStep label="Tell us about yourself" hint="Step 1 of 3">
                  <div className="space-y-3">
                    <TextField label="Name" value={name} onChange={setName} placeholder="Your full name" autoFocus />
                    <TextField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
                    <SelectField label="Designation" value={designation} onChange={setDesignation} options={DESIGNATIONS} optional />
                    <TextField label="Company" value={company} onChange={setCompany} placeholder="Architecture firm, contractor, etc." optional />
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <FormActions onNext={handleNextAboutYou} nextLabel="Next →" />
                </FormStep>
              )}

              {step === 'about-project' && (
                <FormStep label="Tell us about the project" hint="Step 2 of 3">
                  <div className="space-y-3">
                    <SelectField label="Project Type" value={projectType} onChange={setProjectType} options={PROJECT_TYPES} optional />
                    <TextField label="Location" value={location} onChange={setLocation} placeholder="Project or site location" autoFocus />
                    <TextField label="Contact" type="tel" value={contact} onChange={setContact} placeholder="Phone number" optional />
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <FormActions onBack={() => { setError(''); setStep('about-you'); }} onNext={handleNextAboutProject} nextLabel="Next →" />
                </FormStep>
              )}

              {(step === 'message' || step === 'submitting') && (
                <FormStep label="What would you like to ask for?" hint="Step 3 of 3">
                  <TextAreaField
                    label="Message"
                    value={message}
                    onChange={setMessage}
                    placeholder="Describe your requirements, timeline, or any questions for the BEGA team…"
                    rows={4}
                    autoFocus
                    disabled={step === 'submitting'}
                  />
                  {error && <ErrorMsg msg={error} />}
                  <FormActions
                    onBack={step === 'message' ? () => { setError(''); setStep('about-project'); } : undefined}
                    onNext={handleSubmit}
                    nextLabel={step === 'submitting' ? 'Sending…' : 'Submit Request'}
                    nextDisabled={step === 'submitting'}
                    nextPrimary
                  />
                </FormStep>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
