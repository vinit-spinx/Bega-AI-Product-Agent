'use client';

import { useCallback, useRef } from 'react';
import ChatWindow from '@/components/chat/ChatWindow';
import ActionCenter from '@/components/action-center/ActionCenter';
import BackgroundHero from '@/components/chat/BackgroundHero';

export default function SidebarPage() {
  // sendMessage is surfaced from ChatContent via the onReady callback.
  // Using a ref avoids re-renders on the page level when the function updates.
  const sendRef = useRef<((text: string, displayText?: string) => void) | null>(null);

  const handleReady = useCallback((send: (text: string, displayText?: string) => void) => {
    sendRef.current = send;
  }, []);

  const handleActionSelect = useCallback((prompt: string, displayText: string) => {
    sendRef.current?.(prompt, displayText);
  }, []);

  return (
    <div className="flex h-full bg-bega-bg-1">
      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <ActionCenter onActionSelect={handleActionSelect} />

      {/* ── Right: chat experience ────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0 h-full">
        {/* Subtle architectural background — sits behind all chat content */}
        <BackgroundHero />

        {/* Chat window fills the remaining space */}
        <div className="relative z-10 h-full">
          <ChatWindow showSuggestions onReady={handleReady} />
        </div>
      </div>
    </div>
  );
}
