import type { Span } from './hud-paint';

/**
 * The HUD's discs (docs/art/direction-hud.md): the timer sits on a vinyl, like the title's « O »,
 * rimmed in the titles' orange, a yellow mark turning on its edge while the fight is on;
 * the round wins are small yellow discs. Pure: spans for hud.ts to paint.
 */

/** The timer's vinyl, in view pixels. */
export const DISC_SIZE = 40;
/** Steps of the mark around the vinyl, and ticks per step: a turn in 1.9 s, a 33 near enough. */
export const MARK_STEPS = 16;
export const MARK_TICKS = 7;
/** A round marker. */
export const PIP_SIZE = 7;

const VINYL = {
  rim: 0xe07a22,
  depth: 0xc4561c,
  disc: 0x18181f,
  groove: 0x2e2e3a,
  sheen: 0x3a3a4a,
  mark: 0xf0c94a,
} as const;

/** Runs of one color along each row of a square grid of `size` cells, `ink` giving each cell's. */
function rowsOf(size: number, ink: (x: number, y: number) => number | null): Span[] {
  const spans: Span[] = [];
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      const color = ink(x, y);
      let end = x + 1;
      while (end < size && ink(end, y) === color) end++;
      if (color !== null) spans.push({ x, y, width: end - x, height: 1, color });
      x = end;
    }
  }
  return spans;
}

/** The vinyl under the timer: drawn once. */
export function discSpans(): Span[] {
  const center = (DISC_SIZE - 1) / 2;
  const radius = DISC_SIZE / 2 - 0.4;
  const distance = (x: number, y: number): number => Math.hypot(x - center, y - center);
  const inside = (x: number, y: number): boolean => distance(x, y) <= radius;
  /** On the disc's outline: inside, next to a cell outside. */
  const onEdge = (x: number, y: number): boolean =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx = 0, dy = 0]) => !inside(x + dx, y + dy));
  return rowsOf(DISC_SIZE, (x, y) => {
    if (!inside(x, y)) return null;
    if (onEdge(x, y)) return VINYL.rim;
    const d = distance(x, y);
    if (d > radius - 2) return VINYL.depth;
    const angle = (Math.atan2(y - center, x - center) * 180) / Math.PI;
    const lit = (angle > -150 && angle < -112) || (angle > 30 && angle < 68);
    if (lit && d > 9 && d < radius - 3) return VINYL.sheen;
    if ([radius - 3.5, radius - 6, radius - 8.5].some((ring) => Math.abs(d - ring) < 0.4)) {
      return VINYL.groove;
    }
    return VINYL.disc;
  });
}

/**
 * The mark on the vinyl's outer groove, 2 pixels square, at step `spin` of its turn (any integer:
 * it wraps; step 0 at the top, turning clockwise). Its orbit is centered on the disc's middle, the
 * same seen in a mirror either way.
 */
export function markSpan(spin: number): Span {
  const step = ((spin % MARK_STEPS) + MARK_STEPS) % MARK_STEPS;
  const angle = (step / MARK_STEPS) * 2 * Math.PI - Math.PI / 2;
  // The mark's top left cell when it is at the disc's middle; a whole orbit, so that no step
  // falls half way between two pixels (rounding would push it off center).
  const corner = DISC_SIZE / 2 - 1;
  const orbit = DISC_SIZE / 2 - 4;
  return {
    x: Math.round(corner + orbit * Math.cos(angle)),
    y: Math.round(corner + orbit * Math.sin(angle)),
    width: 2,
    height: 2,
    color: VINYL.mark,
  };
}

/** A round marker: a small disc, yellow with an orange rim once the round is won. */
export function pipSpans(won: boolean): Span[] {
  const rim = won ? VINYL.rim : 0x5a5070;
  const core = won ? 0xf0c94a : 0x1c1228;
  // Its rows, from the top: where each starts (a 7 px disc), its rim at both ends.
  const starts = [2, 1, 0, 0, 0, 1, 2];
  const spans: Span[] = [];
  starts.forEach((start, y) => {
    const width = PIP_SIZE - 2 * start;
    const edge = y === 0 || y === PIP_SIZE - 1;
    spans.push({ x: start, y, width, height: 1, color: edge ? rim : core });
    if (!edge) {
      spans.push({ x: start, y, width: 1, height: 1, color: rim });
      spans.push({ x: start + width - 1, y, width: 1, height: 1, color: rim });
    }
  });
  if (won) spans.push({ x: 2, y: 2, width: 1, height: 1, color: 0xfff4c8 });
  return spans;
}
