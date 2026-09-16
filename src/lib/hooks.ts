import { useEffect, useRef, useState } from 'react';
import { getEngine, hasEngine, type SimulationState } from '@/lib/simulation';
import { useStore } from '@/lib/store/createStore';

/** Subscribe to a slice of the simulation state. Must be used after boot. */
export function useSimulation<S>(selector: (s: SimulationState) => S): S {
  return useStore(getEngine().store, selector);
}

export function useSimulationReady(): boolean {
  return hasEngine();
}

/** Re-render on an interval (for relative timestamps). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsCompact = () => useMediaQuery('(max-width: 1100px)');

/**
 * Smoothly animate a number towards its target value. A duration of 0 (or
 * less) returns the value immediately. The final value is always settled by a
 * timer, so the display never sticks mid-way if animation frames stall (hidden
 * tab, busy WebGL frame budget).
 */
export function useAnimatedNumber(value: number, duration = 600): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const animate = duration > 0;
  useEffect(() => {
    if (!animate) {
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    if (from === value) return;
    startRef.current = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) frameRef.current = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(step);
    const settle = setTimeout(() => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      fromRef.current = value;
      setDisplay(value);
    }, duration + 50);
    return () => {
      clearTimeout(settle);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, duration, animate]);
  return animate ? display : value;
}

/** Resolve a promise with a minimum display time for loading states. */
export function useAsync<T>(factory: () => Promise<T>, deps: unknown[], minMs = 0) {
  const [state, setState] = useState<{ loading: boolean; data: T | null; error: string | null }>({ loading: true, data: null, error: null });
  useEffect(() => {
    let cancelled = false;
    const started = performance.now();
    setState({ loading: true, data: null, error: null });
    factory()
      .then(async (data) => {
        const elapsed = performance.now() - started;
        if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
        if (!cancelled) setState({ loading: false, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ loading: false, data: null, error: err instanceof Error ? err.message : 'Unknown error' });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useEscape(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, enabled]);
}

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [ref, handler, enabled]);
}
