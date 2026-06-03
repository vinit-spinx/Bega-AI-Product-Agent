'use client';

import type { ImageAttachment } from '@/types';
import { FormEvent, KeyboardEvent, useRef, useState } from 'react';

interface ChatInputProps {
  onSend: (message: string, image?: ImageAttachment) => void;
  isLoading: boolean;
  onClear: () => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ChatInput({ onSend, isLoading, onClear }: ChatInputProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Submission ────────────────────────────────────────────────────────────

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed, image ?? undefined);
    setText('');
    setImage(null);
    setImageError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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

  // ── Image handling ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-selected after removal
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageError('Only JPEG, PNG, GIF and WebP images are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setImageError('Image must be smaller than 5 MB.');
      return;
    }

    setImageError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      // dataUrl = "data:<mime>;base64,<data>" — strip the prefix for the API
      const base64 = dataUrl.split(',')[1];
      setImage({ base64, mimeType: file.type, previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImage(null);
    setImageError(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="border-t border-zinc-700 bg-zinc-900 px-4 pt-2 pb-3">

      {/* Image preview strip */}
      {image && (
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-16 h-16 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.previewUrl}
              alt="Attached image"
              className="w-full h-full object-cover rounded-lg border border-zinc-600"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-700 border border-zinc-500
                         text-zinc-300 hover:text-white hover:bg-zinc-600 flex items-center justify-center
                         text-xs leading-none transition-colors"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
          <span className="text-xs text-zinc-400 truncate max-w-[160px]">
            {image.mimeType.replace('image/', '').toUpperCase()}
          </span>
        </div>
      )}

      {/* Error message */}
      {imageError && (
        <p className="text-xs text-red-400 mb-1.5">{imageError}</p>
      )}

      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Image attach button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          title="Attach an image (JPEG, PNG, GIF, WebP — max 5 MB)"
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                     bg-zinc-800 border border-zinc-600 text-zinc-400
                     hover:text-amber-400 hover:border-amber-500 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {/* Simple SVG image icon */}
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd"
              d="M1 5.5A2.5 2.5 0 013.5 3h13A2.5 2.5 0 0119 5.5v9A2.5 2.5 0 0116.5 17h-13A2.5 2.5 0 011 14.5v-9zm2.5-1A1.5 1.5 0 002 5.5v6.379l3.22-3.22a.75.75 0 011.061 0l3.47 3.47 1.47-1.47a.75.75 0 011.06 0L15 13.439V5.5A1.5 1.5 0 0013.5 4h-10zM2 14.5v-.44l3.75-3.75 3.47 3.47a.75.75 0 001.06 0l1.47-1.47 2.5 2.5H3.5A1.5 1.5 0 002 14.5zM13.5 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
              clipRule="evenodd" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={
            image
              ? 'Describe what you need for this image…'
              : 'Ask about BEGA luminaires, furniture, or projects… (e.g. \'Recommend lighting for a 5-star hotel entrance\')'
          }
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
    </div>
  );
}
