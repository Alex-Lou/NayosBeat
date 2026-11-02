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
 * super (Coda, docs/saphir.md §6): 9 frames, 2, 3, 3, 2, 6, 6, 6, 10, 10 ticks (48), a blow a
 * frame on frames 4, 5 and 6 (ticks 10, 16 and 22), hitbox 10..54 / 4..64; the game carries her
 * 24 px in over ticks 2-12. DOU, BI, DOUM: a tornado. Two swing steps in, a spin, and she leaves
 * the floor turning: a fouetté in the air, then, turned round in mid-air, a back kick through the
 * spin (the mask's other face toward the opponent), then she lands on the heel's revers that
 * floors. Drawn in the cell like the Contre-ut (the move gives her no lift). Turned frames: see
 * lightFinisher.ts.
 *
 * - 0: the long beat, the weight dips.
 * - 1-2: the swing steps in, the second one already turning (her back to the opponent).
 * - 3: the take-off, the knees driving up.
 * - 4: DOU: in the air, the rear leg whips round at the ribs.
 * - 5: BI: still in the air, turned round, the heel driven back through the body.
 * - 6: DOUM: landing round on the lead foot, the heel's revers at the chest; the trail a whole
 *   circle.
 * - 7: the knee folds back.
 * - 8: back in her guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-2, 33.5),
    torso: 6,
    head: 4,
  },
  {
    ...GUARD,
    hip: at(2, 34),
    torso: 2,
    nearFoot: raised(16, 7, -15),
    farFoot: planted(-12, -10),
  },
  {
    ...GUARD,
    turned: true,
    hip: at(6, 33),
    torso: 10,
    nearFoot: onBall(6, -30),
    farFoot: planted(-8, -10),
    effects: [smear(2.5, [-6, 30], [6, 24], [16, 30])],
  },
  {
    ...GUARD,
    hip: at(8, 44),
    torso: -4,
    nearFoot: raised(14, 22, -40),
    farFoot: raised(-2, 18, -50),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(18, 52),
    torso: -24,
    nearFoot: raised(16, 30, -50),
    farFoot: raised(48, 46, 30),
    bends: { ...GUARD.bends, farKnee: 'up', nearKnee: 'down' },
    face: 'kiai',
    effects: [
      smear(3, [4, 38], [26, 50], [44, 48]),
      { kind: 'energy', center: at(53, 48), radius: 3.5 },
    ],
  },
  {
    ...GUARD,
    turned: true,
    hip: at(20, 50),
    torso: 55,
    nearFoot: raised(28, 28, -40),
    farFoot: raised(-11, 46, -110),
    bends: { ...GUARD.bends, farKnee: 'down' },
    face: 'kiai',
    effects: [
      smear(3, [14, 30], [32, 40], [46, 46]),
      { kind: 'energy', center: at(53, 47), radius: 3.5 },
    ],
  },
  {
    ...GUARD,
    hip: at(20, 37),
    torso: -28,
    nearFoot: raised(48.5, 52, 90),
    farFoot: onBall(16, -40),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'kiai',
    effects: [
      smear(3.5, [4, 24], [6, 58], [24, 70], [38, 64], [45, 56]),
      { kind: 'energy', center: at(53, 52), radius: 4.5 },
    ],
  },
  {
    ...GUARD,
    hip: at(12, 34),
    torso: -8,
    nearFoot: raised(22, 20, -30),
    farFoot: planted(10),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(-2, 34),
    farFoot: planted(-13),
  },
];

/** Her hands at her back, one let out to balance the leg on the frames of `ARMS`. */
const ARMS: Arms = {
  3: (p) => armOut(armOut(p, 'near', 50, 15), 'far', 80, 15),
  4: (p) => armOut(armOut(p, 'near', -40, 17), 'far', 60, 17),
  5: (p) => armOut(p, 'near', 15, 18),
  6: (p) => armOut(armOut(p, 'near', -50, 17), 'far', 70, 17),
  7: (p) => armOut(p, 'near', -100, 19.5),
};

export const POSES: readonly Pose[] = withArms(FRAMES, ARMS);
