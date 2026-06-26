// Shared persistence for onboarding tours (ProductTour, CompareTour). Uses localStorage rather
// than sessionStorage so "seen once" survives across tabs and chat sessions in the same browser —
// it should only ever reset when the user clears site data.
//
// Behaviour: a tour shown and completed (reached the final step) never shows again. A tour that's
// skipped is shown again on the next eligible trigger, up to MAX_SKIP_ATTEMPTS total appearances —
// after that it stops permanently until the browser cache/localStorage is cleared.

const MAX_SKIP_ATTEMPTS = 4; // first view + 3 retries after being skipped

interface TourState {
  attempts: number;
  done: boolean;
}

function readState(key: string): TourState {
  if (typeof window === 'undefined') return { attempts: 0, done: false };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { attempts: 0, done: false };
    const parsed = JSON.parse(raw) as Partial<TourState>;
    return { attempts: parsed.attempts ?? 0, done: parsed.done ?? false };
  } catch {
    return { attempts: 0, done: false };
  }
}

function writeState(key: string, state: TourState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota) — tour just won't persist this run.
  }
}

/** Whether this tour is still eligible to be shown in this browser. */
export function shouldShowTour(key: string): boolean {
  const state = readState(key);
  return !state.done && state.attempts < MAX_SKIP_ATTEMPTS;
}

/** Call exactly once, right when the tour is actually displayed to the user. */
export function recordTourShown(key: string): void {
  const state = readState(key);
  writeState(key, { attempts: state.attempts + 1, done: state.done });
}

/**
 * Call when the tour ends. `completed` = the user reached the final step without skipping
 * (never show again from this point on). Otherwise it was skipped — eligible again next time
 * until MAX_SKIP_ATTEMPTS total appearances have happened, then it stops permanently.
 */
export function recordTourEnded(key: string, completed: boolean): void {
  const state = readState(key);
  writeState(key, { attempts: state.attempts, done: completed || state.attempts >= MAX_SKIP_ATTEMPTS });
}
