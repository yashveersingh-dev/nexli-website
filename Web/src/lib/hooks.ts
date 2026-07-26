import { useCallback, useEffect, useRef, useState } from 'react';

/** Tracks the user's reduced-motion preference (live). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/** Fires once when the element scrolls into view (for reveal animations / lazy counters). */
export function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  // Stabilise options so callers that pass an inline object literal (e.g.
  // `useInView({ threshold: 0.5 })`) don't recreate the IntersectionObserver on
  // every render. We store them in a ref: the observer is created once on mount
  // and the initial options are stable for the element's lifetime (the hook fires
  // only once anyway — it unobserves on first intersection).
  const optionsRef = useRef(options);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2, ...optionsRef.current },
    );
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, inView };
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animated count-up to `target`, triggered when in view.
 * Respects reduced-motion (snaps to final value). GPU-friendly (text only).
 */
export function useCountUp(target: number, { duration = 1200, decimals = 0 } = {}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(target * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration, reduced]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
  return { ref, value, display };
}

/* =============================================================
   Overlay primitives — shared by Modal, Sheet, drawer, etc.
   ============================================================= */

/** Calls `handler` on Escape keydown while `active`. */
export function useEscapeKey(active: boolean, handler: () => void) {
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        saved.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}

/** Locks <body> scroll (compensating for the scrollbar) while `locked`. Ref-counted across overlays. */
let scrollLocks = 0;
let savedBodyStyle: { overflow: string; paddingRight: string } | null = null;
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (scrollLocks === 0) {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      savedBodyStyle = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };
      document.body.style.overflow = 'hidden';
      if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0 && savedBodyStyle) {
        document.body.style.overflow = savedBodyStyle.overflow;
        document.body.style.paddingRight = savedBodyStyle.paddingRight;
        savedBodyStyle = null;
      }
    };
  }, [locked]);
}

const FOCUSABLE =
  'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

/**
 * Traps focus inside the returned ref'd element while `active`. Moves focus in on
 * open, restores it to the previously-focused element on close, and cycles Tab.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusables[0] ?? node;
      first.focus({ preventScroll: true });
    };
    // Defer to allow the element to mount/transition.
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement;
      if (e.shiftKey && (activeEl === first || !node.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [active]);
  return ref;
}

/**
 * Drives mount/unmount with an exit transition: keeps the node mounted for
 * `duration`ms after `open` flips to false so CSS can animate out. Returns
 * `{ mounted, shown }` — render when `mounted`, toggle the open class with `shown`.
 */
export function usePresence(open: boolean, duration = 220) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      setMounted(true);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
    } else {
      setShown(false);
      timer = setTimeout(() => setMounted(false), reduced ? 0 : duration);
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (timer) clearTimeout(timer);
    };
  }, [open, duration, reduced]);

  return { mounted, shown };
}

/** Stable callback whose identity never changes but always calls the latest fn. */
export function useEvent<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current(...args), []);
}
