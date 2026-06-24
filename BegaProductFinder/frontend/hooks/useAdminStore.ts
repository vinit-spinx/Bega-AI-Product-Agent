'use client';

import { useEffect, useState } from 'react';
import { actionsStore, suggestionsStore, heroStore } from '@/store/adminStore';
import type { AdminAction, AdminSuggestion, HeroContent } from '@/types/admin';

// Static default used as initial state on both server and client so hydration always matches.
// The store's live data (from the API) replaces this after the first useEffect fires.
const DEFAULT_HERO: HeroContent = {
  id: 1,
  title: 'Find the Perfect Lighting Solution',
  description: 'Discover lighting, furniture, and control solutions engineered for exceptional architectural environments.',
  backgroundImageUrl: '',
};

/**
 * Returns active actions from the CMS.
 * Starts empty on both server and client (no hydration mismatch),
 * then populates from the API-backed store after mount.
 */
export function useActiveActions(): AdminAction[] {
  const [actions, setActions] = useState<AdminAction[]>([]);
  useEffect(() => {
    setActions(actionsStore.getActive());
    return actionsStore.subscribe(() => setActions(actionsStore.getActive()));
  }, []);
  return actions;
}

/**
 * Returns active suggestions from the CMS.
 * Same SSR-safe pattern as useActiveActions.
 */
export function useActiveSuggestions(): AdminSuggestion[] {
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  useEffect(() => {
    setSuggestions(suggestionsStore.getActive());
    return suggestionsStore.subscribe(() => setSuggestions(suggestionsStore.getActive()));
  }, []);
  return suggestions;
}

/**
 * Returns hero content from the CMS.
 * Initialises with the static default so the hero title is never blank on first render.
 * Updates after mount if the API returns different data.
 */
export function useHeroContent(): HeroContent {
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  useEffect(() => {
    setHero(heroStore.get());
    return heroStore.subscribe(() => setHero(heroStore.get()));
  }, []);
  return hero;
}

/**
 * True once the suggestions fetch has resolved, or once `maxWaitMs` has elapsed —
 * whichever comes first. Used to hold the /new-ui hero's entrance animation at its
 * starting frame until the suggestion cards are actually ready to render, so the
 * whole group (light, title, suggestions) starts its reveal on the same frame
 * instead of the cards arriving late and animating in on their own afterwards.
 * The timeout cap means a slow/failed fetch never blocks the hero indefinitely.
 */
export function useSuggestionsReady(maxWaitMs = 700): boolean {
  // Always starts false on both server and client (same SSR-safe pattern as the
  // hooks above) — reading suggestionsStore.isLoaded() directly in the initializer
  // caused a hydration mismatch: the server's module instance is always fresh
  // (isLoaded() === false), but the client's singleton store can already have
  // isLoaded() === true left over from an earlier client-side navigation, so the
  // two initial renders disagreed.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (suggestionsStore.isLoaded()) {
      setReady(true);
      return;
    }
    const unsubscribe = suggestionsStore.subscribe(() => setReady(true));
    const timer = setTimeout(() => setReady(true), maxWaitMs);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [maxWaitMs]);
  return ready;
}
