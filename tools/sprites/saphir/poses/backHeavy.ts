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
 * backHeavy (Chandelle, docs/saphir.md §4): 7 frames, 2, 2, 3, 4, 5, 6, 6 ticks (28), the foot
 * at the top on frame 3 (ticks 7-10), hitbox 4..32 / 58..104, a launcher against jumps. A back
 * flip: she leaps and throws herself over backward, the rear leg whipping straight up through
 * the space above her (a candle), then comes all the way round and lands. The body turns on the
 * pose's spin (negative: backward); drawn in the cell like the Contre-ut (the move gives her no
 * lift). The Chandelle glissée (chainLaunch) plays the same strip after its glide.
 *
 * - 0: the dip.
 * - 1: the leap, already tipping back, the leg swinging up.
 * - 2: tipping over, the leg high.
 * - 3: the top: on her back in the air, the leg straight up, the toes at the top of the hitbox.
 * - 4: upside down, coming round, tucked.
 * - 5: round, the landing.
 * - 6: back in the guard.
 */
/** The kicking leg straight out in front of her, before the spin turns it up. */
const KICK = (hipX: number, hipY: number, length: number) => raised(hipX + length, hipY + 2, 60);

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
    hip: at(2, 44),
    torso: 0,
    spin: -25,
    nearFoot: raised(6, 12, -45),
    farFoot: KICK(2, 44, 32.6),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'effort',
    effects: [smear(2.5, [-6, 16], [8, 40], [22, 60])],
  },
  {
    ...GUARD,
    hip: at(5, 58),
    torso: 0,
    spin: -55,
    nearFoot: raised(12, 44, -40),
    farFoot: KICK(5, 58, 32.6),
    bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'up' },
    face: 'effort',
    effects: [smear(3, [12, 50], [20, 70], [22, 84])],
  },
  {
    ...GUARD,
    hip: at(9, 66),
    torso: 0,
    spin: -78,
    nearFoot: raised(18, 52, -40),
    farFoot: KICK(9, 66, 32.6),
    bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'up' },
    face: 'kiai',
    effects: [smear(3.5, [22, 76], [18, 90], [14, 100])],
  },
  {
    ...GUARD,
    hip: at(6, 60),
    torso: 0,
    spin: -170,
    nearFoot: raised(14, 46, -40),
    farFoot: raised(16, 48, -40),
    bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'up' },
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

/** Her hands at her back, one let out to balance the leg on the frames of `ARMS`. */
const ARMS: Arms = {
  1: (p) => armOut(armOut(p, 'near', 80, 17), 'far', 60, 17),
  2: (p) => armOut(armOut(p, 'near', 85, 17), 'far', 65, 17),
  3: (p) => armOut(armOut(p, 'near', 88, 17), 'far', 70, 17),
  4: (p) => armOut(armOut(p, 'near', -60, 14), 'far', -80, 14),
};

export const POSES: readonly Pose[] = withArms(FRAMES, ARMS);
