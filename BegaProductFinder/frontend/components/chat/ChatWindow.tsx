'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatSession } from '@/hooks/useChatSession';
import { useHeroContent } from '@/hooks/useAdminStore';
import { ShortlistProvider, useShortlist, type ShortlistEntry } from '@/context/ShortlistContext';
import { generateBom, getProductAlternatives } from '@/lib/api';
import {
  COMPARE_ACTION, GENERATE_BOM_ACTION, REQUEST_QUOTE_ACTION, CONNECT_ACTION, FIND_REP_ACTION,
  detectConnectIntent,
} from '@/lib/flowActions';
import type { BomReport, ImageAttachment } from '@/types';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import ShortlistButton from './ShortlistButton';
import ProductTour from '../tour/ProductTour';
import SuggestionCards from './SuggestionCards';
import SiteHeader from '../layout/SiteHeader';
import SiteFooter from '../layout/SiteFooter';

// Ephemeral per-turn context — prepended to the text actually sent to Claude (never shown
// in the chat bubble, via sendMessage's displayText param) so the agent can route flow intent
// expressed in free text (e.g. "can you compare these for me") back onto the same suggested
// action pills, instead of guessing or trying to fulfil it itself. No backend/schema changes
// needed since this rides the existing message text.
function buildShortlistContextPrefix(entries: ShortlistEntry[], lastBomReport?: BomReport): string {
  // Always send this line — even at 0 items — so the backend's SHORTLIST & FLOW CONTEXT rule
  // is reliably triggered instead of silently falling through to the generic generate_bill_of_materials
  // tool dispatch when nothing has been pinned yet.
  if (entries.length === 0) {
    return '[Shortlist context — not visible to user: 0 items shortlisted. No bill of materials has been generated yet.]\n\n';
  }
  const items = entries.map(e => `${e.catalogNumber} x${e.quantity}`).join(', ');
  const bomNote = lastBomReport
    ? ` A bill of materials has already been generated (subtotal $${lastBomReport.subtotalDnp.toFixed(2)} DNP).`
    : ' No bill of materials has been generated yet.';
  return `[Shortlist context — not visible to user: ${entries.length} item(s) shortlisted (${items}).${bomNote}]\n\n`;
}

interface ChatWindowProps {
  showSuggestions?: boolean;
  /**
   * Called once sendMessage is available. The exposed `send(text, displayText?)` lets
   * a parent (e.g. sidebar) trigger a message where `displayText` is shown in the chat
   * bubble while `text` (the full prompt) is sent to the API.
   */
  onReady?: (send: (text: string, displayText?: string) => void) => void;
}

// ShortlistProvider must wrap ChatContent so useShortlist() can be called inside it.
export default function ChatWindow({ showSuggestions = false, onReady }: ChatWindowProps) {
  return (
    <ShortlistProvider>
      <ChatContent showSuggestions={showSuggestions} onReady={onReady} />
    </ShortlistProvider>
  );
}

