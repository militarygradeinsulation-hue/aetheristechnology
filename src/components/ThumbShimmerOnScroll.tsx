import { useEffect } from 'react';

/**
 * Fires the glass shimmer sweep across every `.thumb-frame` each time it
 * scrolls into the viewport. Elegant, one-shot per entry, retriggers on
 * subsequent scrolls. Respects prefers-reduced-motion.
 */
export const ThumbShimmerOnScroll = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const observed = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (!entry.isIntersecting) continue;
          if (el.classList.contains('thumb-shimmer')) continue;
          el.classList.add('thumb-shimmer');
          const clear = () => {
            el.classList.remove('thumb-shimmer');
            el.removeEventListener('animationend', clear);
          };
          el.addEventListener('animationend', clear);
          // Safety timeout in case animationend doesn't fire
          window.setTimeout(clear, 2200);
        }
      },
      { threshold: 0.35, rootMargin: '0px 0px -8% 0px' }
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>('.thumb-frame').forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
};

export default ThumbShimmerOnScroll;
