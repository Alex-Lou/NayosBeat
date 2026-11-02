import { at, behindBack, onBall, raised, smear, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';

/**
 * crouchLight (Coup de pied bas, docs/saphir.md §4): 5 frames, 2, 3, 2, 4, 5 ticks (16), the
 * foot lands on frame 2 (ticks 5-6), hitbox 10..40 / 2..14, a low. Out of her plié, the lead
 * foot shoots out along the floor to the shin, nearly flat, and comes back.
 *
 * - 0: the lead foot leaves the floor.
 * - 1: the leg unfolding low.
 * - 2: the foot at the far edge of the hitbox, the leg straight a hand over the floor.
 * - 3-4: back into the crouch.
 */
const FRAMES: readonly Pose[] = [
  { ...CROUCH, hip: at(-2, 19.5), nearFoot: raised(16, 6, -10) },
  {
    ...CROUCH,
    hip: at(1, 19),
    torso: 20,
    nearFoot: raised(24, 6, 0),
    farFoot: onBall(-6, -56),
    face: 'effort',
  },
  {
    ...CROUCH,
    hip: at(4, 19),
    torso: 14,
    nearFoot: raised(33, 6, 10),
    farFoot: onBall(-3, -55),
    face: 'effort',
    effects: [smear(2.5, [20, 8], [28, 8], [34, 8])],
  },
  { ...CROUCH, hip: at(0, 19.5), nearFoot: raised(20, 6, -10), farFoot: onBall(-6, -56) },
  CROUCH,
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
