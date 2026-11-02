import { at, behindBack, GUARD, onBall, planted, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';

/**
 * block: 6 frames. Standing 0-2 (2, 3 ticks, then held while the blockstun lasts), crouching 3-5
 * (the same). The last frame of each is also her proximity guard, held before anything lands:
 * it must read « she covers » at 1x. The first is the impact, the cover rocked back by the blow;
 * the second springs back a hair past the cover.
 *
 * Her cover is a leg, like everything she does: the savate's check. The hands never leave her
 * back; she lifts the lead knee and stands the shin up in front of her body, the foot pointed
 * down, the torso tucked behind it, the mask lowered. Nothing like a boxer's shell: the blow
 * lands on a shin.
 *
 * - 0 (impact): the shin driven back toward her, the hips pushed back a step, the torso rocked
 *   back.
 * - 1: springs back a hair past the hold.
 * - 2 (hold): the knee up at the belly, the shin upright, the rear leg braced.
 * - 3-5: the same on the crouch: the lead knee up low in front of her, the shin upright, the
 *   torso folded over it.
 */
const HOLD: Pose = behindBack({
  ...GUARD,
  hip: at(-7, 32.5),
  torso: 8,
  head: 4,
  nearFoot: onBall(8, -70),
  farFoot: planted(-14),
  bends: { ...GUARD.bends, nearKnee: 'up' },
});

const CROUCH_HOLD: Pose = behindBack({
  ...CROUCH,
  hip: at(-8, 19),
  torso: 22,
  nearFoot: onBall(6.5, -62),
  bends: { ...GUARD.bends, nearKnee: 'up' },
});

export const POSES: readonly Pose[] = [
  behindBack({
    ...HOLD,
    hip: at(-8.5, 32),
    torso: -2,
    head: 0,
    nearFoot: onBall(8.5, -64),
    farFoot: planted(-15, -10),
  }),
  behindBack({ ...HOLD, hip: at(-6.5, 32.5), torso: 10 }),
  HOLD,
  behindBack({
    ...CROUCH_HOLD,
    hip: at(-10, 18.5),
    torso: 14,
    nearFoot: onBall(7.5, -58),
    farFoot: onBall(-11, -58),
  }),
  behindBack({ ...CROUCH_HOLD, hip: at(-7.5, 19), torso: 24 }),
  CROUCH_HOLD,
];
