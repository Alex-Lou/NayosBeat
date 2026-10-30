import { describe, expect, it } from 'vitest';
import {
  DISC_SIZE,
  discSpans,
  MARK_STEPS,
  markSpan,
  PIP_SIZE,
  pipSpans,
} from '../../src/render/hud-discs';
import { pixelOf } from './hud-fakes';

const RIM = 0xe07a22;

describe('the timer vinyl and the round markers (docs/art/direction-hud.md)', () => {
  it('lays the timer on a round vinyl, rimmed in the titles orange', () => {
    const spans = discSpans();
    const last = DISC_SIZE - 1;
    for (const [x, y] of [
      [0, 0],
      [last, 0],
      [0, last],
      [last, last],
    ] as const) {
      expect(pixelOf(spans, x, y), `${x}, ${y}`).toBeUndefined();
    }
    for (let y = 0; y < DISC_SIZE; y++) {
      for (let x = 0; x < DISC_SIZE; x++) {
        const inside = pixelOf(spans, x, y) !== undefined;
        expect(pixelOf(spans, last - x, y) !== undefined, `${x}, ${y}`).toBe(inside);
        expect(pixelOf(spans, x, last - y) !== undefined, `${x}, ${y}`).toBe(inside);
      }
      const row = Array.from({ length: DISC_SIZE }, (_, x) => pixelOf(spans, x, y));
      const first = row.findIndex((color) => color !== undefined);
      expect(row[first], `row ${y}`).toBe(RIM);
      expect(row[last - first], `row ${y}`).toBe(RIM);
    }
  });

  it('turns its mark around the vinyl, step by step, on the disc', () => {
    const disc = discSpans();
    const places = new Set<string>();
    for (let step = 0; step < MARK_STEPS; step++) {
      const mark = markSpan(step);
      places.add(`${mark.x},${mark.y}`);
      for (const [dx, dy] of [
        [0, 0],
        [1, 1],
      ] as const) {
        const under = pixelOf(disc, mark.x + dx, mark.y + dy);
        expect(under, `step ${step}`).toBeDefined();
        expect(under, `step ${step}`).not.toBe(RIM);
      }
    }
    expect(places.size).toBe(MARK_STEPS);
    // Its orbit is centered: the same seen in a mirror, either way.
    for (let step = 0; step < MARK_STEPS; step++) {
      expect(markSpan(step).x + markSpan(MARK_STEPS - step).x, `step ${step}`).toBe(DISC_SIZE - 2);
      expect(markSpan(step).y + markSpan(MARK_STEPS / 2 - step).y, `step ${step}`).toBe(
        DISC_SIZE - 2,
      );
    }
    // At the top to start with, then clockwise; any step wraps around.
    expect(markSpan(0).y).toBeLessThan(markSpan(MARK_STEPS / 2).y);
    expect(markSpan(MARK_STEPS / 4).x).toBeGreaterThan(markSpan((3 * MARK_STEPS) / 4).x);
    expect(markSpan(MARK_STEPS)).toEqual(markSpan(0));
    expect(markSpan(-1)).toEqual(markSpan(MARK_STEPS - 1));
  });

  it('marks a round won with a yellow disc, an empty one dark, both rimmed', () => {
    const center = (PIP_SIZE - 1) / 2;
    expect(pixelOf(pipSpans(true), center, center)).toBe(0xf0c94a);
    expect(pixelOf(pipSpans(false), center, center)).toBe(0x1c1228);
    expect(pixelOf(pipSpans(true), 0, center)).toBe(RIM);
    expect(pixelOf(pipSpans(true), 0, 0)).toBeUndefined();
  });
});
