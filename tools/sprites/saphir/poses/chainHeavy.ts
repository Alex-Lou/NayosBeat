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

/**
 * chainHeavy (Chassé arrière, docs/saphir.md §4): 7 frames, 2, 2, 2, 3, 3, 8, 9 ticks (29), the
 * heel lands on frame 4 (ticks 9-11), hitbox 12..52 / 36..50; the game carries her 12 px in over
 * ticks 0-8. The savate's spinning back kick: she turns her back on the opponent, looks over her
 * shoulder (the mask's other face), chambers the rear knee and drives the heel straight back into
 * the body, then turns round to face again. Turned frames: see lightFinisher.ts.
 *
 * - 0: the pivot on the lead ball.
 * - 1: turned, her back to the opponent.
 * - 2: turned, the knee chambered.
 * - 3: turned, the drive.
 * - 4: turned, the heel at the far edge of the hitbox, the leg straight at the hip.
 * - 5: turned, the knee folds back.
 * - 6: round again, back in the guard.
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
    turned: true,
    hip: at(3, 34.5),
    torso: 10,
    nearFoot: onBall(4, -32),
    farFoot: planted(-10, -10),
  },
  {
    ...GUARD,
    turned: true,
    hip: at(6, 35),
    torso: 18,
    nearFoot: onBall(6, -30),
    farFoot: raised(-2, 30, -136),
    bends: { ...GUARD.bends, farKnee: 'down' },
    face: 'effort',
  },
  {
    ...GUARD,
    turned: true,
    hip: at(10, 35.5),
    torso: 45,
    nearFoot: onBall(9, -30),
    farFoot: raised(-10, 40, -118),
    bends: { ...GUARD.bends, farKnee: 'down' },
    face: 'effort',
    effects: [smear(3, [12, 34], [22, 38], [30, 40])],
  },
  {
    ...GUARD,
    turned: true,
    hip: at(16, 36.5),
    torso: 55,
    nearFoot: onBall(15, -28),
    farFoot: raised(-15, 44, -110),
    bends: { ...GUARD.bends, farKnee: 'down' },
    face: 'kiai',
    effects: [smear(3.5, [24, 40], [38, 43], [47, 44])],
  },
  {
    ...GUARD,
    turned: true,
    hip: at(9, 35.5),
    torso: 16,
    nearFoot: onBall(9, -30),
    farFoot: raised(0, 26, -115),
    bends: { ...GUARD.bends, farKnee: 'down' },
  },
  {
    ...GUARD,
    hip: at(-1, 34),
    torso: 1,
    farFoot: planted(-12),
  },
];

/** Her hands at her back, one let out to balance the leg on the frames of `ARMS`. */
const ARMS: Arms = {
  2: (p) => armOut(p, 'near', 40, 13),
  3: (p) => armOut(p, 'near', 15),
  4: (p) => armOut(p, 'near', 8, 18),
  5: (p) => armOut(p, 'near', 30, 14),
};

export const POSES: readonly Pose[] = withArms(FRAMES, ARMS);
