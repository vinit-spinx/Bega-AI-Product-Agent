'use client';
import { useEffect, useRef } from 'react';

interface Props {
  eyebrow: string;
  title: string;
  description: string;
}

/**
 * Lightweight animated banner — replaces the old Three.js/WebGL canvas.
 * Motion comes from two blurred gradient orbs animated with GSAP using only
 * `transform`/`opacity` (GPU-accelerated, no canvas context, no extra bundle weight).
 */
export default function AnimatedBanner({ eyebrow, title, description }: Props) {
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import('gsap').then(({ gsap }) => {
      const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
      tl.to(orb1Ref.current, { x: 40, y: -20, scale: 1.15, duration: 6 }, 0)
        .to(orb2Ref.current, { x: -30, y: 25, scale: 1.1, duration: 7 }, 0);
      cleanup = () => tl.kill();
    });
    return () => cleanup?.();
  }, []);

  return (
    <div className="relative bg-bega-black rounded-2xl px-6 pt-6 pb-7 overflow-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        <div ref={orb1Ref} className="absolute -top-10 left-1/4 w-56 h-56 rounded-full bg-white/[0.06] blur-3xl" />
        <div ref={orb2Ref} className="absolute -bottom-16 right-1/4 w-64 h-64 rounded-full bg-white/[0.05] blur-3xl" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">{eyebrow}</p>
        </div>
        <h1 className="font-serif text-[24px] font-semibold text-white tracking-tight mb-1">{title}</h1>
        <p className="text-[12px] text-white/50 max-w-xl">{description}</p>
      </div>
    </div>
  );
}
