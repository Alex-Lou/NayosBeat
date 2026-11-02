import { armOut, at, onBall, raised, smear, withArms, type Arms, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';
import { turnMagic } from './jumpAttacks.ts';

/**
 * crouchHeavy (Fauche, docs/saphir.md §4): 8 frames, 2, 3, 4, 3, 5, 5, 5, 5 ticks (32), the
 * sweep lands on frame 3 (ticks 9-11), hitbox 12..52 / 2..14, a low that trips. A spinning back
 * sweep (owner's request: her kicks turn): she pivots on the lead ball, her back to the
 * opponent, one hand down on the floor, and the rear leg sweeps round in a wide arc along the
 * floor at the ankles, the heel leading; the other hand stays at her back.
 *
 * The turned frames are written as lightFinisher.ts writes them: the leg sweeps out behind her,
 * the tool mirrors the body round the hip toward the opponent.
 *
 * - 0: she sinks onto the rear leg.
 * - 1: the pivot: turned, the hand going down, the rear foot leaving the floor.
 * - 2: the leg swinging out, low.
 * - 3: the sweep at the far edge of the hitbox, the leg straight along the floor, the hand on
 *   it; the trail an arc on the floor, the cut sapphire, the grooves of the turn, two notes.
 * - 4-5: the leg comes back in, round again.
 * - 6-7: back into the crouch.
 */
const SWEEP: Pose['bends'] = { ...CROUCH.bends, farKnee: 'down' };

const FRAMES: readonly Pose[] = [
  { ...CROUCH, hip: at(0, 18), torso: 30, farFoot: onBall(-6, -56) },
  {
    ...CROUCH,
    turned: true,
    hip: at(6, 21),
    torso: 40,
    nearFoot: onBall(12, -45),
    farFoot: raised(-6, 9, -80),
    bends: SWEEP,
    face: 'effort',
  },
  {
    ...CROUCH,
    turned: true,
    hip: at(10, 20),
    torso: 50,
    nearFoot: onBall(17, -45),
    farFoot: raised(-12, 6, -90),
    bends: SWEEP,
    face: 'effort',
    effects: [smear(2.5, [16, 8], [24, 7], [32, 8])],
  },
  {
    ...CROUCH,
    turned: true,
    hip: at(14, 17),
    torso: 60,
    nearFoot: onBall(23, -45),
    farFoot: raised(-17, 6, -110),
    bends: SWEEP,
    face: 'kiai',
    effects: [smear(3, [20, 8], [34, 7], [46, 9]), ...turnMagic([46, 9], [14, 17], 22, [-40, 10])],
  },
  {
    ...CROUCH,
    turned: true,
    hip: at(10, 20.5),
    torso: 40,
    nearFoot: onBall(17, -45),
    farFoot: raised(-10, 8, -80),
    bends: SWEEP,
  },
  { ...CROUCH, hip: at(4, 17.5), nearFoot: raised(18, 6, -10), farFoot: onBall(-3, -56) },
  { ...CROUCH, hip: at(-2, 19) },
  CROUCH,
];

/** One hand down on the floor on the turned frames, the other at her back. */
const ARMS: Arms = {
  1: (p) => armOut(p, 'near', -45, 19.5),
  2: (p) => armOut(p, 'near', -55, 19.5),
  3: (p) => armOut(p, 'near', -65, 19.5),
  4: (p) => armOut(p, 'near', -55, 19.5),
};

export const POSES: readonly Pose[] = withArms(FRAMES, ARMS);