function ChatContent({ showSuggestions = false, onReady }: ChatWindowProps) {
  const { messages, sessionId, isLoading, sendMessage, clearSession, pushFlowStep, updateMessage } = useChatSession();
  const { entries: shortlistEntries, clearAll: clearShortlist } = useShortlist();
  const [lastBomReport, setLastBomReport] = useState<BomReport | undefined>(undefined);
  const hero = useHeroContent();
  const bottomRef = useRef<HTMLDivElement>(null);
  // While the product tour is active it controls its own scroll target — we must
  // not fight it by auto-scrolling to the bottom on every new SSE message.
  const tourActiveRef = useRef(false);
  // Keep the parent layout's sendMessage ref up-to-date so sidebar actions work
  // even if the hook returns a new function reference after a session reset.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => {
    onReadyRef.current?.((text, displayText) => sendMessage(text, undefined, displayText));
  }, [sendMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tourActiveRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep lastBomReport in sync with whatever the latest BOM actually is — regardless of
  // whether it arrived via the local "Generate Bill of Materials" flow or because the agent
  // called the tool itself. Without this, a model-triggered BOM would leave lastBomReport
  // (and therefore the "Compare shortlisted" nudge gate and the quote form binding) stale.
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].bomReport) {
        setLastBomReport(messages[i].bomReport);
        return;
      }
    }
  }, [messages]);

  const handleNewChat = useCallback(() => {
    clearSession();
    clearShortlist();
    setLastBomReport(undefined);
  }, [clearSession, clearShortlist]);

  const handleCompareRequested = useCallback(() => {
    pushFlowStep(COMPARE_ACTION, {
      content: "Here's how your shortlisted products compare. Would you like a priced Bill of Materials for these, "
        + 'or would you rather keep browsing for other options?',
      flowCard: { kind: 'comparison' },
      suggestedActions: [
        GENERATE_BOM_ACTION,
        'Show me other product options',
        'Remove an item from this comparison',
        'Adjust quantities before generating a BOM',
        'Find a similar product with different specs',
      ],
    });
  }, [pushFlowStep]);

  const handleGenerateBom = useCallback(async () => {
    if (shortlistEntries.length === 0) return;
    const assistantId = pushFlowStep(GENERATE_BOM_ACTION, { isStreaming: true });
    try {
      const report = await generateBom({
        items: shortlistEntries.map(e => ({ catalogNumber: e.catalogNumber, quantity: e.quantity })),
      });
      setLastBomReport(report);
      updateMessage(assistantId, {
        isStreaming: false,
        content: "Here's your bill of materials. Would you like to request a formal quote, connect with the BEGA "
          + 'team, or find a representative near you?',
        bomReport: report,
        suggestedActions: [
          REQUEST_QUOTE_ACTION,
          CONNECT_ACTION,
          FIND_REP_ACTION,
          'Export this BOM as a CSV',
          'Adjust quantities and regenerate',
          'Continue browsing for more products',
        ],
      });
    } catch (err) {
      updateMessage(assistantId, {
        isStreaming: false,
        error: err instanceof Error ? err.message : 'Failed to generate BOM',
      });
    }
  }, [shortlistEntries, pushFlowStep, updateMessage]);

  // Locally fetches alternatives for one product and renders them as a follow-up chat
  // message, the same way pushFlowStep drives the compare/BOM flow — no Claude call involved.
  const handleViewAlternatives = useCallback(async (catalogNumber: string) => {
    const assistantId = pushFlowStep(`Show alternatives for ${catalogNumber}`, { isStreaming: true });
    try {
      // Exclude every product already on screen so repeated clicks surface new options
      // instead of recycling ones the user has already seen in this conversation.
      const alreadyShown = messages.flatMap(m => m.products?.map(p => p.catalogNumber) ?? []);
      const alternatives = await getProductAlternatives(catalogNumber, 3, alreadyShown);
      updateMessage(assistantId, {
        isStreaming: false,
        content: alternatives.length > 0
          ? `Here are some alternatives to ${catalogNumber}:`
          : `No alternative products were found for ${catalogNumber}.`,
        products: alternatives,
      });
    } catch (err) {
      updateMessage(assistantId, {
        isStreaming: false,
        error: err instanceof Error ? err.message : 'Failed to load alternatives',
      });
    }
  }, [pushFlowStep, updateMessage, messages]);

  // Used for anything that reaches Claude — typed input, suggestion-card clicks, and
  // freeform suggested-action pills. Invisibly prepends shortlist/BOM state so the agent
  // can route flow intent expressed in free text back onto the same suggested action pills.
  const handleTypedSend = useCallback((text: string, image?: ImageAttachment) => {
    // Deterministic intent match takes precedence over the agent — see detectConnectIntent.
    const intentAction = !image ? detectConnectIntent(text) : null;
    if (intentAction === FIND_REP_ACTION) {
      pushFlowStep(text, { content: '', flowCard: { kind: 'find_rep' } });
      return;
    }
    if (intentAction === CONNECT_ACTION) {
      pushFlowStep(text, {
        content: 'Tell us a bit about your inquiry and a BEGA representative will follow up.',
        flowCard: { kind: 'connect' },
      });
      return;
    }

    const prefix = buildShortlistContextPrefix(shortlistEntries, lastBomReport);
    void sendMessage(prefix + text, image, text);
  }, [shortlistEntries, lastBomReport, sendMessage, pushFlowStep]);

  const handleSuggestedAction = useCallback((action: string) => {
    switch (action) {
      case COMPARE_ACTION:
        handleCompareRequested();
        return;
      case GENERATE_BOM_ACTION:
        void handleGenerateBom();
        return;
      case REQUEST_QUOTE_ACTION:
        pushFlowStep(REQUEST_QUOTE_ACTION, {
          content: "Sure — here's a quick form to get a formal quote.",
          flowCard: { kind: 'quote', bomReport: lastBomReport },
        });
        return;
      case CONNECT_ACTION:
        pushFlowStep(CONNECT_ACTION, {
          content: 'Tell us a bit about your inquiry and a BEGA representative will follow up.',
          flowCard: { kind: 'connect' },
        });
        return;
      case FIND_REP_ACTION:
        pushFlowStep(FIND_REP_ACTION, { content: '', flowCard: { kind: 'find_rep' } });
        return;
      default:
        handleTypedSend(action);
    }
  }, [handleCompareRequested, handleGenerateBom, pushFlowStep, lastBomReport, handleTypedSend]);

  const isEmpty = messages.length === 0;
  const hasProducts = messages.some(m => (m.products?.length ?? 0) > 0);

  return (
    <div className="flex flex-col h-full bg-white">

      <SiteHeader onLogoClick={handleNewChat} disabled={isLoading} />

      {isEmpty ? (
        /* ── Hero landing + footer ─────────────────────────────────────────── */
        <>
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-12 bg-white">

          {/* Dynamic background image (set via Admin → Hero Content) */}
          {hero.backgroundImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.backgroundImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                // style={{ opacity: 1 }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.80) 60%, rgba(255,255,255,0.92) 100%)' }}
              />
            </>
          )}

          {/* ── Center content ── */}
          <div className="flex flex-col items-center mb-10 relative z-10">

            

            <h2
              className="font-serif text-[44px] font-medium text-bega-text-1 tracking-tight text-center leading-tight animate-fade-in"
              style={{ animationDelay: '160ms' }}
            >
              {hero.title}
            </h2>
            {hero.description && (
              <p
                className="text-[11px] text-bega-text-2 tracking-[0.22em] uppercase mt-4 text-center max-w-xl animate-fade-in"
                style={{
                  animationDelay: '230ms',
                  textShadow: hero.backgroundImageUrl
                    ? '0 1px 12px rgba(255,255,255,0.9), 0 1px 2px rgba(255,255,255,0.9)'
                    : undefined,
                }}
              >
                {hero.description}
              </p>
            )}
          </div>

          {/* ── Input + suggestion grid ── */}
          <div className="w-full max-w-2xl relative z-10 mt-2">
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <ChatInput onSend={handleTypedSend} isLoading={isLoading} onClear={handleNewChat} variant="hero" />
            </div>

            {showSuggestions && (
              <SuggestionCards onSend={handleTypedSend} />
            )}
          </div>
        </div>

        <SiteFooter />
        </>

      ) : (
        /* ── Active chat ──────────────────────────────────────────────────── */
        <>
          <div className="flex-1 overflow-y-auto py-6 space-y-2 bg-bega-bg-1">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                sessionId={sessionId}
                isLast={idx === messages.length - 1}
                hasBom={lastBomReport != null}
                onSuggestedAction={handleSuggestedAction}
                onTourActiveChange={(active) => { tourActiveRef.current = active; }}
                onViewAlternatives={handleViewAlternatives}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex-shrink-0">
            <ChatInput onSend={handleTypedSend} isLoading={isLoading} onClear={handleNewChat} />
          </div>
        </>
      )}

      {/* {!isEmpty && <ShortlistButton onClick={handleCompareRequested} />} */}
      <ProductTour
        hasProducts={hasProducts}
        onActiveChange={(active) => { tourActiveRef.current = active; }}
      />
    </div>
  );
}
