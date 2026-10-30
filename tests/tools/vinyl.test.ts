import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LABEL_RADIUS,
  VINYL_CELLS,
  VINYL_FRAMES,
  vinylCell,
  vinylPng,
} from '../../tools/sprites/vinyl';

const CENTER = (VINYL_CELLS - 1) / 2;

/** Every cell of one frame, as its ink. */
function frameOf(frame: number): string[][] {
  return Array.from({ length: VINYL_CELLS }, (_, y) =>
    Array.from({ length: VINYL_CELLS }, (_, x) => vinylCell(x, y, frame)),
  );
}

describe('the title vinyl', () => {
  it('is the drawing the generator makes (npm run sprites)', async () => {
    const committed = readFileSync(new URL('../../src/ui/title-vinyl.png', import.meta.url));
    expect([...(await vinylPng())]).toEqual([...committed]);
  });

  it('is a round disc with its spindle hole, rimmed in the titles orange', () => {
    const cells = frameOf(0);
    const ink = (x: number, y: number) => cells[y]?.[x];
    const last = VINYL_CELLS - 1;
    const middle = VINYL_CELLS / 2;
    // The hole: the four middle cells; the corners: outside the disc.
    for (const [x, y] of [
      [middle - 1, middle - 1],
      [middle - 1, middle],
      [middle, middle - 1],
      [middle, middle],
      [0, 0],
      [last, 0],
      [0, last],
      [last, last],
    ] as const) {
      expect(ink(x, y), `${x}, ${y}`).toBe('none');
    }
    for (let y = 0; y < VINYL_CELLS; y++) {
      // Round: the disc's outline is the same seen in a mirror, either way.
      for (let x = 0; x < VINYL_CELLS; x++) {
        const inside = ink(x, y) !== 'none';
        expect(ink(last - x, y) !== 'none', `${x}, ${y}`).toBe(inside);
        expect(ink(x, last - y) !== 'none', `${x}, ${y}`).toBe(inside);
      }
      // Each row of the disc starts and ends on the orange rim.
      const row = cells[y] ?? [];
      const first = row.findIndex((cell) => cell !== 'none');
      expect(row[first], `row ${y}`).toBe('rim');
      expect(row[row.length - 1 - first], `row ${y}`).toBe('rim');
    }
  });

  it('turns its label mark one frame after another, the rest of the disc still', () => {
    const marks = Array.from({ length: VINYL_FRAMES }, (_, frame) =>
      frameOf(frame)
        .flatMap((row, y) => row.map((ink, x) => (ink === 'mark' ? `${x},${y}` : '')))
        .filter(Boolean)
        .join(' '),
    );
    expect(new Set(marks).size).toBe(VINYL_FRAMES);
    for (const mark of marks) expect(mark).not.toBe('');
    // Outside the label, every frame is the same: the grooves and the sheen do not turn.
    const outer = (frame: number) =>
      frameOf(frame).map((row, y) =>
        row.filter((_, x) => Math.hypot(x - CENTER, y - CENTER) > LABEL_RADIUS).join(''),
      );
    for (let frame = 1; frame < VINYL_FRAMES; frame++) expect(outer(frame)).toEqual(outer(0));
  });
});
