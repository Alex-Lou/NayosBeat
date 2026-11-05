import { describe, expect, it } from 'vitest';
import { FELINE_CLIPS } from '../../src/art/feline/clips';
import { FELINE_SHEETS } from '../../src/art/feline/sheets';
import { ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { toPx } from '../../src/core/constants';
import { FELINE } from '../../src/data/fighters/feline';
import { CELL_MARGIN, GROUND_ROW, GROUNDED_STRIPS, LOWEST_ROW } from '../../tools/sprites/cell';
import { strikesOf } from '../../tools/sprites/clips';
import { FELINE as FELINE_GENERATOR } from '../../tools/sprites/feline/index';
import { GUARD } from '../../tools/sprites/feline/poses/common';
import { isV2Sheet, FELINE_POSES, type PosedSheet } from '../../tools/sprites/feline/poses/index';
import { drawStrip } from '../../tools/sprites/sheet';
import { reachCheck } from './fighters';
import { eachPixel as eachPixelOf, extent as extentOf, reach } from './strip-pixels';

describe('Feline strips', () => {
  const sheets = (Object.keys(FELINE_POSES) as PosedSheet[]).filter((sheet) => !isV2Sheet(sheet));

  const drawn = new Map<PosedSheet, ReturnType<typeof drawStrip>>();
  const sheetCanvas = (sheet: PosedSheet): ReturnType<typeof drawStrip> => {
    const cached = drawn.get(sheet);
    if (cached) return cached;
    const canvas = drawStrip(FELINE_GENERATOR, sheet);
    drawn.set(sheet, canvas);
    return canvas;
  };

  const eachPixel = (sheet: PosedSheet, frame: number, visit: (x: number, y: number) => void) => {
    eachPixelOf(sheetCanvas(sheet), frame, visit);
  };
  const extent = (sheet: PosedSheet, frame: number) => extentOf(sheetCanvas(sheet), frame);

  it('starts the 8-frame idle loop on her GUARD pose', () => {
    expect(FELINE_SHEETS.idle.frames).toBe(8);
    expect(FELINE_POSES.idle[0]).toBe(GUARD);
  });

  it.each(sheets)('%s: every frame stays inside its cell, away from the edges', (sheet) => {
    for (let frame = 0; frame < FELINE_SHEETS[sheet].frames; frame++) {
      const { top, bottom, left, right } = extent(sheet, frame);
      expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
      expect(Math.min(top, left, CELL_SIZE - 1 - right), `frame ${frame}`).toBeGreaterThanOrEqual(
        CELL_MARGIN,
      );
      expect(bottom, `frame ${frame}`).toBeLessThanOrEqual(LOWEST_ROW);
    }
  });

  it.each(GROUNDED_STRIPS)('%s: feet stand on the ground line in every frame', (sheet) => {
    for (let frame = 0; frame < FELINE_SHEETS[sheet].frames; frame++) {
      expect(extent(sheet, frame).bottom, `frame ${frame}`).toBeGreaterThanOrEqual(GROUND_ROW);
    }
  });

  it('the crouch is about as tall as the crouching hurtbox', () => {
    const { top, bottom } = extent('crouch', FELINE_CLIPS.crouch.frames[3] ?? 3);
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
    { sheet: 'idle', frames: FELINE_CLIPS.idle.frames, crouching: false },
    { sheet: 'walkForward', frames: FELINE_CLIPS.walkForward.frames, crouching: false },
    { sheet: 'walkBack', frames: FELINE_CLIPS.walkBack.frames, crouching: false },
    { sheet: 'crouch', frames: FELINE_CLIPS.crouch.frames.slice(3), crouching: true },
    { sheet: 'block', frames: FELINE_CLIPS.blockStand.frames, crouching: false },
    { sheet: 'block', frames: FELINE_CLIPS.blockCrouch.frames, crouching: true },
  ];

  it.each(NEUTRAL)('$sheet: stays inside the pushbox (crouching: $crouching)', (neutral) => {
    const box = neutral.crouching ? FELINE.crouchingPushbox : FELINE.standingPushbox;
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
  const STRIKES = strikesOf(FELINE_CLIPS, FELINE).filter(
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
});
