import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * chainLight (Fouetté, docs/saphir.md §4): 6 frames, 3, 3, 3, 4, 4, 4 ticks (21), the instep
 * lands on frame 2 (ticks 6-8), hitbox 10..44 / 46..60; the game carries her 10 px in over ticks
 * 0-6, a glide on her lead foot. The second word: the rear leg whips round in an arc and the
 * instep cracks at the ribs, the torso leaning away from it, then the foot goes home behind her.
 *
 * - 0: the rear foot peels off the floor behind her.
 * - 1: the knee comes through, high; the trail starts behind her.
 * - 2: the leg out, the toes pointed, the instep on the far edge of the hitbox; the arc behind.
 * - 3: the knee folds back.
 * - 4: the foot swinging back down behind her.
 * - 5: back on the floor, a hair from the guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(0, 34.5),
    torso: 4,
    nearFoot: onBall(10, -30),
    farFoot: raised(-16, 12, -30),
  },
  {
    ...GUARD,
    hip: at(3, 35),
    torso: -8,
    nearFoot: onBall(10, -34),
    farFoot: raised(16, 30, -20),
    face: 'effort',
    effects: [smear(2.5, [-14, 14], [0, 30], [12, 40])],
  },
  {
    ...GUARD,
    hip: at(8, 35.5),
    torso: -20,
    nearFoot: onBall(13, -30),
    farFoot: raised(37, 51.5, 59),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'effort',
    effects: [smear(3, [0, 30], [22, 50], [37, 53])],
  },
  {
    ...GUARD,
    hip: at(5, 35),
    torso: -8,
    nearFoot: onBall(11, -30),
    farFoot: raised(14, 30, -20),
    bends: { ...GUARD.bends, farKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(1, 34.5),
    torso: 0,
    farFoot: raised(-6, 8, -20),
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
