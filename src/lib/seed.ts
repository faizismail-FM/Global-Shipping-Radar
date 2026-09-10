/**
 * Small deterministic PRNG (mulberry32). Used so the simulated dataset is
 * identical on every load, which keeps demo flows (search "EVER ACE", etc.)
 * predictable.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Float in [min, max). */
    range: (min: number, max: number) => min + next() * (max - min),
    /** Integer in [min, max]. */
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => {
      if (arr.length === 0) throw new Error('pick() on empty array');
      return arr[Math.floor(next() * arr.length)] as T;
    },
    chance: (p: number) => next() < p,
  };
}

export type Rng = ReturnType<typeof createRng>;
