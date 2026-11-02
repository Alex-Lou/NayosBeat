import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * standLight (Pointe, docs/saphir.md §4): 5 frames, 2, 3, 2, 4, 5 ticks (16), the toe lands on
 * frame 2 (ticks 5-6), hitbox 10..41 / 44..56. The first word of her phrase: the lead foot
 * snaps out from its ball and stabs the belly with the point of the shoe, quick and long, then
 * comes home. The hands stay at her back.
 *
 * - 0: the lead knee lifts off the ball.
 * - 1: the shin unfolding.
 * - 2: the toe at the far edge of the hitbox, the leg straight at belly height, the torso
 *   leaning away; a short trail.
 * - 3: the knee folds back.
 * - 4: the foot back on its ball, a hair from the guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-2, 34.5),
    torso: 0,
    nearFoot: raised(14, 18, -30),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(1, 35),
    torso: -6,
    farFoot: planted(-11),
    nearFoot: raised(24, 38, 20),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(5, 35),
    torso: -14,
    farFoot: planted(-8),
    nearFoot: raised(35, 48, 53),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
    effects: [smear(2.5, [20, 40], [30, 46], [37, 50])],
  },
  {
    ...GUARD,
    hip: at(1, 34.5),
    torso: -6,
    farFoot: planted(-11),
    nearFoot: raised(18, 28, -20),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(-2, 34),
    torso: 1,
    nearFoot: onBall(10, -30),
    farFoot: planted(-13),
  },
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
