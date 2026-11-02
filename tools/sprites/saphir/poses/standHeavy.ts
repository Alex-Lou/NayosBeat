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
 * standHeavy (Chassé, docs/saphir.md §4): 7 frames, 2, 3, 3, 2, 3, 7, 9 ticks (29), the sole
 * lands on frame 4 (ticks 10-12), hitbox 14..58 / 34..48. The savate's back thrust kick, turned
 * (owner's request: her kicks turn): she pivots on the lead foot until her back is to the
 * opponent, the rear knee comes up folded, then the leg drives out straight behind her at the hip,
 * the heel first, the body leaning away from it like the arm of a scale; the mask's other face
 * watches. The game does not move her: the step in is drawn, and stepped back.
 *
 * The turned frames are written as lightFinisher.ts writes them: the kick goes out behind her,
 * the tool mirrors the body round the hip toward the opponent.
 *
 * - 0: the coil: the weight sinks onto the rear leg, the lead heel lifts.
 * - 1: the pivot: turned on the lead ball, the rear knee leaving the floor.
 * - 2: the chamber: the knee folded high against her chest, her back to the opponent.
 * - 3: the drive: the leg half out, the torso leaning away.
 * - 4: impact: the leg straight at hip height, the heel on the far edge of the hitbox, the
 *   torso far over; its trail, the cut sapphire, the grooves of the turn, two notes.
 * - 5: the knee folds back to the chamber.
 * - 6: round again, the foot steps down into her guard.
 */
const KICK: Pose['bends'] = { ...GUARD.bends, farKnee: 'down' };

const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-4, 34.5),
    torso: -2,
    nearFoot: planted(7, -16),
    farFoot: planted(-14, -10),
  },
  {
    ...GUARD,
    turned: true,
    hip: at(4, 36),
    torso: 12,
    nearFoot: onBall(6, -30),
    farFoot: raised(-2, 14, -80),
    bends: KICK,
  },
  {
    ...GUARD,
    turned: true,
    hip: at(9, 37),
    torso: 24,
    nearFoot: onBall(13, -30),
    farFoot: raised(2, 28, -95),
    bends: KICK,
    face: 'effort',
  },
  {
    ...GUARD,
    turned: true,
    hip: at(16, 37),
    torso: 34,
    nearFoot: onBall(22, -30),
    farFoot: raised(-5, 40, -115),
    bends: KICK,
    face: 'effort',
    effects: [smear(3, [18, 33], [28, 37], [37, 40])],
  },
  {
    ...GUARD,
    turned: true,
    hip: at(21, 37),
    torso: 42,
    nearFoot: onBall(28, -30),
    farFoot: raised(-12.5, 41, -95),
    bends: KICK,
    face: 'kiai',
    effects: [
      smear(3.5, [26, 37], [40, 40], [53, 41]),
      ...turnMagic([53, 41], [21, 37], 18, [-30, 40]),
    ],
  },
  {
    ...GUARD,
    turned: true,
    hip: at(11, 37),
    torso: 22,
    nearFoot: onBall(16, -30),
    farFoot: raised(2, 30, -95),
    bends: KICK,
  },
  {
    ...GUARD,
    hip: at(-1, 35),
    torso: 1,
    nearFoot: planted(9, -10),
    farFoot: planted(-12),
  },
];

/** Her hands at her back, one let out to balance the leg on the frames of `ARMS`. */
const ARMS: Arms = {
  2: (p) => armOut(p, 'near', 40, 14),
  3: (p) => armOut(p, 'near', 25),
  4: (p) => armOut(p, 'near', 18),
  5: (p) => armOut(p, 'near', 35, 14),
};

export const POSES: readonly Pose[] = withArms(FRAMES, ARMS);
