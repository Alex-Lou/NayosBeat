/**
 * Small deterministic random generator (mulberry32): the same seed always gives the same
 * sequence, so CPU matches can be replayed exactly.
 * Returns a value in [0, 1) and the next seed.
 */
export function nextRandom(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}
