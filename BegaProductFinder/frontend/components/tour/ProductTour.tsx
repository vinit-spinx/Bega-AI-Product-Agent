'use client';

import { useEffect, useRef, useState } from 'react';
import TourOverlay from './TourOverlay';

const STORAGE_KEY = 'bega_tour_products_v1';

const ALL_STEPS = [
  {
    selector:    '[data-tour="pin-button"]',
    title:       'Add to Shortlist',
    description: 'Click the bookmark icon on any product card to save it. Build a shortlist as you explore the catalog.',
  },
  {
    selector:    '[data-tour="shortlist-button"]',
    title:       'Your Shortlist',
    description: 'Saved products appear here. Open it to compare specs side-by-side and generate a priced Bill of Materials.',
  },
  {
    selector:    '[data-tour="product-projects"]',
    title:       'Used in Real Projects',
    description: 'See real BEGA installations that feature this product — browse for architectural inspiration.',
  },
];

interface Props {
  hasProducts: boolean;
  /** Called whenever the tour activates or deactivates so the parent can gate auto-scroll. */
  onActiveChange?: (active: boolean) => void;
}

export default function ProductTour({ hasProducts, onActiveChange }: Props) {
  const [steps, setSteps]   = useState<typeof ALL_STEPS>([]);
  const [step, setStep]     = useState(0);
  const [active, setActive] = useState(false);

  // Keep a stable ref so the timeout callback never captures a stale onActiveChange.
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => { onActiveChangeRef.current = onActiveChange; }, [onActiveChange]);

  useEffect(() => {
    if (!hasProducts) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    // Wait for product cards to finish rendering
    const timer = setTimeout(() => {
      const available = ALL_STEPS.filter(s => !!document.querySelector(s.selector));
      if (available.length > 0) {
        setSteps(available);
        setStep(0);
        setActive(true);
        onActiveChangeRef.current?.(true);
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [hasProducts]);

  const dismiss = () => {
    setActive(false);
    onActiveChangeRef.current?.(false);
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
