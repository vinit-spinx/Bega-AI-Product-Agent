'use client';

import { useEffect, useRef, useState } from 'react';

const PAD = 10;          // padding around the spotlight rect
const TIP_W = 292;       // tooltip width
const TIP_H_EST = 200;   // estimated tooltip height for placement math (generous to avoid overlap)

// Fraction from the TOP of the scrollable container where the target element lands.
// 0.30 = 30% from top — leaves visible context above and plenty of room below for the tooltip.
const SCROLL_TARGET_FRACTION = 0.30;

interface SpotRect { top: number; left: number; width: number; height: number }
interface TipPos   { top: number; left: number }

function calcTipPos(r: SpotRect, vw: number, vh: number): TipPos {
  const cx = r.left + r.width / 2;
  const spaceBelow = vh - (r.top + r.height);
  const spaceAbove = r.top;

  let top: number, left: number;

  if (spaceBelow >= TIP_H_EST + 16) {
    // preferred: below the spotlight
    top  = r.top + r.height + 14;
    left = Math.max(12, Math.min(cx - TIP_W / 2, vw - TIP_W - 12));
  } else if (spaceAbove >= TIP_H_EST + 16) {
    // above
    top  = r.top - TIP_H_EST - 14;
    left = Math.max(12, Math.min(cx - TIP_W / 2, vw - TIP_W - 12));
  } else {
    // centre-bottom fallback (drawer environment)
    top  = Math.min(r.top + r.height + 10, vh - TIP_H_EST - 12);
    left = Math.max(12, Math.min(cx - TIP_W / 2, vw - TIP_W - 12));
  }

  return {
    top:  Math.max(8, top),
    left: Math.max(8, Math.min(left, vw - TIP_W - 8)),
  };
}

/** Walk up the DOM to find the nearest element that actually scrolls vertically. */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const style = getComputedStyle(p);
    if (/auto|scroll/.test(style.overflowY) && p.scrollHeight > p.clientHeight) {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

/**
 * Instantly scroll the nearest scrollable ancestor so that `el` lands at
 * SCROLL_TARGET_FRACTION from the top of that container.
 *
 * We use a synchronous scrollTop assignment (not smooth) so the position is
 * fully settled before we measure getBoundingClientRect — smooth scroll can
 * take 700–900 ms for long distances and the measurement would fire mid-animation.
 *
 * Fixed/sticky elements (e.g. the shortlist button) are skipped — they are
 * always in the viewport regardless of scroll.
 */
function scrollToTarget(el: HTMLElement) {
  const pos = getComputedStyle(el).position;
  if (pos === 'fixed' || pos === 'sticky') return;

  const container = findScrollParent(el);
  if (!container) {
    // No scrollable ancestor — snap the window scroll instantly.
    el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const elRect        = el.getBoundingClientRect();

  // elOffsetTop = element's distance from the container's scrollable origin.
  const elOffsetTop = elRect.top - containerRect.top + container.scrollTop;
  const desired     = elOffsetTop - container.clientHeight * SCROLL_TARGET_FRACTION;

  // Synchronous assignment — position is final before the next paint.
  container.scrollTop = Math.max(0, desired);
}

interface Props {
  targetSelector: string;
  title: string;
  description: string;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

export default function TourOverlay({
  targetSelector,
  title,
  description,
  step,
  totalSteps,
  onNext,
  onSkip,
}: Props) {
  const [spot, setSpot]     = useState<SpotRect | null>(null);
  const [tipPos, setTipPos] = useState<TipPos | null>(null);
  const onNextRef = useRef(onNext);
  const onSkipRef = useRef(onSkip);

  useEffect(() => { onNextRef.current = onNext; }, [onNext]);
  useEffect(() => { onSkipRef.current = onSkip; }, [onSkip]);

  useEffect(() => {
    setSpot(null);
    setTipPos(null);

    const el = document.querySelector(targetSelector) as HTMLElement | null;
    if (!el) {
      // element absent — skip this step
      onNextRef.current();
      return;
    }

    // Scroll the element to a predictable vertical position in its container.
    scrollToTarget(el);

    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // not yet visible
      const padded: SpotRect = {
        top:    r.top    - PAD,
        left:   r.left   - PAD,
        width:  r.width  + PAD * 2,
        height: r.height + PAD * 2,
      };
      setSpot(padded);
      setTipPos(calcTipPos(padded, window.innerWidth, window.innerHeight));
    };

    // 100 ms is enough for the browser to reflow after the synchronous scroll.
    const t = setTimeout(measure, 100);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [targetSelector]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!spot || !tipPos) return null;

  const isLast = step === totalSteps;

  return (
    <>
      {/* Click-away backdrop — clicking outside spotlight skips tour */}
      <div
        className="fixed inset-0 z-[9990]"
        onClick={() => onSkipRef.current()}
        aria-hidden
      />

      {/* Spotlight ring — box-shadow creates the dark overlay with a transparent hole */}
      <div
        className="fixed z-[9991] rounded-[10px] pointer-events-none"
        style={{
          top:    spot.top,
          left:   spot.left,
          width:  spot.width,
          height: spot.height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.58)',
          outline: '1.5px solid rgba(255,255,255,0.22)',
          transition: 'top .3s ease, left .3s ease, width .3s ease, height .3s ease',
        }}
      />

      {/* Tooltip card */}
      <div
        className="fixed z-[9992] overflow-hidden bg-white rounded-2xl
                   shadow-[0_12px_40px_rgba(0,0,0,0.26)] border border-bega-border-1"
        style={{ top: tipPos.top, left: tipPos.left, width: TIP_W }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-[3px] bg-bega-border-1">
          <div
            className="h-full bg-bega-black transition-[width] duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="px-5 pt-4 pb-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-bega-text-3">
              {step} of {totalSteps}
            </span>
            <button
              onClick={() => onSkipRef.current()}
              className="text-[11px] text-bega-text-3 hover:text-bega-text-1 transition-colors leading-none"
            >
              Skip tour
            </button>
          </div>

          <p className="font-semibold text-bega-text-1 text-[13px] leading-snug mb-1.5">{title}</p>
          <p className="text-[12px] text-bega-text-2 leading-relaxed">{description}</p>

          {/* Footer row */}
          <div className="flex items-center justify-between mt-5">
            {/* Step dots — active dot is a wider pill */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === step - 1
                      ? 'w-5 h-[5px] bg-bega-black'
                      : i < step - 1
                        ? 'w-[5px] h-[5px] bg-bega-border-3'
                        : 'w-[5px] h-[5px] bg-bega-border-2'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => onNextRef.current()}
              className="flex items-center gap-1.5 px-4 py-2 bg-bega-black text-white
                         text-[12px] font-semibold rounded-lg hover:bg-bega-text-2
                         transition-colors active:scale-[0.97]"
            >
              {isLast ? 'Got it' : 'Next'}
              {!isLast && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
