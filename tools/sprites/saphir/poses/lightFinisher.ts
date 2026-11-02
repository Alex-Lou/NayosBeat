import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * lightFinisher (Revers tournant, docs/saphir.md §4): 7 frames, 2, 3, 3, 3, 5, 6, 7 ticks (29),
 * the heel lands on frame 3 (ticks 8-10), hitbox 8..44 / 36..60; the game carries her 12 px in
 * over ticks 0-8; it floors. The end of the phrase: she turns on her lead foot, the rear leg
 * swings up behind her and round over the top, and the heel sweeps the ribs. Seen side on, the
 * turn is in the trail: a whole circle, behind, over and in front of her.
 *
 * - 0: the pivot: the weight on the lead ball, the torso folding forward, the mask down.
 * - 1: the turn: the rear leg rising behind her, the chest bowed.
 * - 2: the leg sweeping over the top, the torso coming back up.
 * - 3: the heel through the hitbox at rib height, the leg straight, the torso far back; the
 *   circle of the trail closing on the foot.
 * - 4: the knee folds back.
 * - 5: the foot comes down behind.
 * - 6: back in her guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-1, 34),
    torso: 10,
    head: 6,
    nearFoot: onBall(10, -36),
    farFoot: onBall(-10, -40),
  },
  {
    ...GUARD,
    hip: at(3, 35),
    torso: 18,
    head: 10,
    nearFoot: onBall(11, -36),
    farFoot: raised(-18, 24, -100),
    face: 'effort',
    effects: [smear(2.5, [-10, 8], [-16, 16], [-18, 26])],
  },
  {
    ...GUARD,
    hip: at(6, 36),
    torso: -20,
    nearFoot: onBall(12, -32),
    farFoot: raised(20, 56, 100),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'effort',
    effects: [smear(3, [-18, 26], [-12, 50], [4, 60], [18, 58])],
  },
  {
    ...GUARD,
    hip: at(8, 36),
    torso: -26,
    nearFoot: onBall(13, -30),
    farFoot: raised(36, 47, 90),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'kiai',
    effects: [smear(3.5, [-18, 30], [-8, 56], [12, 66], [28, 60], [36, 49])],
  },
  {
    ...GUARD,
    hip: at(5, 35),
    torso: -10,
    nearFoot: onBall(11, -30),
    farFoot: raised(14, 26, -20),
    bends: { ...GUARD.bends, farKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(1, 34.5),
    torso: 2,
    farFoot: planted(-10),
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
