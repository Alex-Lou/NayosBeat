import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { RIFF } from '../../src/art/riff';
import { cellOf, type Cell } from '../../src/art/types';
import { anchorOrigin } from '../../src/render/anchor-origin';

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
