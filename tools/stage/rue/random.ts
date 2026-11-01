/**
 * The street's seeded randomness (mulberry32): the same seed draws the same street, pixel for
 * pixel, on every run and every machine. Each part of the drawing takes its own stream, so
 * retouching one never reshuffles another.
 */

export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** 0 (included) to 1 (excluded). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A whole number from `min` to `max`, both included. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True `chance` of the time. */
  chance(chance: number): boolean {
    return this.next() < chance;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error('Nothing to pick from');
    return item;
  }
}

/** A hash of whole numbers to 0 to 1: the lattice of `noise`. */
function hash(seed: number, x: number, y: number): number {
  let h = Math.imul(seed ^ Math.imul(x, 0x27d4eb2d), 0x165667b1) ^ Math.imul(y, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Smooth value noise, 0 to 1, at x, y in cells of `cell` pixels: soft shapes (cloud edges, worn
 * paint) that stay the same for the same seed.
 */
export function noise(seed: number, x: number, y: number, cell: number): number {
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash(seed, x0, y0) + (hash(seed, x0 + 1, y0) - hash(seed, x0, y0)) * sx;
  const bottom =
    hash(seed, x0, y0 + 1) + (hash(seed, x0 + 1, y0 + 1) - hash(seed, x0, y0 + 1)) * sx;
  return top + (bottom - top) * sy;
}

/** A stream of its own for each part of the drawing, from the street's seed and the part's name. */
export function streamOf(seed: number, part: string): Random {
  let hash = seed >>> 0;
  for (const char of part) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return new Random(hash);
}
