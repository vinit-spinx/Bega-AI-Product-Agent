'use client';

import { useEffect, useRef, useState } from 'react';
import TourOverlay from './TourOverlay';

const STORAGE_KEY = 'bega_tour_compare_v1';

// Selectors are scoped to this comparison card's own message container (see messageId prop) —
// chat history can hold multiple ComparisonCard instances, and an unscoped selector would
// always match the first one in the DOM rather than the card just rendered.
function buildSteps(messageId: string) {
  const scope = `#msg-${messageId}`;
  return [
    {
      selector:    `${scope} [data-tour="quantity-row"]`,
      title:       'Set Quantities',
      description: 'Adjust how many units of each product you need — quantities feed directly into BOM pricing.',
    },
    {
      selector:    `${scope} [data-tour="generate-bom-btn"]`,
      title:       'Generate BOM',
      description: 'Click to get an instant priced Bill of Materials with DNP pricing and lead times for every item.',
    },
  ];
}

interface CompareTourProps {
  messageId: string;
  /** Called whenever the tour activates or deactivates so the parent can gate auto-scroll-
   *  to-bottom — without this, the chat's scroll-to-bottom-on-new-message effect fights the
   *  tour's own scroll positioning and the spotlight ends up misaligned with its target. */
  onActiveChange?: (active: boolean) => void;
}

// Rendered inside ComparisonCard — mounts when the comparison card appears in the conversation.
// Uses mount-effect to trigger the tour on first render (per the configured persistence mode).
export default function CompareTour({ messageId, onActiveChange }: CompareTourProps) {
  const [steps, setSteps]   = useState<ReturnType<typeof buildSteps>>([]);
  const [step, setStep]     = useState(0);
  const [active, setActive] = useState(false);

  // Keep a stable ref so the timeout callback never captures a stale onActiveChange.
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => { onActiveChangeRef.current = onActiveChange; }, [onActiveChange]);

  // Safety net — if this card unmounts (e.g. shortlist cleared) while the tour is still
  // active, make sure the auto-scroll gate gets released rather than stuck open forever.
  useEffect(() => {
    return () => { onActiveChangeRef.current?.(false); };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => {
      const allSteps = buildSteps(messageId);
      const available = allSteps.filter(s => !!document.querySelector(s.selector));
      if (available.length > 0) {
        setSteps(available);
        setStep(0);
        setActive(true);
        onActiveChangeRef.current?.(true);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [messageId]);

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
