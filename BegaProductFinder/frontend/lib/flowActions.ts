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
