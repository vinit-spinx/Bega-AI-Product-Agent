// The five deterministic, client-driven flow actions (compare → BOM → quote/connect).
// Shared between ChatWindow.tsx (which routes clicks) and the suggestion-rendering
// components (which need to style these differently from Claude's freeform suggestions).

export const COMPARE_ACTION = 'Compare shortlisted products';
export const GENERATE_BOM_ACTION = 'Generate Bill of Materials';
export const REQUEST_QUOTE_ACTION = 'Request a Quote';
export const CONNECT_ACTION = 'Connect with BEGA Team';
export const FIND_REP_ACTION = 'Find Nearest Representative';

export const FLOW_ACTIONS = new Set([
  COMPARE_ACTION,
  GENERATE_BOM_ACTION,
  REQUEST_QUOTE_ACTION,
  CONNECT_ACTION,
  FIND_REP_ACTION,
]);

export function isFlowAction(action: string): boolean {
  return FLOW_ACTIONS.has(action);
}

// Deterministic client-side match for "connect with BEGA" / "talk to a rep" style free text.
// The system prompt also tells Claude to hand these off without calling a tool, but that's a
// soft instruction the model doesn't always follow (e.g. it has called search_products for
// "i want to connect with BEGA" and returned an unrelated product grid). Catching the intent
// here guarantees this conversion path never depends on model compliance.
const FIND_REP_PATTERNS = [
  /\bnearest representative\b/i,
  /\b(find|locate)\b.{0,20}\b(rep|representative)\b.{0,20}\bnear\b/i,
  /\brep(resentative)?\s+near\s+me\b/i,
];

const CONNECT_PATTERNS = [
  /\bconnect\b.{0,20}\bbega\b/i,
  /\bconnect\b.{0,20}\bteam\b/i,
  /\btalk to (a |the )?(person|human|someone|rep|representative|team)\b/i,
  /\bspeak (to|with) (a |the )?(person|human|someone|rep|representative|team)\b/i,
  /\bcontact (bega|the bega team|a representative)\b/i,
  /\bget in touch\b/i,
];

/** Returns the matching flow action for free text, or null if no deterministic intent matched. */
export function detectConnectIntent(text: string): typeof CONNECT_ACTION | typeof FIND_REP_ACTION | null {
  if (FIND_REP_PATTERNS.some(p => p.test(text))) return FIND_REP_ACTION;
  if (CONNECT_PATTERNS.some(p => p.test(text))) return CONNECT_ACTION;
  return null;
}
