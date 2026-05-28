'use client';

import { FormEvent, KeyboardEvent, useRef, useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onClear: () => void;
}

export default function ChatInput({ onSend, isLoading, onClear }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-zinc-700 bg-zinc-900 px-4 py-3 flex items-end gap-3"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Ask about BEGA luminaires, furniture, or projects… (e.g. 'Recommend lighting for a 5-star hotel entrance')"
        rows={1}
        disabled={isLoading}
        className="flex-1 resize-none rounded-xl bg-zinc-800 border border-zinc-600 px-4 py-3
                   text-zinc-100 placeholder-zinc-500 text-sm leading-relaxed
                   focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   max-h-40 overflow-y-auto"
      />

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500
                     text-zinc-900 font-semibold text-sm px-4 py-2.5 transition-colors
                     disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isLoading ? 'Thinking…' : 'Send'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={isLoading}
          className="rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600
                     text-zinc-400 hover:text-zinc-200 text-xs px-4 py-1.5 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          New chat
        </button>
      </div>
    </form>
  );
}
