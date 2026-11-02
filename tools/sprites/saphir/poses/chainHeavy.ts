import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * chainHeavy (Chassé arrière, docs/saphir.md §4): 7 frames, 2, 2, 2, 3, 3, 8, 9 ticks (29), the
 * heel lands on frame 4 (ticks 9-11), hitbox 12..52 / 36..50; the game carries her 12 px in over
 * ticks 0-8. The Chassé again, from the rear leg: she pivots on her lead foot, chambers the
 * rear knee in front of her and drives the heel out, the body leaning away; it goes further than
 * the lead Chassé, and slower.
 *
 * - 0: the pivot, the weight onto the lead ball.
 * - 1: the rear foot leaves the floor, the torso bowing over the pivot.
 * - 2: the rear knee chambered high in front.
 * - 3: the drive, the leg half out.
 * - 4: the sole at the far edge of the hitbox, the leg straight at the hip, the torso far back.
 * - 5: the knee folds back.
 * - 6: the foot steps down behind her, back in the guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-1, 34),
    torso: 6,
    nearFoot: onBall(10, -34),
    farFoot: onBall(-11, -35),
  },
  {
    ...GUARD,
    hip: at(2, 34.5),
    torso: 14,
    nearFoot: onBall(11, -34),
    farFoot: raised(-8, 14, -38),
  },
  {
    ...GUARD,
    hip: at(5, 35.5),
    torso: 0,
    nearFoot: onBall(12, -32),
    farFoot: raised(12, 36, -20),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(9, 36),
    torso: -18,
    nearFoot: onBall(13, -30),
    farFoot: raised(28, 42, 60),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'effort',
    effects: [smear(3, [12, 36], [20, 40], [28, 42])],
  },
  {
    ...GUARD,
    hip: at(16, 36.5),
    torso: -28,
    nearFoot: onBall(16, -28),
    farFoot: raised(48, 43, 90),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'kiai',
    effects: [smear(3.5, [22, 40], [36, 42], [47, 43])],
  },
  {
    ...GUARD,
    hip: at(9, 35.5),
    torso: -12,
    nearFoot: onBall(13, -30),
    farFoot: raised(16, 28, -25),
    bends: { ...GUARD.bends, farKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(-1, 34),
    torso: 1,
    farFoot: planted(-12),
  },
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
