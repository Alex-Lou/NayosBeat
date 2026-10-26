import { describe, expect, it } from 'vitest';
import { NAYO_SHEETS, type NayoSheet } from '../../src/art/nayo/sheets';
import { ANCHOR, CELL_SIZE } from '../../src/art/types';
import { crc32, encodeIndexedPng } from '../../tools/sprites/png';
import { drawSheet } from '../../tools/sprites/sheet';

describe('PNG encoder', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });

  it('writes a palette image of the requested size', async () => {
    const png = await encodeIndexedPng(
      3,
      2,
      new Uint8Array([0, 1, 1, 0, 1, 0]),
      [
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 255, g: 128, b: 0, a: 255 },
      ],
      2,
    );
    const view = new DataView(png.buffer);
    expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(new TextDecoder().decode(png.slice(12, 16))).toBe('IHDR');
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([6, 4]);
    expect(png[25]).toBe(3); // color type: palette
  });
});

describe('Nayo strips', () => {
  const sheets = Object.keys(NAYO_SHEETS) as NayoSheet[];

  /** Opaque rows and columns of one cell, relative to the cell. */
  function extent(sheet: NayoSheet, frame: number) {
    const canvas = drawSheet(sheet);
    let top = CELL_SIZE;
    let bottom = -1;
    let left = CELL_SIZE;
    let right = -1;
    for (let y = 0; y < CELL_SIZE; y++) {
      for (let x = 0; x < CELL_SIZE; x++) {
        if (canvas.pixels[y * canvas.width + frame * CELL_SIZE + x] === 0) continue;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    return { top, bottom, left, right };
  }

  it.each(sheets)('%s: every frame stays inside its cell, away from the edges', (sheet) => {
    for (let frame = 0; frame < NAYO_SHEETS[sheet].frames; frame++) {
      const { top, bottom, left, right } = extent(sheet, frame);
      expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
      expect(Math.min(top, left, CELL_SIZE - 1 - right)).toBeGreaterThanOrEqual(2);
      expect(bottom).toBeLessThanOrEqual(ANCHOR.y + 1);
    }
  });

  it.each(['idle', 'walkForward', 'walkBack', 'crouch'] as const)(
    '%s: feet stand on the ground line in every frame',
    (sheet) => {
      for (let frame = 0; frame < NAYO_SHEETS[sheet].frames; frame++) {
        expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeGreaterThanOrEqual(ANCHOR.y - 1);
      }
    },
  );

  it('the crouch is about as tall as the crouching hurtbox (54 px)', () => {
    const { top, bottom } = extent('crouch', 2);
    // Outline and hair may rise a few pixels above the box, not a whole head.
    expect(bottom - top + 1).toBeLessThanOrEqual(58);
  });

  it('the standing guard is about as tall as the standing pushbox (80 px)', () => {
    const { top, bottom } = extent('idle', 0);
    expect(bottom - top + 1).toBeGreaterThanOrEqual(74);
    expect(bottom - top + 1).toBeLessThanOrEqual(86);
  });
});
