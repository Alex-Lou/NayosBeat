import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * forwardLight (Pas glissé, docs/saphir.md §4): 6 frames, 3, 3, 2, 2, 5, 5 ticks (20), the toe
 * lands on frame 3 (ticks 8-9), hitbox 10..40 / 44..56; the game carries her 16 px in over ticks
 * 0-8. She glides in low on her lead foot, the rear one sliding after it, then the lead toe
 * stabs the belly like the Pointe.
 *
 * - 0-1: the glide, low, the lead foot sliding out, the rear one following.
 * - 2: the lead knee lifting out of the glide.
 * - 3: the toe at the far edge of the hitbox.
 * - 4-5: the foot home, back in the guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(0, 32),
    torso: 8,
    nearFoot: onBall(16, -20),
    farFoot: planted(-14, -12),
  },
  {
    ...GUARD,
    hip: at(2, 32.5),
    torso: 6,
    nearFoot: onBall(16, -24),
    farFoot: planted(-8, -10),
  },
  {
    ...GUARD,
    hip: at(2, 34),
    torso: -4,
    farFoot: planted(-9),
    nearFoot: raised(18, 24, -20),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(4, 35),
    torso: -14,
    farFoot: planted(-9),
    nearFoot: raised(34, 48, 53),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
    effects: [smear(2.5, [18, 38], [28, 45], [35, 49])],
  },
  {
    ...GUARD,
    hip: at(0, 34.5),
    torso: -4,
    farFoot: planted(-11),
    nearFoot: raised(16, 24, -20),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(-2, 34),
    torso: 1,
    farFoot: planted(-13),
  },
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
