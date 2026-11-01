import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { RIFF } from '../../src/art/riff';
import { cellOf, type Cell, type Rect } from '../../src/art/types';
import { anchorOrigin } from '../../src/render/anchor-origin';
import { cutOf } from '../../tools/sprites/atlas';

/**
 * Where Phaser 4 draws a pixel column of an untrimmed frame, in world pixels: the arithmetic of
 * its TransformerImage (a flipped frame is shifted by its width minus twice the display origin,
 * then scaled by -1).
 */
function drawnX(cell: Cell, originX: number, flip: boolean, column: number): number {
  const scale = 0.5;
  const displayOriginX = originX * cell.width;
  let x = -displayOriginX;
  if (flip) x += -cell.width + displayOriginX * 2;
  return (flip ? -scale : scale) * (x + column);
}

/**
 * Where Phaser 4 draws pixel `x`, `y` of a cell, in world pixels from the sprite's position: of
 * a whole frame, or of one trimmed to `cut` (an atlas's), which TransformerImage offsets by
 * where the cut is in the cell (`frame.x`, `frame.y`) while the sprite keeps the cell's size
 * (`frame.realWidth`, `realHeight`): its origin and its flip.
 */
function drawnAt(
  cell: Cell,
  origin: { x: number; y: number },
  flip: boolean,
  x: number,
  y: number,
  cut: Rect = { x: 0, y: 0, width: cell.width, height: cell.height },
): { x: number; y: number } {
  const scale = 0.5;
  const displayOriginX = origin.x * cell.width;
  let left = -displayOriginX + cut.x;
  if (flip) left += -cell.width + displayOriginX * 2;
  const top = -origin.y * cell.height + cut.y;
  // The pixel's column and row within the quad drawn.
  return {
    x: (flip ? -scale : scale) * (left + x - cut.x),
    y: scale * (top + y - cut.y),
  };
}

describe('anchorOrigin', () => {
  it.each([NAYO, RIFF])(
    'puts the feet anchor on the position on both sides, every strip of $key',
    (art) => {
      const strips = Object.keys(art.cells ?? {});
      expect(strips.length).toBeGreaterThan(0);
      for (const strip of strips) {
        const cell = cellOf(art, strip);
        for (const flip of [false, true]) {
          // The anchor column's left edge: the line a flip mirrors the drawing around.
          const anchor = drawnX(cell, anchorOrigin(cell, flip).x, flip, cell.anchor.x);
          expect(anchor, `${strip} flip=${String(flip)}`).toBeCloseTo(0, 9);
        }
      }
    },
  );

  it.each([NAYO, RIFF])(
    'draws every frame of $key cut out of its cell (its atlas) where its whole cell drew it',
    (art) => {
      const strips = Object.entries(art.cells ?? {});
      expect(strips.every(([, cell]) => cell.frames?.length)).toBe(true);
      for (const [strip, cell] of strips) {
        cell.frames?.forEach((extent, frame) => {
          // The cut Phaser trims the frame to: what it draws, its margin, inside the cell.
          const cut = cutOf(extent, cell);
          for (const flip of [false, true]) {
            const origin = anchorOrigin(cell, flip);
            for (const y of [cut.y, cut.y + cut.height - 1]) {
              for (const x of [cut.x, extent.x, cut.x + cut.width - 1]) {
                const where = `${strip} ${frame} flip=${String(flip)} at ${x}, ${y}`;
                const trimmed = drawnAt(cell, origin, flip, x, y, cut);
                const whole = drawnAt(cell, origin, flip, x, y);
                expect(trimmed.x, where).toBeCloseTo(whole.x, 9);
                expect(trimmed.y, where).toBeCloseTo(whole.y, 9);
              }
            }
          }
        });
      }
    },
  );

  it('keeps the vertical origin on the feet', () => {
    const cell: Cell = { width: 88, height: 160, anchor: { x: 56, y: 150 } };
    expect(anchorOrigin(cell, true).y).toBe(150 / 160);
    expect(anchorOrigin(cell, false)).toEqual({ x: 56 / 88, y: 150 / 160 });
  });

  it('was off by (width - 2 * anchor) / 2 world px with the plain origin', () => {
    const cell: Cell = { width: 88, height: 160, anchor: { x: 56, y: 150 } };
    const plain = drawnX(cell, cell.anchor.x / cell.width, true, cell.anchor.x);
    expect(plain).toBeCloseTo((cell.width - 2 * cell.anchor.x) / 2, 9);
    expect(plain).toBeCloseTo(-12, 9);
  });
});
