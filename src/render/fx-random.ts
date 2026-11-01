/**
 * The effects' randomness, seeded (docs/polish/AUDIT-ET-PLAN.md §3.0, L11): each tick starts
 * afresh from its own number, so the same tick plays the same sparks whatever came before it.
 * Two films of a fight, before and after a change, then differ only where the change is, and
 * the measures of the effects' areas hold from one run to the next. mulberry32, as the shake's.
 */
export class FxRandom {
  constructor(private seed = 1) {}

  /** Starts `tick`'s effects afresh. */
  reseed(tick: number): void {
    // Spread the ticks over the 32 bits (Knuth's multiplicative hash): neighbors look unrelated.
    this.seed = Math.imul(tick + 1, 0x9e3779b1) | 0;
  }

  /** The next value, in [0, 1). */
  next(): number {
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A value between `min` and `max`. */
  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
