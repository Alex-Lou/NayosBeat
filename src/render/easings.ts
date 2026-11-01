/**
 * Penner's easings in closed form (easings.net; docs/polish/AUDIT-ET-PLAN.md §3.0): `t` from 0 to
 * 1, the age of an effect in whole ticks over its length, so a frame shows the same at any rate.
 */

/** Fast, then settling: 0, 0.42, 0.88, 0.98, 1 over 4 steps. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** How far easeOutBack overshoots (Penner's 1.70158: a peak of 110 %, at about t = 0.58). */
const BACK = 1.70158;

/** An arrival that bounces: past 1 (1.1 at its peak), then back to it. */
export function easeOutBack(t: number): number {
  const u = t - 1;
  return 1 + (BACK + 1) * u ** 3 + BACK * u ** 2;
}
