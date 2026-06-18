'use client';
import { useEffect, useRef } from 'react';

export function useGSAPEntrance<T extends HTMLElement = HTMLDivElement>(stagger = 0.07, deps: unknown[] = []) {
  const ref = useRef<T>(null);

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

/**
 * Fades a single element in on mount. Previously used ScrollTrigger to defer the
 * animation until scrolled into view, but that broke in two ways once content moved
 * into shorter, segmented panels: (1) ScrollTrigger's trigger-point calculation could
 * run before async data finished loading and shifted the layout, leaving the threshold
 * stale and the animation never firing — element stuck at opacity:0 forever; (2) the
 * cleanup called `ScrollTrigger.getAll().forEach(t => t.kill())`, which kills *every*
 * ScrollTrigger on the page, not just this instance's — so one component unmounting
 * (e.g. a Strict Mode double-invoke, or a sibling panel swap) silently broke every
 * other still-visible reveal animation. Plain `gsap.from()` has neither failure mode.
 */
export function useGSAPScrollReveal<T extends HTMLElement = HTMLDivElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cleanup: (() => void) | undefined;

    import('gsap').then(({ gsap }) => {
      const anim = gsap.from(ref.current, {
        y: 28,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
      cleanup = () => anim.kill();
    });

    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
