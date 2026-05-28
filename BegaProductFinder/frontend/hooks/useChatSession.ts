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

        case 'products':
          updateLastAssistantMessage(msg => ({
            ...msg,
            products: [...(msg.products ?? []), ...event.products],
          }));
          break;

        case 'furniture':
          updateLastAssistantMessage(msg => ({
            ...msg,
            furnitureItems: [...(msg.furnitureItems ?? []), ...event.items],
          }));
          break;

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

        case 'done':
          updateLastAssistantMessage(msg => ({ ...msg, isStreaming: false }));
          setIsLoading(false);
          break;

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
              handleSseEvent(event);
            } catch {
              // malformed SSE event — ignore
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
