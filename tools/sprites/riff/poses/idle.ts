import { at, GUARD, onBall, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * idle: 8 frames, looping (48 ticks, 0.8 s, strips.ts): one heavy beat per loop, not two
 * (a bounce every 0.8 s is swagger; one every 0.4 s is a jog), and an uneven one: the downbeat
 * forward is deep and slow, the back swing shallow, and she holds the taunt.
 *
 * - 1, 2: the downbeat. The hips sink 2 px and the shoulders roll over them (the torso pitches
 *   in 4 more degrees, the lead shoulder shrugs up), the lead heel drops toward the floor,
 *   pivoting on the ball (the toe never slides). Frame 2 is held a little longer: the weight.
 * - 3: the rebound, the hips back up through the guard, the shoulders settling a frame later.
 * - 4: the back swing, shallow: the hips rock back and dip less than 1 px.
 * - 5, 6: the taunt, held: the lead hand opens, palm up, then the fingers curl back ("come on"),
 *   the chin comes up 3 degrees and the lid drops (`cool`), on these two frames only.
 * - 7: back into the guard; frame 0 is exactly GUARD, so every move ending in the guard flows
 *   into the loop.
 *
 * The lead fist rides the shoulders a frame late; the hand on the hip rides with the hip; the
 * fringe and the belt's chain swing on their springs (index.ts). The head keeps the guard's
 * angle on screen (under head.ts's 20 degrees, so the face is drawn as is). The hips barely
 * travel forward on the downbeat (they sink, the shoulders do the rolling): the lead knee stays
 * inside the no-clinch line.
 */

/** The guard's lead foot: the toe tip its heel pops around, and the heel's angle. */
const GUARD_TOE = toeOf(GUARD.farFoot);
const GUARD_HEEL = GUARD.farFoot.angle ?? 0;

/** Where the hand on the hip sits, from the hip: it rides along with it. */
const ON_HIP = { x: GUARD.nearFist.x - GUARD.hip.x, y: GUARD.nearFist.y - GUARD.hip.y };

interface Beat {
  /** The hips from the guard's (world pixels): forward, up. */
  readonly hip: readonly [number, number];
  /** Extra lean of the torso toward the opponent (degrees). */
  readonly lean: number;
  readonly shrug: number;
  /** The lead heel, degrees lower (toward the floor) than in the guard. */
  readonly heel: number;
  /** The lead fist from the guard's (world pixels): forward, up. */
  readonly fist: readonly [number, number];
  /** The chin raised (degrees). */
  readonly chin?: number;
  readonly taunt?: 'open' | 'curl';
  readonly twist: number;
}

const BEATS: readonly Beat[] = [
  // 1: dropping into the downbeat.
  { hip: [-0.3, -1.1], lean: 2.5, shrug: 0.4, heel: 2, fist: [0, -0.2], twist: 0.05 },
  // 2: the downbeat, the shoulders rolled over the hips.
  { hip: [-0.5, -2.0], lean: 4.5, shrug: 0.5, heel: 4, fist: [-0.2, -0.9], twist: 0.1 },
  // 3: the rebound, the fist still coming down.
  { hip: [-0.1, -0.4], lean: 2.5, shrug: 0.5, heel: 1, fist: [-0.1, -1.4], twist: 0.05 },
  // 4: the back swing, shallow.
  { hip: [-1.0, -0.8], lean: -1.5, shrug: 0, heel: 3, fist: [-0.1, -0.6], twist: -0.12 },
  // 5: the taunt: the lead hand opens, palm up, the chin up.
  {
    hip: [-1.1, -0.5],
    lean: -2,
    shrug: 0,
    heel: 1,
    fist: [0.2, 1.2],
    chin: 3,
    taunt: 'open',
    twist: -0.15,
  },
  // 6: the fingers curl back: come on.
  {
    hip: [-0.9, -0.3],
    lean: -1.5,
    shrug: 0,
    heel: 0,
    fist: [-0.6, 1.8],
    chin: 3,
    taunt: 'curl',
    twist: -0.12,
  },
  // 7: settling back into the guard.
  { hip: [-0.3, -0.2], lean: -0.5, shrug: 0.1, heel: 0.5, fist: [-0.2, 0.6], twist: -0.04 },
];

function beat(b: Beat): Pose {
  const hip = at(GUARD.hip.x + b.hip[0], GUARD.hip.y + b.hip[1]);
  const torso = GUARD.torso + b.lean;
  return {
    ...GUARD,
    hip,
    torso,
    head: GUARD.torso + GUARD.head - torso - (b.chin ?? 0),
    shrug: b.shrug,
    farFoot: onBall(GUARD_TOE, GUARD_HEEL + b.heel),
    nearFist: at(hip.x + ON_HIP.x, hip.y + ON_HIP.y),
    farFist: at(GUARD.farFist.x + b.fist[0], GUARD.farFist.y + b.fist[1]),
    ...(b.taunt === 'open' ? { farHand: 'open' as const } : {}),
    ...(b.taunt ? { face: 'cool' as const } : {}),
    twist: (GUARD.twist ?? 0) + b.twist,
  };
}

export const POSES: readonly Pose[] = [GUARD, ...BEATS.map(beat)];
