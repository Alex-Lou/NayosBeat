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
 * specialForward (Rubato, docs/saphir.md §4): 9 frames, 4, 4, 4, 4, 4, 4, 4, 5, 5 ticks (38),
 * the instep lands on frame 4 (ticks 16-19), hitbox 12..54 / 36..52; the game carries her 36 px
 * in over ticks 4-16; it floors. Late on purpose: she holds her weight back a whole beat, then
 * falls on the opponent in a long lunge and the rear leg whips round at the ribs after it, the
 * body stretched long and low. The hands never leave her back.
 *
 * - 0: the weight held back, the torso leaning away, the mask up: the rest before the note.
 * - 1: the launch off the rear foot, the torso pitching forward.
 * - 2: the lunge, the lead foot sliding out far in front, the rear leg trailing.
 * - 3: the rear knee gathering under her as the slide ends.
 * - 4: the whip, kiai: the rear leg straight at the ribs, the toes pointed on the far edge of
 *   the hitbox, the torso far back; her energy bursts off the instep (the Remix redraws it in
 *   platine).
 * - 5: the knee folds back.
 * - 6-8: the foot down behind her, and back into the guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-6, 33),
    torso: -10,
    head: -6,
    nearFoot: onBall(10, -30),
    farFoot: planted(-15, -14),
  },
  {
    ...GUARD,
    hip: at(0, 32),
    torso: 14,
    nearFoot: raised(16, 10, -15),
    farFoot: onBall(-14, -40),
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(6, 31),
    torso: 20,
    nearFoot: planted(22),
    farFoot: raised(-16, 14, -45),
    face: 'effort',
    effects: [smear(2.5, [-30, 30], [-14, 31], [0, 31])],
  },
  {
    ...GUARD,
    hip: at(8, 33),
    torso: 4,
    nearFoot: onBall(20, -25),
    farFoot: raised(-4, 16, -50),
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(16, 36),
    torso: -26,
    nearFoot: onBall(20, -28),
    farFoot: raised(47.8, 44, 60),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'kiai',
    effects: [
      smear(3.5, [-2, 20], [16, 38], [34, 46], [48, 46]),
      { kind: 'energy', center: at(52, 47), radius: 3.5 },
    ],
  },
  {
    ...GUARD,
    hip: at(10, 35),
    torso: -10,
    nearFoot: onBall(18, -28),
    farFoot: raised(14, 26, -25),
    bends: { ...GUARD.bends, farKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(4, 34),
    torso: 2,
    nearFoot: onBall(14, -30),
    farFoot: planted(-8),
  },
  {
    ...GUARD,
    hip: at(0, 34),
    torso: 1,
    nearFoot: onBall(12, -30),
    farFoot: planted(-11),
  },
  {
    ...GUARD,
    hip: at(-2, 34),
    farFoot: planted(-13),
  },
];

/** Her hands at her back, one let out to balance the leg on the frames of `ARMS`. */
const ARMS: Arms = {
  2: (p) => armOut(p, 'near', -110, 19.5),
  3: (p) => armOut(p, 'near', -60, 12),
  4: (p) => armOut(p, 'near', -40, 18),
  5: (p) => armOut(p, 'near', -70, 14),
};

export const POSES: readonly Pose[] = withArms(FRAMES, ARMS);
