import { solve, type Face } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, onHeel, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * idle: 8 frames, looping (48 ticks, 0.8 s, strips.ts): a toprock rock and a drop into the
 * lead. The hips rock back and up against the shoulders, the chest pushed out at the opponent,
 * then she drops in over the lead leg: one beat per loop, and an uneven one, the rise slow and
 * eased, the top held, the drop a snap into a held downbeat. The head travels about 4 px over
 * the loop, the hips 2.2 across and 4 up and down: a rhythm that reads at 1x on a phone (Nayo's
 * breathing moves half a pixel) without making her head jitter.
 *
 * - 1: the anticipation: the hips start back over the rear foot, its heel pumping up on the
 *   ball; the fists stay where they were (they follow a frame behind).
 * - 2: the rise: the hips rock back and up, the shoulders hang back a little less (the hips
 *   lead), the rear heel at the top of its pump, the chest opening.
 * - 3: the top, the offer: the hips all the way back, the chest out, the hip twisted at the
 *   opponent ahead of it, the lead toes up on the heel; the lead fist drawn in a little, loose,
 *   the smirk.
 * - 4: held: the fist drawn in a touch further: come on. The beckon itself (an open hand
 *   curling) belongs to the taunts, the intro and the victory: in an idle it repeats 75 times a
 *   minute and reads as a grab at 1x.
 * - 5: the snap (3 ticks): the hips lead the way down while the shoulders still hang back and
 *   the fists stay up (a frame of lag).
 * - 6: the downbeat, held: the hips drop below the guard and a touch forward, the shoulders
 *   pitch in over the lead leg, the rear shoulder rolling over and shrugged into the collar; the
 *   look from under the brows (`cool`, the lid half down). The loaded rear fist trails behind,
 *   down and back, and lands on the settle.
 * - 7: settling, the focus back; the rear fist overshoots its place on the way up. Frame 0 is
 *   exactly GUARD, so every move ending in the guard flows into the loop.
 *
 * The head stays the source drawing in every frame (its on-screen tilt never leaves stamp.ts's
 * UPRIGHT_TOLERANCE): it moves with the torso's lean (a degree is about 0.6 px of head travel)
 * and acts through the face patches only.
 *
 * Overlap: the cocked rear fist rides the rear shoulder `lag` of a frame late, with its own
 * offsets (it rises on the rock, lands late on the downbeat, overshoots on the settle); the
 * fringe and the belt's chain swing on their springs (index.ts). The feet never slide: the rear
 * foot only pumps its heel 6 degrees on a fixed ball (more and the turned-out boot reads as a
 * rolled ankle), the lead foot only rocks its toes up on a fixed heel at the top (TAP). The lead
 * knee stays inside the no-clinch line.
 */

/** The guard's rear foot: the ball it pumps on. */
const GUARD_TOE = toeOf(GUARD.nearFoot);
const GUARD_HEEL = GUARD.nearFoot.angle ?? 0;
const GUARD_SHRUG = GUARD.shrug ?? 0;
/** The lead toes lifted at the top of the rock (degrees). */
const TAP = 8;
/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return { x: GUARD.nearFist.x - shoulder.x, y: GUARD.nearFist.y - shoulder.y };
})();

interface Beat {
  /** The hips from the guard's (world pixels): forward, up. */
  readonly hip: readonly [number, number];
  /** The torso's lean from the guard's (degrees, positive: into the opponent). */
  readonly lean: number;
  /** The rear heel's angle (degrees, negative: up), pumping on the ball. */
  readonly heel: number;
  /** The lead toes up on the heel. */
  readonly tap?: boolean;
  /**
   * The rear fist from its place on the rear shoulder, `lag` of the way back to where that
   * shoulder was on the frame before (1: a whole frame late).
   */
  readonly near: readonly [number, number];
  readonly lag: number;
  /** The lead wrist from the guard's (world pixels). */
  readonly far: readonly [number, number];
  readonly twist: number;
  /** The rear shoulder up into the collar, from the guard's. */
  readonly shrug: number;
  /** The rear shoulder rolled forward over the chest. */
  readonly roll?: number;
  readonly face?: Face;
}

