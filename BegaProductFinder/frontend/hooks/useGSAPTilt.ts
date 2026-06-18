'use client';
import { useEffect, useRef } from 'react';

/**
 * Subtle 3D tilt + lift on mouse move, powered by GSAP quickTo for buttery
 * 60fps interpolation. Attach the returned ref to any card-like element.
 */
export function useGSAPTilt<T extends HTMLElement = HTMLDivElement>(maxTilt = 6) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;

    import('gsap').then(({ gsap }) => {
      const xTo = gsap.quickTo(el, 'rotationY', { duration: 0.45, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'rotationX', { duration: 0.45, ease: 'power3.out' });
      const liftTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' });

      gsap.set(el, { transformPerspective: 600, transformStyle: 'preserve-3d' });

      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        xTo(px * maxTilt * 2);
        yTo(-py * maxTilt * 2);
        liftTo(-3);
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
        liftTo(0);
      };

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      cleanup = () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      };
    });

    return () => cleanup?.();
  }, [maxTilt]);

  return ref;
}
