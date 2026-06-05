'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { FurnitureSearchResult, ProductDetail, ProductSearchResult } from '@/types';
import { getProductDetail } from '@/lib/api';

export type ShortlistKind = 'product' | 'furniture';

export interface ShortlistEntry {
  kind: ShortlistKind;
  catalogNumber: string;
  /** The base search result received from the SSE stream — available immediately. */
  snapshot: ProductSearchResult | FurnitureSearchResult;
  /** Tier 2: full product detail fetched in the background after pin. */
  detail: ProductDetail | null;
  detailLoading: boolean;
  quantity: number;
}

interface ShortlistContextValue {
  entries: ShortlistEntry[];
  isOpen: boolean;
  pin: (item: ProductSearchResult | FurnitureSearchResult, kind: ShortlistKind) => void;
  unpin: (catalogNumber: string) => void;
  isPinned: (catalogNumber: string) => boolean;
  setQuantity: (catalogNumber: string, qty: number) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearAll: () => void;
}

const ShortlistContext = createContext<ShortlistContextValue | null>(null);

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ShortlistEntry[]>([]);
  const [isOpen, setIsOpen]   = useState(false);

  const pin = useCallback(async (
    item: ProductSearchResult | FurnitureSearchResult,
    kind: ShortlistKind,
  ) => {
    const cn = item.catalogNumber;

    setEntries(prev => {
      if (prev.some(e => e.catalogNumber === cn)) return prev;
      return [...prev, { kind, catalogNumber: cn, snapshot: item, detail: null, detailLoading: true, quantity: 1 }];
    });

    // Tier 2: fetch full ProductDetail in the background
    try {
      const detail = await getProductDetail(cn);
      setEntries(prev => prev.map(e =>
        e.catalogNumber === cn ? { ...e, detail, detailLoading: false } : e
      ));
    } catch {
      setEntries(prev => prev.map(e =>
        e.catalogNumber === cn ? { ...e, detailLoading: false } : e
      ));
    }
  }, []);

  const unpin = useCallback((cn: string) => {
    setEntries(prev => prev.filter(e => e.catalogNumber !== cn));
  }, []);

  const isPinned = useCallback(
    (cn: string) => entries.some(e => e.catalogNumber === cn),
    [entries],
  );

  const setQuantity = useCallback((cn: string, qty: number) => {
    setEntries(prev => prev.map(e =>
      e.catalogNumber === cn ? { ...e, quantity: Math.max(1, Math.min(999, qty)) } : e
    ));
  }, []);

  return (
    <ShortlistContext.Provider value={{
      entries, isOpen,
      pin, unpin, isPinned, setQuantity,
      openDrawer:  () => setIsOpen(true),
      closeDrawer: () => setIsOpen(false),
      clearAll:    () => { setEntries([]); setIsOpen(false); },
    }}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist(): ShortlistContextValue {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error('useShortlist must be used inside <ShortlistProvider>');
  return ctx;
}
