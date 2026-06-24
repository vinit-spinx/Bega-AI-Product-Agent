'use client';

import { useEffect, useState } from 'react';
import TourOverlay from './TourOverlay';

const STORAGE_KEY = 'bega_tour_compare_v1';

const ALL_STEPS = [
  {
    selector:    '[data-tour="quantity-row"]',
    title:       'Set Quantities',
    description: 'Adjust how many units of each product you need — quantities feed directly into BOM pricing.',
  },
  {
    selector:    '[data-tour="generate-bom-btn"]',
    title:       'Generate BOM',
    description: 'Click to get an instant priced Bill of Materials with DNP pricing and lead times for every item.',
  },
];

// Rendered inside ComparisonCard — mounts when the comparison card appears in the conversation.
// Uses mount-effect to trigger the tour on first render (per the configured persistence mode).
export default function CompareTour() {
  const [steps, setSteps]   = useState<typeof ALL_STEPS>([]);
  const [step, setStep]     = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => {
      const available = ALL_STEPS.filter(s => !!document.querySelector(s.selector));
      if (available.length > 0) {
        setSteps(available);
        setStep(0);
        setActive(true);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setActive(false);
    if (typeof window !== 'undefined') sessionStorage.setItem(STORAGE_KEY, '1');
  };

  const next = () => {
    if (step + 1 >= steps.length) dismiss();
    else setStep(s => s + 1);
  };

  if (!active || steps.length === 0) return null;

  const current = steps[step];
  return (
    <TourOverlay
      targetSelector={current.selector}
      title={current.title}
      description={current.description}
      step={step + 1}
      totalSteps={steps.length}
      onNext={next}
      onSkip={dismiss}
    />
  );
}
