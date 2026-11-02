import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * backHeavy (Chandelle, docs/saphir.md §4): 7 frames, 2, 2, 3, 4, 5, 6, 6 ticks (28), the foot
 * at the top on frame 3 (ticks 7-10), hitbox 4..32 / 58..104, a launcher against jumps. The
 * candle: a hop, and the rear leg goes straight to the sky, the lead one tucked; the Contre-ut's
 * little sister, from the other leg and without its energy. Drawn in the cell like the Contre-ut
 * (the move gives her no lift). The Chandelle glissée (chainLaunch) plays the same strip after
 * its glide (the game carries her).
 *
 * - 0: the dip.
 * - 1: the push off the lead foot, the rear leg swinging up.
 * - 2: rising, the leg high.
 * - 3: the top: the rear leg straight up, the toes at the top of the hitbox; the trail.
 * - 4: the fall.
 * - 5: the landing.
 * - 6: back in the guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-2, 31.5),
    torso: 6,
    nearFoot: onBall(10, -36),
    farFoot: planted(-13, -24),
  },
  {
    ...GUARD,
    hip: at(3, 44),
    torso: -8,
    nearFoot: raised(4, 10, -45),
    farFoot: raised(19, 73, 105),
    bends: { ...GUARD.bends, farKnee: 'back' },
    face: 'effort',
    effects: [smear(2.5, [-6, 16], [8, 44], [17, 66])],
  },
  {
    ...GUARD,
    hip: at(6, 56),
    torso: -18,
    nearFoot: raised(-2, 38, -50),
    farFoot: raised(16, 88, 112),
    bends: { ...GUARD.bends, farKnee: 'back', nearKnee: 'down' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(8, 66),
    torso: -22,
    nearFoot: raised(0, 36, -50),
    farFoot: raised(16, 98, 115),
    bends: { ...GUARD.bends, farKnee: 'back', nearKnee: 'down' },
    face: 'kiai',
    effects: [smear(3.5, [14, 62], [16, 80], [17, 98])],
  },
  {
    ...GUARD,
    hip: at(4, 50),
    torso: -6,
    nearFoot: raised(10, 22, -20),
    farFoot: raised(-6, 22, -20),
  },
  {
    ...GUARD,
    hip: at(-2, 30.5),
    torso: 6,
    nearFoot: onBall(10, -40),
    farFoot: planted(-13, -28),
  },
  {
    ...GUARD,
    hip: at(-2, 33.5),
    torso: 3,
  },
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
