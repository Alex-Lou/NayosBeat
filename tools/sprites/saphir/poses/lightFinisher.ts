import {
  armOut,
  at,
  GUARD,
  onBall,
  planted,
  raised,
  smear,
  withArms,
  type Arms,
  type Pose,
} from './common.ts';
import { turnMagic } from './jumpAttacks.ts';

/**
 * lightFinisher (Revers tournant, docs/saphir.md §4): 7 frames, 2, 3, 3, 3, 5, 6, 7 ticks (29),
 * the heel lands on frame 3 (ticks 8-10), hitbox 8..44 / 36..60; the game carries her 12 px in
 * over ticks 0-8; it floors. The end of the phrase, a true spinning hook: she pivots on her lead
 * foot until her back is to the opponent (the Janus mask still watches), the rear leg swings
 * round and the heel sweeps the ribs, then she comes round to face again.
 *
 * The turned frames (Pose.turned) are written the way a body does them seen from its other side:
 * the kick goes out behind her, the tool mirrors the body round the hip toward the opponent.
 *
 * - 0: the pivot: the weight on the lead ball, the torso folding forward.
 * - 1: turned: her back to the opponent, the rear leg leaving the floor.
 * - 2: turned: the leg swinging round, high.
 * - 3: turned: the heel through the hitbox at rib height, the leg straight; the trail a circle.
 * - 4: turned: the knee folds back.
 * - 5: round again, the foot coming down.
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
    turned: true,
    hip: at(4, 34.5),
    torso: 12,
    nearFoot: onBall(4, -34),
    farFoot: raised(-12, 18, -95),
    bends: { ...GUARD.bends, farKnee: 'down' },
    face: 'effort',
    effects: [smear(2.5, [-8, 10], [-2, 18], [14, 22])],
  },
  {
    ...GUARD,
    turned: true,
    hip: at(7, 35.5),
    torso: 42,
    nearFoot: onBall(6, -30),
    farFoot: raised(-18, 44, -112),
    bends: { ...GUARD.bends, farKnee: 'down' },
    face: 'effort',
    effects: [smear(3, [14, 22], [26, 34], [32, 44])],
  },
  {
    ...GUARD,
    turned: true,
    hip: at(9, 36),
    torso: 55,
    nearFoot: onBall(7, -30),
    farFoot: raised(-18.5, 47, -110),
    bends: { ...GUARD.bends, farKnee: 'down' },
    face: 'kiai',
    effects: [
      smear(3.5, [-10, 24], [6, 14], [22, 22], [30, 34], [32, 44]),
      ...turnMagic([32, 44], [9, 36], 18, [10, 80]),
    ],
  },
  {
    ...GUARD,
    turned: true,
    hip: at(7, 35),
    torso: 14,
    nearFoot: onBall(6, -30),
    farFoot: raised(-4, 22, -100),
    bends: { ...GUARD.bends, farKnee: 'down' },
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

/** Her hands at her back, one let out to balance the leg on the frames of `ARMS`. */
const ARMS: Arms = {
  1: (p) => armOut(p, 'near', 40, 14),
  2: (p) => armOut(p, 'near', 15),
  3: (p) => armOut(p, 'near', 8, 18),
  4: (p) => armOut(p, 'near', 30, 14),
};

export const POSES: readonly Pose[] = withArms(FRAMES, ARMS);
