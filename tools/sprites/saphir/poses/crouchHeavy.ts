import { armOut, at, onBall, raised, smear, withArms, type Arms, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';

/**
 * crouchHeavy (Fauche, docs/saphir.md §4): 8 frames, 2, 3, 4, 3, 5, 5, 5, 5 ticks (32), the
 * sweep lands on frame 3 (ticks 9-11), hitbox 12..52 / 2..14, a low that trips. Squatting on
 * the rear leg, she sweeps the lead leg in a wide arc along the floor at the ankles, the torso
 * folded over the support knee, the hands still at her back: no hand on the floor.
 *
 * - 0-1: she sinks onto the rear leg, the lead foot leaving the floor.
 * - 2: the leg swinging out, low.
 * - 3: the sweep at the far edge of the hitbox, the leg straight along the floor; the trail an
 *   arc on the floor.
 * - 4-5: the leg comes back in.
 * - 6-7: back into the crouch.
 */
const FRAMES: readonly Pose[] = [
  { ...CROUCH, hip: at(0, 18), torso: 30, farFoot: onBall(-6, -56) },
  {
    ...CROUCH,
    hip: at(6, 17.5),
    torso: 34,
    nearFoot: raised(18, 6, -10),
    farFoot: onBall(0, -56),
    face: 'effort',
  },
  {
    ...CROUCH,
    hip: at(10, 17),
    torso: 34,
    nearFoot: raised(32, 6, 20),
    farFoot: onBall(3, -56),
    face: 'effort',
    effects: [smear(2.5, [16, 8], [24, 7], [32, 8])],
  },
  {
    ...CROUCH,
    hip: at(14, 17),
    torso: 32,
    nearFoot: raised(46, 8.5, 60),
    farFoot: onBall(5, -62),
    face: 'kiai',
    effects: [smear(3, [20, 8], [34, 7], [46, 9])],
  },
  {
    ...CROUCH,
    hip: at(10, 17.5),
    torso: 30,
    nearFoot: raised(30, 6, 0),
    farFoot: onBall(3, -56),
  },
  { ...CROUCH, hip: at(4, 17.5), nearFoot: raised(18, 6, -10), farFoot: onBall(-3, -56) },
  { ...CROUCH, hip: at(-2, 19) },
  CROUCH,
];

/** Her hands at her back, one let out to balance the leg on the frames of `ARMS`. */
const ARMS: Arms = {
  1: (p) => armOut(p, 'near', -160, 19.5),
  2: (p) => armOut(p, 'near', -170, 19.5),
  3: (p) => armOut(p, 'near', -160, 19.5),
  4: (p) => armOut(p, 'near', -160, 19.5),
};

export const POSES: readonly Pose[] = withArms(FRAMES, ARMS);
