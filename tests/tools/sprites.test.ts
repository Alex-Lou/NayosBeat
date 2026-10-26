import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { NAYO_SHEETS, type NayoSheet } from '../../src/art/nayo/sheets';
import { ANCHOR, CELL_SIZE } from '../../src/art/types';
import type { MoveId } from '../../src/core/config';
import { toPx } from '../../src/core/constants';
import { POLYVALENT } from '../../src/data/fighters';
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

  const drawn = new Map<NayoSheet, ReturnType<typeof drawSheet>>();
  const sheetCanvas = (sheet: NayoSheet): ReturnType<typeof drawSheet> => {
    const cached = drawn.get(sheet);
    if (cached) return cached;
    const canvas = drawSheet(sheet);
    drawn.set(sheet, canvas);
    return canvas;
  };

  /** Opaque rows and columns of one cell, relative to the cell. */
  function extent(sheet: NayoSheet, frame: number) {
    const canvas = sheetCanvas(sheet);
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

  it.each(sheets.filter((sheet) => sheet !== 'projectile'))(
    '%s: every frame stays inside its cell, away from the edges',
    (sheet) => {
      for (let frame = 0; frame < NAYO_SHEETS[sheet].frames; frame++) {
        const { top, bottom, left, right } = extent(sheet, frame);
        expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
        expect(Math.min(top, left, CELL_SIZE - 1 - right)).toBeGreaterThanOrEqual(2);
        expect(bottom).toBeLessThanOrEqual(ANCHOR.y + 1);
      }
    },
  );

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

  /**
   * What you see is what hits: on every active frame of a move, the drawing reaches the far
   * edge of the hitbox (within REACH_SLACK px short, REACH_OVERSHOOT px past), inside the
   * hitbox's band. Horizontal strikes are measured forward, the uppercut upward.
   */
  const REACH_SLACK = 6;
  const REACH_OVERSHOOT = 8;
  const STRIKES = [
    'standLight',
    'standHeavy',
    'crouchLight',
    'crouchHeavy',
    'jumpLight',
    'jumpHeavy',
    'specialForward',
    'specialAntiAir',
    'throw',
  ] as const satisfies readonly MoveId[];

  function activeFrames(move: (typeof STRIKES)[number]): number[] {
    const { startup, active } = POLYVALENT.moves[move];
    const clip = NAYO_CLIPS[move];
    const frames: number[] = [];
    let tick = 0;
    clip.ticks.forEach((ticks, index) => {
      if (tick < startup + active && tick + ticks > startup) frames.push(clip.frames[index] ?? -1);
      tick += ticks;
    });
    return frames;
  }

  /** Farthest opaque pixel toward the opponent (or upward) within a band, in character px. */
  function reach(sheet: NayoSheet, frame: number, band: { from: number; to: number }, up: boolean) {
    const canvas = sheetCanvas(sheet);
    let best = -Infinity;
    for (let row = 0; row < CELL_SIZE; row++) {
      for (let column = 0; column < CELL_SIZE; column++) {
        if (canvas.pixels[row * canvas.width + frame * CELL_SIZE + column] === 0) continue;
        const x = column + 1 - ANCHOR.x;
        const y = ANCHOR.y - row;
        const across = up ? x : y;
        if (across < band.from || across > band.to) continue;
        best = Math.max(best, up ? y : x);
      }
    }
    return best;
  }

  it.each(STRIKES)('%s: the active frames reach the hitbox, no farther', (move) => {
    const hitbox = POLYVALENT.moves[move].hitbox;
    if (!hitbox) throw new Error(`${move} has no hitbox`);
    const [x, y, width, height] = [hitbox.x, hitbox.y, hitbox.width, hitbox.height].map(toPx);
    const up = move === 'specialAntiAir';
    const band = up
      ? { from: x ?? 0, to: (x ?? 0) + (width ?? 0) }
      : { from: y ?? 0, to: (y ?? 0) + (height ?? 0) };
    const edge = up ? (y ?? 0) + (height ?? 0) : (x ?? 0) + (width ?? 0);
    const frames = activeFrames(move);
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      const reached = reach(move, frame, band, up);
      expect(reached, `frame ${frame} reaches ${reached}, edge ${edge}`).toBeGreaterThanOrEqual(
        edge - REACH_SLACK,
      );
      expect(reached, `frame ${frame} reaches ${reached}, edge ${edge}`).toBeLessThanOrEqual(
        edge + REACH_OVERSHOOT,
      );
    }
  });
});
