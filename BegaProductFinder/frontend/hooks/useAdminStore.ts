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
