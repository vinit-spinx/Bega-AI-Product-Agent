'use client';

import type { ImageAttachment } from '@/types';
import { FormEvent, KeyboardEvent, useRef, useState } from 'react';

interface ChatInputProps {
  onSend: (message: string, image?: ImageAttachment) => void;
  isLoading: boolean;
  onClear: () => void;
  /** 'hero'  — centered landing input (rounded box, no top border, no New Chat button)
   *  'bar'   — bottom-of-chat input bar (default) */
  variant?: 'hero' | 'bar';
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ChatInput({ onSend, isLoading, onClear, variant = 'bar' }: ChatInputProps) {
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

  const isHero = variant === 'hero';

  const imagePreviewStrip = image && (
    <div className="flex items-center gap-2 mb-3">
      <div className="relative w-14 h-14 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.previewUrl}
          alt="Attached image"
          className="w-full h-full object-cover rounded-md border border-bega-border-2"
        />
        <button
          type="button"
          onClick={clearImage}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bega-black text-white
                     hover:bg-bega-text-2 flex items-center justify-center
                     text-[10px] leading-none transition-colors"
          aria-label="Remove image"
        >
          ✕
        </button>
      </div>
      <span className="text-xs text-bega-text-3 truncate max-w-[160px]">
        {image.mimeType.replace('image/', '').toUpperCase()}
      </span>
    </div>
  );

  const hiddenFileInput = (
    <input
      ref={fileRef}
      type="file"
      accept={ACCEPTED_TYPES.join(',')}
      onChange={handleFileChange}
      className="hidden"
    />
  );

  const attachButton = (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={isLoading}
      title="Attach an image (JPEG, PNG, GIF, WebP — max 5 MB)"
      className="flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center
                 border border-bega-border-2 bg-white text-bega-text-3
                 hover:text-bega-black hover:border-bega-black/50
                 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd"
          d="M1 5.5A2.5 2.5 0 013.5 3h13A2.5 2.5 0 0119 5.5v9A2.5 2.5 0 0116.5 17h-13A2.5 2.5 0 011 14.5v-9zm2.5-1A1.5 1.5 0 002 5.5v6.379l3.22-3.22a.75.75 0 011.061 0l3.47 3.47 1.47-1.47a.75.75 0 011.06 0L15 13.439V5.5A1.5 1.5 0 0013.5 4h-10zM2 14.5v-.44l3.75-3.75 3.47 3.47a.75.75 0 001.06 0l1.47-1.47 2.5 2.5H3.5A1.5 1.5 0 002 14.5zM13.5 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
          clipRule="evenodd" />
      </svg>
    </button>
  );

  // ── Hero variant (centered landing page) ─────────────────────────────────
  if (isHero) {
    return (
      
      <div className="rounded-2xl border border-bega-border-2 bg-white
                      shadow-[0_4px_24px_0_rgb(0_0_0/0.08)] overflow-hidden">
        {hiddenFileInput}

        {imagePreviewStrip && (
          <div className="px-4 pt-3">{imagePreviewStrip}</div>
        )}
        {imageError && (
          <p className="text-xs text-red-600 px-4 pt-2">{imageError}</p>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 py-3">
          
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={
              image
                ? 'Describe what you need for this image…'
                : 'Ask about BEGA luminaires, furniture, or projects…'
            }
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-bega-text-1
                       placeholder-bega-text-3 text-sm leading-relaxed
                       focus:outline-none
                       disabled:opacity-50 disabled:cursor-not-allowed
                       max-h-40 overflow-y-auto"
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            {attachButton}
            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-bega-black hover:bg-bega-text-2 text-white
                         flex items-center justify-center transition-colors shadow-button
                         disabled:bg-bega-bg-3 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Bar variant (bottom of chat, default) ─────────────────────────────────
  return (
    <div className="border-t border-bega-border-1 bg-white px-4 pt-3 pb-3">
      {hiddenFileInput}

      {imagePreviewStrip && (
        <div className="mb-3">{imagePreviewStrip}</div>
      )}
      {imageError && (
        <p className="text-xs text-red-600 mb-2">{imageError}</p>
      )}

      {/* Rounded input box — matches hero variant quality */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-bega-border-2 bg-white
                   shadow-[0_2px_12px_0_rgb(0_0_0/0.06)] flex items-end gap-2 px-4 py-3
                   focus-within:border-bega-border-3 transition-colors"
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={
            image
              ? 'Describe what you need for this image…'
              : 'Ask about BEGA luminaires, furniture, or projects…'
          }
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none bg-transparent text-bega-text-1
                     placeholder-bega-text-3 text-sm leading-relaxed
                     focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     max-h-40 overflow-y-auto"
        />

        <div className="flex items-center gap-2 flex-shrink-0">
          {attachButton}
          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className="w-9 h-9 rounded-full bg-bega-black hover:bg-bega-text-2 text-white
                       flex items-center justify-center transition-colors shadow-button
                       disabled:bg-bega-bg-3 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* New chat — small text link below the input box */}
      {/* <div className="flex justify-end mt-1.5 pr-1">
        <button
          type="button"
          onClick={onClear}
          disabled={isLoading}
          className="text-[11px] text-bega-text-3 hover:text-bega-text-2
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          New chat
        </button>
      </div> */}
    </div>
  );
}
