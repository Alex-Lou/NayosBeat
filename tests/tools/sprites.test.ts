import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { NAYO_SHEETS } from '../../src/art/nayo/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import type { MoveId } from '../../src/core/config';
import { toPx } from '../../src/core/constants';
import { POLYVALENT } from '../../src/data/fighters';
import { isV2Sheet } from '../../tools/sprites/nayo/combat-v2';
import { NAYO_POSES, type PosedSheet } from '../../tools/sprites/nayo/poses/index';
import { crc32, encodeIndexedPng } from '../../tools/sprites/png';
import { drawSheet } from '../../tools/sprites/sheet';
import { eachPixel as eachPixelOf, extent as extentOf, reach } from './strip-pixels';

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
  // The combat v2 strips have their own checks (nayo-v2-sprites.test.ts).
  const sheets = (Object.keys(NAYO_POSES) as PosedSheet[]).filter((sheet) => !isV2Sheet(sheet));

  const drawn = new Map<PosedSheet, ReturnType<typeof drawSheet>>();
  const sheetCanvas = (sheet: PosedSheet): ReturnType<typeof drawSheet> => {
    const cached = drawn.get(sheet);
    if (cached) return cached;
    const canvas = drawSheet(sheet);
    drawn.set(sheet, canvas);
    return canvas;
  };

  const eachPixel = (sheet: PosedSheet, frame: number, visit: (x: number, y: number) => void) => {
    eachPixelOf(sheetCanvas(sheet), frame, visit);
  };
  const extent = (sheet: PosedSheet, frame: number) => extentOf(sheetCanvas(sheet), frame);

  it.each(sheets)('%s: every frame stays inside its cell, away from the edges', (sheet) => {
    for (let frame = 0; frame < NAYO_SHEETS[sheet].frames; frame++) {
      const { top, bottom, left, right } = extent(sheet, frame);
      expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
      expect(Math.min(top, left, CELL_SIZE - 1 - right), `frame ${frame}`).toBeGreaterThanOrEqual(
        4,
      );
      expect(bottom, `frame ${frame}`).toBeLessThanOrEqual(ANCHOR.y + 2);
    }
  });

  it.each(['idle', 'walkForward', 'walkBack', 'crouch', 'block'] as const)(
    '%s: feet stand on the ground line in every frame',
    (sheet) => {
      for (let frame = 0; frame < NAYO_SHEETS[sheet].frames; frame++) {
        expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeGreaterThanOrEqual(ANCHOR.y - 2);
      }
    },
  );

  it('the crouch is about as tall as the crouching hurtbox (54 px)', () => {
    const { top, bottom } = extent('crouch', NAYO_CLIPS.crouch.frames[3] ?? 3);
    // Outline and hair may rise a few pixels above the box, not a whole head.
    expect((bottom - top + 1) / ART_SCALE).toBeLessThanOrEqual(58);
  });

  it('the standing guard is about as tall as the standing hurtbox (84 px)', () => {
    const { top, bottom } = extent('idle', 0);
    const height = (bottom - top + 1) / ART_SCALE;
    expect(height).toBeGreaterThanOrEqual(76);
    expect(height).toBeLessThanOrEqual(88);
  });

  /**
   * No clinch at point blank: in neutral poses nothing above the shins reaches past the pushbox
   * (plus 1 px), so two fighters pressed together touch without overlapping. The feet may reach
   * a little farther, toes touching toes.
   */
  const SHIN = 12;
  const NEUTRAL: readonly { sheet: PosedSheet; frames: readonly number[]; crouching: boolean }[] = [
    { sheet: 'idle', frames: NAYO_CLIPS.idle.frames, crouching: false },
    { sheet: 'walkForward', frames: NAYO_CLIPS.walkForward.frames, crouching: false },
    { sheet: 'walkBack', frames: NAYO_CLIPS.walkBack.frames, crouching: false },
    { sheet: 'crouch', frames: NAYO_CLIPS.crouch.frames.slice(3), crouching: true },
    { sheet: 'block', frames: NAYO_CLIPS.blockStand.frames, crouching: false },
    { sheet: 'block', frames: NAYO_CLIPS.blockCrouch.frames, crouching: true },
  ];

  it.each(NEUTRAL)('$sheet: stays inside the pushbox (crouching: $crouching)', (neutral) => {
    const box = neutral.crouching ? POLYVALENT.crouchingPushbox : POLYVALENT.standingPushbox;
    const half = toPx(box.width) / 2;
    for (const frame of neutral.frames) {
      let body = -Infinity;
      let feet = -Infinity;
      eachPixel(neutral.sheet, frame, (x, y) => {
        if (y > SHIN) body = Math.max(body, x);
        else feet = Math.max(feet, x);
      });
      expect(body, `frame ${frame}: body reaches ${body}`).toBeLessThanOrEqual(half + 1);
      expect(feet, `frame ${frame}: feet reach ${feet}`).toBeLessThanOrEqual(half + 4);
    }
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
      const reached = reach([sheetCanvas(move)], frame, band, up);
      expect(reached, `frame ${frame} reaches ${reached}, edge ${edge}`).toBeGreaterThanOrEqual(
        edge - REACH_SLACK,
      );
      expect(reached, `frame ${frame} reaches ${reached}, edge ${edge}`).toBeLessThanOrEqual(
        edge + REACH_OVERSHOOT,
      );
    }
  });
});
