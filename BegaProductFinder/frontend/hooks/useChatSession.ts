'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageAttachment, SseEvent, UiMessage } from '@/types';

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

function newAssistantMessage(contextImagePreview?: string): UiMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '',
    isStreaming: true,
    contextImagePreview,
  };
}

export interface UseChatSessionReturn {
  messages: UiMessage[];
  sessionId: string;
  isLoading: boolean;
  sendMessage: (message: string, image?: ImageAttachment) => Promise<void>;
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

        case 'placement_map':
          updateLastAssistantMessage(msg => ({
            ...msg,
            placementMap: event.markers,
          }));
          break;

        case 'done': {
          updateLastAssistantMessage(msg => {
            let content = msg.content;
            let suggestedActions = msg.suggestedActions;

            // Strip <suggested_actions> tag — parse into pills if not already received via SSE event
            const saMatch = content.match(/<suggested_actions>([\s\S]*?)<\/suggested_actions>/);
            if (saMatch) {
              try {
                const parsed = JSON.parse(saMatch[1].trim()) as string[];
                if (Array.isArray(parsed) && parsed.length > 0)
                  suggestedActions = parsed;
              } catch { /* ignore */ }
              content = content.replace(/<suggested_actions>[\s\S]*?<\/suggested_actions>/, '').trimEnd();
            }

            // Strip <placement_map> tag — placement_map SSE event handles the structured data
            content = content.replace(/<placement_map>[\s\S]*?<\/placement_map>/, '').trimEnd();

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
    async (text: string, image?: ImageAttachment) => {
      if (!text.trim() || isLoading) return;

      const userMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        imagePreview: image?.previewUrl,
        isStreaming: false,
      };
      // Pass the image preview to the assistant message so the response bubble
      // can render the visual context + best-product overlay without extra API calls.
      const assistantMsg = newAssistantMessage(image?.previewUrl);

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      try {
        const body: Record<string, unknown> = {
          sessionId: sessionIdRef.current,
          message: text.trim(),
        };
        if (image) {
          body.imageBase64 = image.base64;
          body.imageMimeType = image.mimeType;
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
    [isLoading, handleSseEvent, updateLastAssistantMessage], // image is a param, not state
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
