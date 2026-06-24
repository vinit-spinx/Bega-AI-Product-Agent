'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useChatSession } from '@/hooks/useChatSession';
import { useHeroContent } from '@/hooks/useAdminStore';
import { ShortlistProvider, useShortlist } from '@/context/ShortlistContext';
import CompareDrawer from '@/components/product/CompareDrawer';
import ChatInput from '@/components/chat/ChatInput';
import MessageBubble from '@/components/chat/MessageBubble';
import ShortlistButton from '@/components/chat/ShortlistButton';
import ProductTour from '@/components/tour/ProductTour';
import SuggestionCards from '@/components/chat/SuggestionCards';

// How long the light takes to fully expand — content fade-in below uses the exact
// same delay/duration/ease so both animations run on an identical timeline.
const GLOW_DELAY = 0.3;
const GLOW_DURATION = 0.8;
const GLOW_TRANSITION = { ease: 'easeInOut' as const, delay: GLOW_DELAY, duration: GLOW_DURATION };

// Animated white "lamp" glow on a black backdrop — same lamp-effect technique as the
// shadcn Hero block, recolored to white-on-black instead of using the primary token.
//
// Each beam animates via `scale` (a transform), never `width` — animating `width` on
// a blurred element forces the browser to re-layout and repaint the whole blurred
// region every frame, which is what produced the jerky/stuttery expansion on load.
// Transforms are compositor-only, so the same visual expansion stays smooth.
function WhiteGlow() {
  const transition = GLOW_TRANSITION;

  return (
    <div className="absolute top-0 isolate z-0 flex w-screen flex-1 items-start justify-center pointer-events-none">
      <div className="absolute top-0 z-50 h-48 w-screen bg-transparent opacity-10 backdrop-blur-md" />

      {/* Main glow — bright core directly under the source */}
      <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-[-30%] rounded-full bg-white/45 opacity-65 blur-3xl" />

      {/* Lamp effect — grows from the center, so scale on both axes is fine */}
      <motion.div
        initial={{ scaleX: 0.5 }}
        animate={{ scaleX: 1 }}
        transition={transition}
        className="absolute top-0 z-30 h-36 w-64 -translate-y-[20%] rounded-full bg-white/50 blur-2xl"
      />

      {/* Top line — grows from the center */}
      <motion.div
        initial={{ scaleX: 0.5 }}
        animate={{ scaleX: 1 }}
        transition={transition}
        className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[-10%] bg-white/60"
      />

      {/* Left gradient cone — anchored to the right edge, grows leftward */}
      <motion.div
        initial={{ opacity: 0.5, scaleX: 0.5 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={transition}
        style={{
          backgroundImage:
            'conic-gradient(from 70deg at center top, rgba(255,255,255,0.5), transparent, transparent)',
          // Bright near the source, then a long, gradual taper that reaches all the
          // way down to the description copy — a real light beam dissipating with
          // distance rather than a short beam that cuts off abruptly.
          maskImage: 'linear-gradient(to bottom, white 0%, rgba(255,255,255,0.65) 30%, rgba(255,255,255,0.2) 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, white 0%, rgba(255,255,255,0.65) 30%, rgba(255,255,255,0.2) 70%, transparent 100%)',
          transformOrigin: 'right center',
        }}
        className="absolute inset-auto right-1/2 h-[56rem] overflow-visible w-[30rem]"
      >
        <div className="absolute w-[100%] left-0 bg-black h-[26rem] bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        <div className="absolute w-40 h-[100%] left-0 bg-black bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
      </motion.div>

      {/* Right gradient cone — anchored to the left edge, grows rightward */}
      <motion.div
        initial={{ opacity: 0.5, scaleX: 0.5 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={transition}
        style={{
          backgroundImage:
            'conic-gradient(from 290deg at center top, transparent, transparent, rgba(255,255,255,0.5))',
          // Bright near the source, then a long, gradual taper that reaches all the
          // way down to the description copy — a real light beam dissipating with
          // distance rather than a short beam that cuts off abruptly.
          maskImage: 'linear-gradient(to bottom, white 0%, rgba(255,255,255,0.65) 30%, rgba(255,255,255,0.2) 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, white 0%, rgba(255,255,255,0.65) 30%, rgba(255,255,255,0.2) 70%, transparent 100%)',
          transformOrigin: 'left center',
        }}
        className="absolute inset-auto left-1/2 h-[56rem] w-[30rem]"
      >
        <div className="absolute w-40 h-[100%] right-0 bg-black bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
        <div className="absolute w-[100%] right-0 bg-black h-[26rem] bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
      </motion.div>
    </div>
  );
}

// Standalone /new-ui experience — reuses the real BEGA chat input, suggestion pills,
// and message rendering, but on a black backdrop with an animated white glow instead
// of the default light theme used on /chat. /chat itself is untouched.
export default function NewUiPage() {
  return (
    <ShortlistProvider>
      <NewUiContent />
    </ShortlistProvider>
  );
}

function NewUiContent() {
  const { messages, sessionId, isLoading, sendMessage, clearSession } = useChatSession();
  const { clearAll: clearShortlist } = useShortlist();
  const hero = useHeroContent();
  const bottomRef = useRef<HTMLDivElement>(null);
  const tourActiveRef = useRef(false);

  useEffect(() => {
    if (tourActiveRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = useCallback(() => {
    clearSession();
    clearShortlist();
  }, [clearSession, clearShortlist]);

  const isEmpty = messages.length === 0;
  const hasProducts = messages.some(m => (m.products?.length ?? 0) > 0);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-black flex-shrink-0">
        <button
          type="button"
          onClick={handleNewChat}
          disabled={isLoading}
          title="New chat"
          className="flex items-center gap-3 group transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="72" height="25" viewBox="0 0 89 27" fill="none" xmlns="http://www.w3.org/2000/svg"
               className="transition-opacity group-hover:opacity-60">
            <g fill="#FFFFFF" fillRule="evenodd">
              <path d="M5.007,5.386 L5.007,11.272 C5.085,11.278 5.147,11.289 5.21,11.289 C6.935,11.289 8.661,11.304 10.387,11.284 C11.325,11.273 12.221,11.047 13.027,10.538 C13.776,10.064 14.208,9.391 14.226,8.477 C14.244,7.507 13.979,6.661 13.169,6.064 C12.45,5.534 11.617,5.374 10.753,5.371 C8.935,5.364 7.117,5.38 5.299,5.386 C5.208,5.387 5.118,5.386 5.007,5.386 Z M5.005,22.619 C5.102,22.625 5.183,22.635 5.265,22.635 C7.028,22.635 8.791,22.651 10.554,22.626 C11.086,22.618 11.63,22.55 12.146,22.418 C13.243,22.137 14.134,21.561 14.57,20.432 C14.806,19.82 14.825,19.181 14.755,18.546 C14.624,17.356 14.049,16.448 12.978,15.899 C12.246,15.524 11.462,15.37 10.643,15.372 C8.862,15.375 7.08,15.374 5.298,15.375 C5.201,15.375 5.103,15.375 5.005,15.375 Z M0,1.056 C0.092,1.049 0.184,1.035 0.276,1.035 C4.388,1.034 8.501,1.015 12.613,1.044 C14.357,1.056 15.953,1.588 17.286,2.773 C18.29,3.666 18.827,4.821 18.993,6.151 C19.126,7.21 19.141,8.272 18.798,9.298 C18.31,10.762 17.29,11.79 16.047,12.621 C15.946,12.688 15.843,12.751 15.742,12.816 C15.735,12.821 15.732,12.831 15.712,12.861 C15.795,12.907 15.877,12.953 15.961,12.997 C17.725,13.921 19.057,15.24 19.691,17.19 C20.037,18.254 20.048,19.351 19.929,20.449 C19.807,21.567 19.511,22.635 18.921,23.602 C17.958,25.18 16.521,26.093 14.798,26.598 C13.895,26.862 12.969,26.982 12.029,26.982 C8.084,26.983 4.138,26.982 0.193,26.983 Z"/>
              <path d="M52.876,27 C52.444,26.93 52.009,26.873 51.579,26.787 C48.16,26.103 45.606,24.209 43.867,21.2 C42.927,19.573 42.404,17.804 42.161,15.944 C41.996,14.678 41.95,13.41 42.06,12.139 C42.337,8.965 43.302,6.059 45.449,3.637 C47.139,1.732 49.254,0.581 51.765,0.163 C52.116,0.105 52.469,0.054 52.821,0 L54.919,0 C55.279,0.054 55.64,0.105 56,0.162 C59.703,0.749 62.382,2.719 64.001,6.116 C64.424,7.004 64.731,7.933 64.968,8.945 L60.154,8.95 C59.822,7.76 59.047,6.863 58.375,6.098 C57.476,5.074 56.333,4.545 54.988,4.406 C53.194,4.221 51.574,4.619 50.195,5.82 C49.015,6.849 48.302,8.176 47.857,9.655 C47.33,11.405 47.214,13.193 47.399,15.008 C47.549,16.486 47.906,17.902 48.626,19.208 C49.555,20.891 50.894,22.072 52.817,22.461 C55.96,23.097 58.577,21.458 59.777,18.82 C60.07,18.176 60.274,17.503 60.388,16.776 L54.446,16.776 L54.446,12.658 L65,12.658 L65,26.376 L60.941,26.376 C60.87,25.301 60.8,24.226 60.726,23.096 C60.466,23.44 60.258,23.741 60.024,24.02 C58.645,25.666 56.922,26.696 54.77,26.952 Z"/>
              <path d="M77.515,6.562 C76.491,10.14 75.479,13.675 74.463,17.223 L80.548,17.223 C79.535,13.66 78.528,10.123 77.515,6.562 Z M89,27 C87.95,26.984 86.265,26.98 83.946,26.99 C83.684,26.995 83.59,26.896 83.511,26.66 C82.937,24.955 82.349,23.256 81.774,21.552 C81.711,21.364 81.631,21.298 81.433,21.298 C78.77,21.306 76.106,21.308 73.443,21.296 C73.211,21.295 73.135,21.384 73.071,21.589 C72.533,23.315 71.985,25.037 71.445,26.763 C71.4,26.905 71.355,26.986 71.191,26.985 C69.506,26.98 67.821,26.982 66.136,26.981 C66.034,26.862 66.055,26.777 66.083,26.693 C68.917,18.238 71.752,9.784 74.581,1.328 C74.655,1.107 74.745,1.027 74.975,1.028 C76.661,1.039 78.346,1.04 80.031,1.028 C80.264,1.027 80.35,1.111 80.423,1.329 C83.238,9.741 86.06,18.151 88.882,26.56 Z"/>
              <polygon points="23 26 23 1 41 1 41 5.18 28.111 5.18 28.111 10.356 39.469 10.356 39.469 14.548 28.111 14.548 28.111 21.827 41 21.827 41 26"/>
            </g>
          </svg>
          <span className="hidden sm:block w-px h-5 bg-white/20" />
          <span className="hidden sm:block text-[11px] text-white/50 tracking-widest uppercase font-medium">
            AI Product Advisor
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`inline-flex w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLoading ? 'bg-white/40 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-[11px] text-white/50 tracking-wide hidden sm:block">
            {isLoading ? 'Processing…' : 'Ready'}
          </span>
        </div>
      </header>

      {isEmpty ? (
        /* ── Hero landing — black backdrop, animated white glow ──────────── */
        <div className="relative flex-1 overflow-hidden bg-black">
          <WhiteGlow />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={GLOW_TRANSITION}
            className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-12"
          >
            <div className="flex flex-col items-center mb-10 relative z-10">
              <div>
                <svg width="108" height="33" viewBox="0 0 89 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g fill="#FFFFFF" fillRule="evenodd">
                    <path d="M5.007,5.386 L5.007,11.272 C5.085,11.278 5.147,11.289 5.21,11.289 C6.935,11.289 8.661,11.304 10.387,11.284 C11.325,11.273 12.221,11.047 13.027,10.538 C13.776,10.064 14.208,9.391 14.226,8.477 C14.244,7.507 13.979,6.661 13.169,6.064 C12.45,5.534 11.617,5.374 10.753,5.371 C8.935,5.364 7.117,5.38 5.299,5.386 C5.208,5.387 5.118,5.386 5.007,5.386 Z M5.005,22.619 C5.102,22.625 5.183,22.635 5.265,22.635 C7.028,22.635 8.791,22.651 10.554,22.626 C11.086,22.618 11.63,22.55 12.146,22.418 C13.243,22.137 14.134,21.561 14.57,20.432 C14.806,19.82 14.825,19.181 14.755,18.546 C14.624,17.356 14.049,16.448 12.978,15.899 C12.246,15.524 11.462,15.37 10.643,15.372 C8.862,15.375 7.08,15.374 5.298,15.375 C5.201,15.375 5.103,15.375 5.005,15.375 Z M0,1.056 C0.092,1.049 0.184,1.035 0.276,1.035 C4.388,1.034 8.501,1.015 12.613,1.044 C14.357,1.056 15.953,1.588 17.286,2.773 C18.29,3.666 18.827,4.821 18.993,6.151 C19.126,7.21 19.141,8.272 18.798,9.298 C18.31,10.762 17.29,11.79 16.047,12.621 C15.946,12.688 15.843,12.751 15.742,12.816 C15.735,12.821 15.732,12.831 15.712,12.861 C15.795,12.907 15.877,12.953 15.961,12.997 C17.725,13.921 19.057,15.24 19.691,17.19 C20.037,18.254 20.048,19.351 19.929,20.449 C19.807,21.567 19.511,22.635 18.921,23.602 C17.958,25.18 16.521,26.093 14.798,26.598 C13.895,26.862 12.969,26.982 12.029,26.982 C8.084,26.983 4.138,26.982 0.193,26.983 Z"/>
                    <path d="M52.876,27 C52.444,26.93 52.009,26.873 51.579,26.787 C48.16,26.103 45.606,24.209 43.867,21.2 C42.927,19.573 42.404,17.804 42.161,15.944 C41.996,14.678 41.95,13.41 42.06,12.139 C42.337,8.965 43.302,6.059 45.449,3.637 C47.139,1.732 49.254,0.581 51.765,0.163 C52.116,0.105 52.469,0.054 52.821,0 L54.919,0 C55.279,0.054 55.64,0.105 56,0.162 C59.703,0.749 62.382,2.719 64.001,6.116 C64.424,7.004 64.731,7.933 64.968,8.945 L60.154,8.95 C59.822,7.76 59.047,6.863 58.375,6.098 C57.476,5.074 56.333,4.545 54.988,4.406 C53.194,4.221 51.574,4.619 50.195,5.82 C49.015,6.849 48.302,8.176 47.857,9.655 C47.33,11.405 47.214,13.193 47.399,15.008 C47.549,16.486 47.906,17.902 48.626,19.208 C49.555,20.891 50.894,22.072 52.817,22.461 C55.96,23.097 58.577,21.458 59.777,18.82 C60.07,18.176 60.274,17.503 60.388,16.776 L54.446,16.776 L54.446,12.658 L65,12.658 L65,26.376 L60.941,26.376 C60.87,25.301 60.8,24.226 60.726,23.096 C60.466,23.44 60.258,23.741 60.024,24.02 C58.645,25.666 56.922,26.696 54.77,26.952 Z"/>
                    <path d="M77.515,6.562 C76.491,10.14 75.479,13.675 74.463,17.223 L80.548,17.223 C79.535,13.66 78.528,10.123 77.515,6.562 Z M89,27 C87.95,26.984 86.265,26.98 83.946,26.99 C83.684,26.995 83.59,26.896 83.511,26.66 C82.937,24.955 82.349,23.256 81.774,21.552 C81.711,21.364 81.631,21.298 81.433,21.298 C78.77,21.306 76.106,21.308 73.443,21.296 C73.211,21.295 73.135,21.384 73.071,21.589 C72.533,23.315 71.985,25.037 71.445,26.763 C71.4,26.905 71.355,26.986 71.191,26.985 C69.506,26.98 67.821,26.982 66.136,26.981 C66.034,26.862 66.055,26.777 66.083,26.693 C68.917,18.238 71.752,9.784 74.581,1.328 C74.655,1.107 74.745,1.027 74.975,1.028 C76.661,1.039 78.346,1.04 80.031,1.028 C80.264,1.027 80.35,1.111 80.423,1.329 C83.238,9.741 86.06,18.151 88.882,26.56 Z"/>
                    <polygon points="23 26 23 1 41 1 41 5.18 28.111 5.18 28.111 10.356 39.469 10.356 39.469 14.548 28.111 14.548 28.111 21.827 41 21.827 41 26"/>
                  </g>
                </svg>
              </div>

              <div className="w-12 h-px bg-white/20 mt-7 mb-7" />

              <h2 className="text-[42px] font-normal text-white tracking-tight text-center leading-tight">
                {hero.title}
              </h2>
              {hero.description && (
                <p className="text-[11px] text-white/50 tracking-[0.22em] uppercase mt-4 text-center max-w-xl">
                  {hero.description}
                </p>
              )}
            </div>

            {/* ── Input + suggestion grid ── */}
            <div className="w-full max-w-2xl relative z-10 mt-2">
              <ChatInput onSend={sendMessage} isLoading={isLoading} onClear={handleNewChat} variant="hero" />
              <SuggestionCards onSend={sendMessage} />
            </div>
          </motion.div>
        </div>
      ) : (
        /* ── Active chat ──────────────────────────────────────────────────── */
        <>
          <div className="flex-1 overflow-y-auto py-6 space-y-2 bg-black">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                sessionId={sessionId}
                onSuggestedAction={sendMessage}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex-shrink-0">
            <ChatInput onSend={sendMessage} isLoading={isLoading} onClear={handleNewChat} />
          </div>
        </>
      )}

      {!isEmpty && <ShortlistButton />}
      <ProductTour
        hasProducts={hasProducts}
        onActiveChange={(active) => { tourActiveRef.current = active; }}
      />
      <CompareDrawer />
    </div>
  );
}
