'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SseEvent, UiMessage } from '@/types';

const SESSION_KEY = 'bega_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID();
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function newAssistantMessage(): UiMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '',
    isStreaming: true,
  };
}

export interface UseChatSessionReturn {
  messages: UiMessage[];
  sessionId: string;
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearSession: () => void;
}

export function useChatSession(): UseChatSessionReturn {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  const updateLastAssistantMessage = useCallback((updater: (msg: UiMessage) => UiMessage) => {
    setMessages(prev => {
      const idx = prev.findLastIndex(m => m.role === 'assistant');
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = updater(updated[idx]);
      return updated;
    });
  }, []);

  const handleSseEvent = useCallback(
    (event: SseEvent) => {
      switch (event.type) {
        case 'text_delta':
          updateLastAssistantMessage(msg => ({
            ...msg,
            content: msg.content + event.content,
          }));
          break;

        case 'products': {
          console.log('[SSE] products event received, count:', event.products?.length, event.products?.map(p => p.productId));
          updateLastAssistantMessage(msg => {
            const existing = msg.products ?? [];
            const newProducts = event.products ?? [];
            // Deduplicate by catalogNumber (more reliable than productId which may be 0)
            const seenKeys = new Set(existing.map(p => p.catalogNumber));
            const deduped = newProducts.filter(p => !seenKeys.has(p.catalogNumber));
            return { ...msg, products: [...existing, ...deduped] };
          });
          break;
        }

        case 'furniture': {
          console.log('[SSE] furniture event received, count:', event.items?.length);
          updateLastAssistantMessage(msg => {
            const existing = msg.furnitureItems ?? [];
            const newItems = event.items ?? [];
            const seenKeys = new Set(existing.map(p => p.catalogNumber));
            const deduped = newItems.filter(p => !seenKeys.has(p.catalogNumber));
            return { ...msg, furnitureItems: [...existing, ...deduped] };
          });
          break;
        }

        case 'project_recommendation':
          updateLastAssistantMessage(msg => ({
            ...msg,
            projectAreas: event.areas,
          }));
          break;

        case 'bom':
          updateLastAssistantMessage(msg => ({
            ...msg,
            bomReport: event.report,
          }));
          break;

        case 'suggested_actions':
          updateLastAssistantMessage(msg => ({
            ...msg,
            suggestedActions: event.actions,
          }));
          break;

        case 'done': {
          updateLastAssistantMessage(msg => {
            // Extract <suggested_actions>[...]</suggested_actions> that Claude emits inline
            // in the text stream, parse it into clickable pills, and strip it from the bubble.
            const match = msg.content.match(/<suggested_actions>([\s\S]*?)<\/suggested_actions>/);
            let content = msg.content;
            let suggestedActions = msg.suggestedActions;
            if (match) {
              try {
                const parsed = JSON.parse(match[1].trim()) as string[];
                if (Array.isArray(parsed) && parsed.length > 0)
                  suggestedActions = parsed;
              } catch { /* malformed JSON — ignore */ }
              content = content.replace(/<suggested_actions>[\s\S]*?<\/suggested_actions>/, '').trimEnd();
            }
            return { ...msg, isStreaming: false, content, suggestedActions };
          });
          setIsLoading(false);
          break;
        }

        case 'error':
          updateLastAssistantMessage(msg => ({
            ...msg,
            isStreaming: false,
            error: event.message,
          }));
          setIsLoading(false);
          break;
      }
    },
    [updateLastAssistantMessage],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        isStreaming: false,
      };
      const assistantMsg = newAssistantMessage();

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            message: text.trim(),
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const event = JSON.parse(data) as SseEvent;
              if (event.type !== 'text_delta') console.log('[SSE] event:', event.type, event);
              handleSseEvent(event);
            } catch (err) {
              console.warn('[SSE] parse error:', err, 'raw:', data.slice(0, 200));
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Connection error';
        updateLastAssistantMessage(msg => ({
          ...msg,
          isStreaming: false,
          error: message,
        }));
        setIsLoading(false);
      }
    },
    [isLoading, handleSseEvent, updateLastAssistantMessage],
  );

  const clearSession = useCallback(() => {
    const newId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, newId);
    sessionIdRef.current = newId;
    setMessages([]);
    setIsLoading(false);
  }, []);

  return {
    messages,
    sessionId: sessionIdRef.current,
    isLoading,
    sendMessage,
    clearSession,
  };
}
