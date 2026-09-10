import { useSyncExternalStore, useRef } from 'react';

export type Listener = () => void;

export interface Store<T> {
  getState(): T;
  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: Listener): () => void;
}

/** Minimal external store with selector-based React subscriptions. */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    setState(partial) {
      const next = typeof partial === 'function' ? partial(state) : partial;
      if (!next) return;
      let changed = false;
      for (const key in next) {
        if (!Object.is((state as Record<string, unknown>)[key], (next as Record<string, unknown>)[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

/**
 * Subscribe to a slice of a store. The selector result is compared with
 * shallow equality so selectors may return fresh objects/arrays without
 * causing render loops.
 */
export function useStore<T extends object, S>(
  store: Store<T>,
  selector: (state: T) => S,
  equalityFn: (a: S, b: S) => boolean = shallowEqual,
): S {
  const cache = useRef<{ state: T; selected: S } | null>(null);
  const getSnapshot = () => {
    const state = store.getState();
    const c = cache.current;
    if (c && c.state === state) return c.selected;
    const selected = selector(state);
    if (c && equalityFn(c.selected, selected)) {
      cache.current = { state, selected: c.selected };
      return c.selected;
    }
    cache.current = { state, selected };
    return selected;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
