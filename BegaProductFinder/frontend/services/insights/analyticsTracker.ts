const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

type EventType =
  | 'action_click'
  | 'suggestion_click'
  | 'query'             // server-fired only today, included for type completeness
  | 'product_viewed'
  | 'shortlisted'
  | 'unshortlisted'
  | 'bom_generated'
  | 'lead_captured';

/**
 * Fire-and-forget analytics event. Never throws — failures are silently swallowed
 * so broken analytics never interrupts the user experience.
 */
export function trackEvent(type: EventType, name: string, sessionId?: string): void {
  if (typeof window === 'undefined') return; // SSR guard

  const payload = JSON.stringify({ type, name, sessionId: sessionId ?? null });

  // fetch with keepalive:true survives page unload (same guarantee as sendBeacon)
  // and avoids the CORS preflight issues that sendBeacon+JSON Blob causes on localhost HTTPS.
  fetch(`${API_URL}/api/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => { /* intentionally ignored */ });
}
