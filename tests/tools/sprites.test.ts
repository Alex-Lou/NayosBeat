import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS, NAYO_PROJECTILE } from '../../src/art/nayo/clips';
import { NAYO_SHEETS } from '../../src/art/nayo/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { toPx } from '../../src/core/constants';
import { NAYO } from '../../src/data/fighters/nayo';
import { strikesOf } from '../../tools/sprites/clips';
import { isV2Sheet, NAYO_POSES, type PosedSheet } from '../../tools/sprites/nayo/poses/index';
import { crc32, encodeIndexedPng } from '../../tools/sprites/png';
import { drawSheet } from '../../tools/sprites/sheet';
import { AWAITING_ART, reachCheck } from './fighters';
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
    const box = neutral.crouching ? NAYO.crouchingPushbox : NAYO.standingPushbox;
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
   * What you see is what hits (docs/combat-v2.md §9.5): on every active frame of a move, the
   * drawing reaches the far edge of the hitbox, at most REACH_SHORT px short of it and
   * REACH_PAST px past it, inside the hitbox's band. A low hit is measured at the tip of the
   * foot, closer still. Horizontal strikes are measured forward; the uppercut, an anti-air,
   * upward and forward both.
   */
  const REACH = { short: 3, past: 4 } as const;
  const LOW_REACH = { short: 2, past: 3 } as const;
  /** Every move that strikes with a v1 strip: some strips are played by more than one move. */
  const STRIKES = strikesOf(NAYO_CLIPS, NAYO).filter(
    ({ sheet }) => !isV2Sheet(sheet as PosedSheet),
  );
  const AWAITING = AWAITING_ART['Nayo'] ?? new Set();

  it('measures every move that strikes with a v1 strip, those that share one too', () => {
    expect(STRIKES.map(({ id }) => id)).toEqual([
      'standLight',
      'standHeavy',
      'crouchLight',
      'crouchHeavy',
      'jumpLight',
      'jumpHeavy',
      'specialForward',
      'specialAntiAir',
      // The Direct's strip, and the Crochet's until its own lands. The grab plays a combat v2
      // strip: nayo-v2-sprites.test.ts measures it with them.
      'jabRepeat',
      'chainHeavy',
    ]);
  });

  for (const { id, move, sheet, frames, box } of STRIKES) {
    it.skipIf(AWAITING.has(id))(reachCheck('Nayo', id), () => {
      const { x, y, width, height } = box;
      const { short, past } = move.guard === 'low' ? LOW_REACH : REACH;
      const ways = [{ up: false, band: { from: y, to: y + height }, edge: x + width }];
      if (id === 'specialAntiAir')
        ways.push({ up: true, band: { from: x, to: x + width }, edge: y + height });
      expect(frames.length).toBeGreaterThan(0);
      // The strip the move plays.
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

describe('the Vinyle in flight', () => {
  it('turns on a loop of 8 frames of 2 ticks (docs/combat-v2.md §11.2)', () => {
    expect(NAYO_SHEETS.projectile.frames).toBe(8);
    expect(NAYO_PROJECTILE).toMatchObject({ frames: [0, 1, 2, 3, 4, 5, 6, 7], loopFrom: 0 });
    expect(NAYO_PROJECTILE.ticks).toEqual([2, 2, 2, 2, 2, 2, 2, 2]);
  });

  /**
   * No reach nobody sees: on every frame of its loop, the strip covers the Vinyle's whole hitbox
   * (−10..10 px, 32 to 52 px high), and its lead reaches the front edge, no farther than a
   * strike may (§9.5).
   */
  it('covers its hitbox on every frame, the lead at its front edge', () => {
    const spec = NAYO.moves.special.projectile;
    if (!spec) throw new Error('The Vinyle must be a projectile');
    const [x = 0, y = 0, width = 0, height = 0] = [
      spec.hitbox.x,
      spec.hitbox.y,
      spec.hitbox.width,
      spec.hitbox.height,
    ].map(toPx);
    const canvas = drawSheet('projectile');
    for (let frame = 0; frame < NAYO_SHEETS.projectile.frames; frame++) {
      let [left, right, bottom, top] = [Infinity, -Infinity, Infinity, -Infinity];
      eachPixelOf(canvas, frame, (px, py) => {
        left = Math.min(left, px - 1 / ART_SCALE);
        right = Math.max(right, px);
        bottom = Math.min(bottom, py - 1 / ART_SCALE);
        top = Math.max(top, py);
      });
      const where = `frame ${frame}: ${left}..${right} x ${bottom}..${top}`;
      expect(left, where).toBeLessThanOrEqual(x);
      expect(bottom, where).toBeLessThanOrEqual(y);
      expect(top, where).toBeGreaterThanOrEqual(y + height);
      expect(right, where).toBeGreaterThanOrEqual(x + width);
      expect(right, where).toBeLessThanOrEqual(x + width + 4);
    }
  });
});
