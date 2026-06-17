'use client';
import { useEffect, useRef } from 'react';

export function useGSAPEntrance(stagger = 0.07, deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const children = Array.from(ref.current.children);
    if (!children.length) return;

    let cleanup: (() => void) | undefined;

    import('gsap').then(({ gsap }) => {
      const tl = gsap.timeline();
      tl.from(children, {
        y: 24,
        opacity: 0,
        duration: 0.45,
        stagger,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
      cleanup = () => tl.kill();
    });

    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

export function useGSAPScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cleanup: (() => void) | undefined;

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);
        const anim = gsap.from(ref.current!, {
          y: 32,
          opacity: 0,
          duration: 0.55,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: ref.current!,
            start: 'top 88%',
            once: true,
          },
        });
        cleanup = () => { anim.kill(); ScrollTrigger.getAll().forEach(t => t.kill()); };
      }
    );

    return () => cleanup?.();
  }, []);

  return ref;
}