const BEATS: readonly Beat[] = [
  // 1: the hips start back, the rear heel pumps; the fists wait.
  {
    hip: [-0.8, 0.6],
    lean: -1,
    heel: GUARD_HEEL - 3,
    near: [0, 0],
    lag: 1,
    far: [-0.2, 0.3],
    twist: 0.5,
    shrug: -0.3,
  },
  // 2: the rise: the hips rock back and up, the heel at the top of its pump.
  {
    hip: [-1.8, 1.4],
    lean: -2.5,
    heel: GUARD_HEEL - 6,
    near: [0.6, 0.8],
    lag: 1,
    far: [-0.6, 0.6],
    twist: 0.58,
    shrug: -0.8,
  },
  // 3: the top, the offer: the chest out, the hip ahead of it, the lead fist drawn in, the smirk.
  {
    hip: [-2.2, 1.8],
    lean: -3.5,
    heel: GUARD_HEEL - 6,
    tap: true,
    near: [1, 1.4],
    lag: 1,
    far: [-0.8, 0.6],
    twist: 0.76,
    shrug: -1,
    face: 'smirk',
  },
  // 4: held: the fist drawn in a touch further: come on.
  {
    hip: [-2.2, 1.8],
    lean: -3.5,
    heel: GUARD_HEEL - 6,
    tap: true,
    near: [1, 1.4],
    lag: 1,
    far: [-1.2, 0.8],
    twist: 0.78,
    shrug: -1,
    face: 'smirk',
  },
  // 5: the snap, 3 ticks: the hips lead the way down, the fists stay up.
  {
    hip: [-1, 0.4],
    lean: -1.8,
    heel: GUARD_HEEL - 3,
    near: [0.5, 0.6],
    lag: 1,
    far: [0, 1],
    twist: 0.55,
    shrug: -0.4,
  },
  // 6: the downbeat, held: she drops into her lead, the rear fist trails half a frame, low; the
  // look from under the brows. (A whole frame late, the forearm would lean back behind her
  // through the 9 held ticks: the « fan at a gig » the guard got rid of.)
  {
    hip: [-1.3, -2.2],
    lean: 3,
    heel: GUARD_HEEL,
    near: [-1, -2],
    lag: 0.5,
    far: [0.2, -2],
    twist: 0.36,
    shrug: 0.8,
    roll: 1.2,
    face: 'cool',
  },
  // 7: settling into the guard, the focus back; the rear fist overshoots on the way up.
  {
    hip: [-0.4, -0.7],
    lean: 1.5,
    heel: GUARD_HEEL,
    near: [0.6, 0.8],
    lag: 0.3,
    far: [0.1, -0.7],
    twist: 0.42,
    shrug: 0.25,
    roll: 0.35,
  },
];

function body(b: Beat): Pose {
  return {
    ...GUARD,
    hip: at(GUARD.hip.x + b.hip[0], GUARD.hip.y + b.hip[1]),
    torso: GUARD.torso + b.lean,
    shrug: GUARD_SHRUG + b.shrug,
    ...(b.roll ? { reach: { near: b.roll } } : {}),
    nearFoot: onBall(GUARD_TOE, b.heel),
    farFoot: b.tap ? onHeel(GUARD.farFoot, TAP) : GUARD.farFoot,
    farFist: at(GUARD.farFist.x + b.far[0], GUARD.farFist.y + b.far[1]),
    twist: b.twist,
    ...(b.face ? { face: b.face } : {}),
  };
}

const BODIES: readonly Pose[] = [GUARD, ...BEATS.map(body)];

/** The rear shoulder of every frame. */
const SHOULDERS = BODIES.map((pose) => solve(pose, RIFF_BODY).near.shoulder);

export const POSES: readonly Pose[] = BODIES.map((pose, i) => {
  const b = BEATS[i - 1];
  const now = SHOULDERS[i];
  const before = SHOULDERS[i - 1];
  if (!b || !now || !before) return pose;
  // The loaded rear fist follows its shoulder `lag` of a frame late.
  const x = now.x + (before.x - now.x) * b.lag + COCKED.x + b.near[0];
  const y = now.y + (before.y - now.y) * b.lag + COCKED.y + b.near[1];
  return { ...pose, nearFist: at(x, y) };
});
