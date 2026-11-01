import { describe, expect, it } from 'vitest';
import { px } from '../../src/core/constants';
import { moveDuration } from '../../src/core/moves';
import { validateTemplate } from '../../src/core/validate';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { SAPHIR } from '../../src/data/fighters/saphir';
import { advance, box, dash, glide, leapArc } from '../../src/data/fighters/shared';

describe('fighter authoring helpers', () => {
  it('writes boxes in pixels, stored in sub-pixels', () => {
    expect(box(-16, 0, 32, 84.5)).toEqual({ x: px(-16), y: 0, width: px(32), height: 8450 });
  });

  it('steps forward on the frames of the range only, one entry per frame of the move', () => {
    expect(advance(5, { from: 1, to: 3, speed: 2.5 }).dx).toEqual([0, 250, 250, 0, 0]);
  });

  it('gives every moving move one step per frame', () => {
    for (const template of [NAYO, RIFF, SAPHIR]) {
      for (const move of Object.values(template.moves)) {
        if (move.motion) expect(move.motion.dx).toHaveLength(moveDuration(move));
      }
    }
  });

  it('rejects a motion that does not last as long as its move', () => {
    const { specialForward } = NAYO.moves;
    const motion = advance(moveDuration(specialForward) - 1, { from: 3, to: 15, speed: 2.5 });
    const broken = {
      ...NAYO,
      moves: { ...NAYO.moves, specialForward: { ...specialForward, motion } },
    };
    expect(validateTemplate(broken)).not.toEqual([]);
  });

  it('writes a dash as a movement: frame 0 sets off, the curve, then a still recovery', () => {
    const move = dash({ name: 'Test', duration: 6, frames: 3, distancePx: 9, back: true });
    expect(move).toMatchObject({ kind: 'movement', startup: 1, active: 3, recovery: 2, damage: 0 });
    expect(move.motion?.dx).toEqual([0, -500, -300, -100, 0, 0]);
    expect(move.hitbox).toBeUndefined();
  });

  it("draws the Saut de l'ange's leap as §10.2 lists it, frame by frame", () => {
    const heights = leapArc(34, { from: 3, to: 20, apexPx: 34 });
    expect(heights).toHaveLength(34);
    // Pinned to the sub-pixel: a replay (and the future rollback) needs the same data everywhere.
    const leap = heights.slice(3, 20);
    expect(leap).toEqual([
      590, 1163, 1700, 2185, 2605, 2944, 3195, 3348, 3400, 3348, 3195, 2944, 2605, 2185, 1700, 1163,
      590,
    ]);
    // The spec's heights (f3 → f19), rounded to a tenth of a pixel from the exact sine.
    const spec = [5.9, 11.6, 17, 21.9, 26.1, 29.4, 31.9, 33.5, 34];
    [...spec, ...spec.slice(0, -1).reverse()].forEach((heightPx, i) => {
      expect(Math.abs((leap[i] ?? 0) - px(heightPx)), `f${i + 3}`).toBeLessThanOrEqual(5);
    });
    expect([...heights.slice(0, 3), ...heights.slice(20)].every((y) => y === 0)).toBe(true);
  });

  it('eases the Glissade as §10.2 lists it, 64 px to the sub-pixel', () => {
    const { dx } = glide(34, { from: 1, to: 18, distancePx: 64 });
    expect(dx.slice(1, 18).map((step) => step / 100)).toEqual([
      7.31, 6.86, 6.43, 5.97, 5.54, 5.09, 4.65, 4.21, 3.77, 3.32, 2.88, 2.43, 2, 1.55, 1.1, 0.67,
      0.22,
    ]);
    expect(dx.reduce((total, step) => total + step, 0)).toBe(px(64));
  });

  it('rejects a posture without hurtboxes', () => {
    expect(validateTemplate({ ...NAYO, airHurtboxes: [] })).not.toEqual([]);
  });

  it('rejects a posture with more than two hurtboxes, even stacked', () => {
    const three = [box(-10, 0, 20, 20), box(-10, 20, 20, 20), box(-10, 40, 20, 20)];
    expect(validateTemplate({ ...NAYO, airHurtboxes: three })).not.toEqual([]);
  });

  it('rejects two hurtboxes with a gap between them', () => {
    // Legs up to 40 px, torso from 44 px: a blow at 42 px would go through the fighter.
    const gap = [box(-22, 4, 43, 36), box(-11, 44, 29, 42)];
    expect(validateTemplate({ ...NAYO, airHurtboxes: gap })).not.toEqual([]);
  });

  it('accepts stacked hurtboxes listed in any order', () => {
    const torsoFirst = [...NAYO.airHurtboxes].reverse();
    expect(validateTemplate({ ...NAYO, airHurtboxes: torsoFirst })).toEqual([]);
  });
});
