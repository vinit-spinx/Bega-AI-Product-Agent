'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useChatSession } from '@/hooks/useChatSession';
import { ShortlistProvider, useShortlist } from '@/context/ShortlistContext';
import CompareDrawer from '../product/CompareDrawer';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import ShortlistButton from './ShortlistButton';

const SUGGESTED_STARTERS = [
  'Show me outdoor wall lights suitable for a luxury villa entrance.',
  'Find bollard lights with dark sky compliance.',
  'Recommend lighting products for a 5-star hotel project.',
  'Recommend exterior parking area lighting for a villa under $700',
  'Recommend outdoor planter & chair furniture for a public plaza.',
  'Recommend exterior fixtures with IP65 or higher.'
];

// ShortlistProvider must wrap ChatContent so useShortlist() can be called inside it.
export default function ChatWindow() {
  return (
    <ShortlistProvider>
      <ChatContent />
    </ShortlistProvider>
  );
}

function ChatContent() {
  const { messages, sessionId, isLoading, sendMessage, clearSession } = useChatSession();
  const { clearAll: clearShortlist } = useShortlist();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear both chat history and shortlist together on "New Chat"
  const handleNewChat = useCallback(() => {
    clearSession();
    clearShortlist();
  }, [clearSession, clearShortlist]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <span className="text-zinc-900 font-bold text-sm">B</span>
          </div>
          <div>
            <h1 className="font-semibold text-zinc-100 text-sm leading-tight">BEGA AI Product Advisor</h1>
            <p className="text-xs text-zinc-500">Architectural lighting &amp; urban design</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-xs text-zinc-500">{isLoading ? 'Thinking…' : 'Ready'}</span>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {isEmpty ? (
          <EmptyState onSelect={sendMessage} />
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                sessionId={sessionId}
                onSuggestedAction={sendMessage}
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          onClear={handleNewChat}
        />
      </div>

      {/* Floating shortlist button + comparison drawer */}
      <ShortlistButton />
      <CompareDrawer />
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-1">BEGA AI Product Advisor</h2>
      <p className="text-zinc-400 text-sm max-w-sm mb-8 leading-relaxed">
        Find luminaires, outdoor furniture, and complete lighting solutions for any project.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
        {SUGGESTED_STARTERS.map(s => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="text-left rounded-xl border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800
                       text-zinc-300 hover:text-zinc-100 text-xs px-4 py-3 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
