import { describe, expect, it } from 'vitest';
import { px } from '../../src/core/constants';
import { moveDuration } from '../../src/core/moves';
import { validateTemplate } from '../../src/core/validate';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { advance, box, dash } from '../../src/data/fighters/shared';

describe('fighter authoring helpers', () => {
  it('writes boxes in pixels, stored in sub-pixels', () => {
    expect(box(-16, 0, 32, 84.5)).toEqual({ x: px(-16), y: 0, width: px(32), height: 8450 });
  });

  it('steps forward on the frames of the range only, one entry per frame of the move', () => {
    expect(advance(5, { from: 1, to: 3, speed: 2.5 }).dx).toEqual([0, 250, 250, 0, 0]);
  });

  it('gives every moving move one step per frame', () => {
    for (const template of [NAYO, RIFF]) {
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

  it('rejects a posture without hurtboxes', () => {
    expect(validateTemplate({ ...NAYO, airHurtboxes: [] })).not.toEqual([]);
  });
});
