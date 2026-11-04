import { describe, expect, it } from 'vitest';
import { KODA_CLIPS, KODA_PROJECTILES } from '../../src/art/koda/clips';
import { KODA_SHEETS } from '../../src/art/koda/sheets';
import { ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { toPx } from '../../src/core/constants';
import { KODA } from '../../src/data/fighters/koda';
import { CELL_MARGIN, GROUND_ROW, GROUNDED_STRIPS, LOWEST_ROW } from '../../tools/sprites/cell';
import { strikesOf } from '../../tools/sprites/clips';
import { KODA as KODA_GENERATOR } from '../../tools/sprites/koda/index';
import { isV2Sheet, KODA_POSES, type PosedSheet } from '../../tools/sprites/koda/poses/index';
import { drawStrip } from '../../tools/sprites/sheet';
import { reachCheck } from './fighters';
import { eachPixel as eachPixelOf, extent as extentOf, reach } from './strip-pixels';

describe('Koda strips', () => {
  const sheets = (Object.keys(KODA_POSES) as PosedSheet[]).filter((sheet) => !isV2Sheet(sheet));

  const drawn = new Map<PosedSheet, ReturnType<typeof drawStrip>>();
  const sheetCanvas = (sheet: PosedSheet): ReturnType<typeof drawStrip> => {
    const cached = drawn.get(sheet);
    if (cached) return cached;
    const canvas = drawStrip(KODA_GENERATOR, sheet);
    drawn.set(sheet, canvas);
    return canvas;
  };

  const eachPixel = (sheet: PosedSheet, frame: number, visit: (x: number, y: number) => void) => {
    eachPixelOf(sheetCanvas(sheet), frame, visit);
  };
  const extent = (sheet: PosedSheet, frame: number) => extentOf(sheetCanvas(sheet), frame);

  it.each(sheets)('%s: every frame stays inside its cell, away from the edges', (sheet) => {
    for (let frame = 0; frame < KODA_SHEETS[sheet].frames; frame++) {
      const { top, bottom, left, right } = extent(sheet, frame);
      expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
      expect(Math.min(top, left, CELL_SIZE - 1 - right), `frame ${frame}`).toBeGreaterThanOrEqual(
        CELL_MARGIN,
      );
      expect(bottom, `frame ${frame}`).toBeLessThanOrEqual(LOWEST_ROW);
    }
  });

  it.each(GROUNDED_STRIPS)('%s: feet stand on the ground line in every frame', (sheet) => {
    for (let frame = 0; frame < KODA_SHEETS[sheet].frames; frame++) {
      expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeGreaterThanOrEqual(GROUND_ROW);
    }
  });

  it('the crouch is about as tall as the crouching hurtbox', () => {
    const { top, bottom } = extent('crouch', KODA_CLIPS.crouch.frames[3] ?? 3);
    expect((bottom - top + 1) / ART_SCALE).toBeLessThanOrEqual(58);
  });

  it('the standing guard is about as tall as the standing hurtbox', () => {
    const { top, bottom } = extent('idle', 0);
    const height = (bottom - top + 1) / ART_SCALE;
    expect(height).toBeGreaterThanOrEqual(76);
    expect(height).toBeLessThanOrEqual(88);
  });

  const SHIN = 12;
  const NEUTRAL: readonly { sheet: PosedSheet; frames: readonly number[]; crouching: boolean }[] = [
    { sheet: 'idle', frames: KODA_CLIPS.idle.frames, crouching: false },
    { sheet: 'walkForward', frames: KODA_CLIPS.walkForward.frames, crouching: false },
    { sheet: 'walkBack', frames: KODA_CLIPS.walkBack.frames, crouching: false },
    { sheet: 'crouch', frames: KODA_CLIPS.crouch.frames.slice(3), crouching: true },
    { sheet: 'block', frames: KODA_CLIPS.blockStand.frames, crouching: false },
    { sheet: 'block', frames: KODA_CLIPS.blockCrouch.frames, crouching: true },
  ];

  it.each(NEUTRAL)('$sheet: stays inside the pushbox (crouching: $crouching)', (neutral) => {
    const box = neutral.crouching ? KODA.crouchingPushbox : KODA.standingPushbox;
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

  const REACH = { short: 3, past: 4 } as const;
  const LOW_REACH = { short: 2, past: 3 } as const;
  const STRIKES = strikesOf(KODA_CLIPS, KODA).filter(
    ({ sheet }) => !isV2Sheet(sheet as PosedSheet),
  );

  for (const { id, move, sheet, frames, box } of STRIKES) {
    it(reachCheck(id), () => {
      const { x, y, width, height } = box;
      const { short, past } = move.guard === 'low' ? LOW_REACH : REACH;
      const ways = [{ up: false, band: { from: y, to: y + height }, edge: x + width }];
      if (id === 'specialAntiAir' || id === 'specialAntiAirBoost')
        ways.push({ up: true, band: { from: x, to: x + width }, edge: y + height });
      const strip = sheetCanvas(sheet as PosedSheet);
      for (const frame of frames) {
        for (const { up, band, edge } of ways) {
          const reached = reach([strip], frame, band, up);
          const where = `frame ${frame} ${up ? 'up' : 'forward'} reaches ${reached}, edge ${edge}`;
          expect(reached, where).toBeGreaterThanOrEqual(edge - short);
          expect(reached, where).toBeLessThanOrEqual(edge + past);
        }
      }
    });
  }

  it.each(['special', 'specialBoost'] as const)(
    '%s: Diapason projectile covers its hitbox on every frame',
    (id) => {
      const spec = KODA.moves[id]?.projectile;
      const clip = KODA_PROJECTILES[id];
      if (!spec || !clip) throw new Error(`${id} must be a projectile`);
      const [x = 0, y = 0, width = 0, height = 0] = [
        spec.hitbox.x,
        spec.hitbox.y,
        spec.hitbox.width,
        spec.hitbox.height,
      ].map(toPx);
      const sheet = clip.sheet as 'projectile' | 'projectileBoost';
      const canvas = drawStrip(KODA_GENERATOR, sheet);
      for (let frame = 0; frame < KODA_SHEETS[sheet].frames; frame++) {
        let [left, right, bottom, top] = [Infinity, -Infinity, Infinity, -Infinity];
        eachPixelOf(canvas, frame, (px, py) => {
          left = Math.min(left, px - 1 / ART_SCALE);
          right = Math.max(right, px);
          bottom = Math.min(bottom, py - 1 / ART_SCALE);
          top = Math.max(top, py);
        });
        expect(left).toBeLessThanOrEqual(x);
        expect(bottom).toBeLessThanOrEqual(y);
        expect(top).toBeGreaterThanOrEqual(y + height);
        expect(right).toBeGreaterThanOrEqual(x + width);
        expect(right).toBeLessThanOrEqual(x + width + 4);
      }
    },
  );
});
