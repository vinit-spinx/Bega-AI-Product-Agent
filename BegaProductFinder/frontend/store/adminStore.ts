/**
 * Client-side singleton store for CMS content.
 *
 * Data is fetched from the backend API on first use and cached in module-level
 * state for fast subsequent reads. A BroadcastChannel propagates invalidation
 * messages to all tabs so every tab re-fetches after an admin write.
 */
import type { AdminAction, AdminSuggestion, HeroContent } from '@/types/admin';

type Listener = () => void;
type StoreKey = 'actions' | 'suggestions' | 'hero';

// ── State ─────────────────────────────────────────────────────────────────────

let _actions: AdminAction[] = [];
let _suggestions: AdminSuggestion[] = [];
let _hero: HeroContent = {
  id: 1,
  title: 'Find the Perfect Lighting Solution',
  description: 'Discover lighting, furniture, and control solutions engineered for exceptional architectural environments.',
  backgroundImageUrl: '',
};

let _actionsLoaded = false;
let _suggestionsLoaded = false;
let _heroLoaded = false;

// ── Pub-sub ───────────────────────────────────────────────────────────────────

const _listeners: Record<StoreKey, Set<Listener>> = {
  actions: new Set(),
  suggestions: new Set(),
  hero: new Set(),
};

function notify(key: StoreKey) {
  _listeners[key].forEach(fn => fn());
}

// ── API hydration ─────────────────────────────────────────────────────────────

const API_URL = typeof process !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? '')
  : '';

async function fetchActions() {
  try {
    const res = await fetch(`${API_URL}/api/content/actions`);
    if (!res.ok) return;
    const data: AdminAction[] = await res.json();
    _actions = data;
    _actionsLoaded = true;
    notify('actions');
  } catch { /* network unavailable — keep cached state */ }
}

async function fetchSuggestions() {
  try {
    const res = await fetch(`${API_URL}/api/content/suggestions`);
    if (!res.ok) return;
    const data: AdminSuggestion[] = await res.json();
    _suggestions = data;
    _suggestionsLoaded = true;
    notify('suggestions');
  } catch { /* network unavailable — keep cached state */ }
}

async function fetchHero() {
  try {
    const res = await fetch(`${API_URL}/api/content/hero`);
    if (!res.ok) return;
    const data: HeroContent = await res.json();
    _hero = data;
    _heroLoaded = true;
    notify('hero');
  } catch { /* network unavailable — keep cached state */ }
}

/** Re-fetch all CMS content from the API and notify all listeners. */
export function triggerRefetch(keys: StoreKey[] = ['actions', 'suggestions', 'hero']) {
  if (typeof window === 'undefined') return;
  if (keys.includes('actions')) fetchActions();
  if (keys.includes('suggestions')) fetchSuggestions();
  if (keys.includes('hero')) fetchHero();
  _channel?.postMessage({ type: 'cms_changed', keys });
}

// ── BroadcastChannel (cross-tab sync) ────────────────────────────────────────

let _channel: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
  _channel = new BroadcastChannel('bega_cms');
  _channel.onmessage = (e: MessageEvent) => {
    const keys: StoreKey[] = e.data?.keys ?? ['actions', 'suggestions', 'hero'];
    if (keys.includes('actions')) fetchActions();
    if (keys.includes('suggestions')) fetchSuggestions();
    if (keys.includes('hero')) fetchHero();
  };
  // Hydrate on module load (first tab open or new navigation)
  fetchActions();
  fetchSuggestions();
  fetchHero();
}

// ── Actions store (read-only public interface) ────────────────────────────────

export const actionsStore = {
  getActive(): AdminAction[] {
    return _actions.filter(a => a.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  getAll(): AdminAction[] {
    return [..._actions].sort((a, b) => a.sortOrder - b.sortOrder);
  },
  isLoaded(): boolean {
    return _actionsLoaded;
  },
  subscribe(fn: Listener): () => void {
    _listeners.actions.add(fn);
    if (!_actionsLoaded && typeof window !== 'undefined') fetchActions();
    return () => _listeners.actions.delete(fn);
  },
};

// ── Suggestions store (read-only public interface) ────────────────────────────

export const suggestionsStore = {
  getActive(): AdminSuggestion[] {
    return _suggestions.filter(s => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  getAll(): AdminSuggestion[] {
    return [..._suggestions].sort((a, b) => a.sortOrder - b.sortOrder);
  },
  isLoaded(): boolean {
    return _suggestionsLoaded;
  },
  subscribe(fn: Listener): () => void {
    _listeners.suggestions.add(fn);
    if (!_suggestionsLoaded && typeof window !== 'undefined') fetchSuggestions();
    return () => _listeners.suggestions.delete(fn);
  },
};

// ── Hero store (read-only public interface) ───────────────────────────────────

export const heroStore = {
  get(): HeroContent {
    return { ..._hero };
  },
  isLoaded(): boolean {
    return _heroLoaded;
  },
  subscribe(fn: Listener): () => void {
    _listeners.hero.add(fn);
    if (!_heroLoaded && typeof window !== 'undefined') fetchHero();
    return () => _listeners.hero.delete(fn);
  },
};
