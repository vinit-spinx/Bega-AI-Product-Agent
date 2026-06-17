'use client';
import { useEffect, useRef } from 'react';

export function useCountUp(target: number, duration = 1.4, active = true) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || !ref.current || target === 0) {
      if (ref.current) ref.current.textContent = target.toLocaleString();
      return;
    }
    const el = ref.current;
    let cleanup: (() => void) | undefined;

    import('gsap').then(({ gsap }) => {
      const obj = { val: 0 };
      const tween = gsap.to(obj, {
        val: target,
        duration,
        ease: 'power3.out',
        onUpdate() { el.textContent = Math.round(obj.val).toLocaleString(); },
        onComplete() { el.textContent = target.toLocaleString(); },
      });
      cleanup = () => tween.kill();
    });

    return () => cleanup?.();
  }, [target, duration, active]);

  return ref;
}
