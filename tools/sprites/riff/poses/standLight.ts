import { solve, type Effect } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * standLight (Jab): 5 frames, 1, 2, 2, 3, 3 ticks (11), the jab on frame 2 (ticks 3-4), hitbox
 * 9..33 / 42..54. Not a boxer's jab out of a shell: a street flicker out of her low, loose lead
 * hand. The hand is already out in front of her belly; it whips up and out on a rising line, the
 * knuckles snapping in at chest height, the lead shoulder rolled in over the chin (« l'épaule
 * rentrée »), and comes back on a lower loop to where it hangs. The rear arm stays home, the
 * way a boxer's does: the elbow down on the ribs, the fist glued under the chin, tucking in a
 * hair as the jab goes out (never up over the mouth): the jab is the bait, the rear hand the
 * threat.
 *
 * - 0 (1 tick): the tell: the lead wrist drops and draws back a hair (the flick loads), the rear
 *   heel pops, the hips start in.
 * - 1: the snap: the hips push in over the lead knee ahead of the shoulders, the fist half way
 *   out and rising, the elbow under it; a short trail.
 * - 2: the jab: the arm long (the elbow all but straight, the forearm level), the lead shoulder
 *   rolled in and the chin tucked behind it, the chest turned to profile, the rear heel high,
 *   the rear fist tucked under the chin; the trail and a tick of a flash on the knuckles.
 * - 3: the fist snaps back low, the body still in a beat behind it (the hips leave last).
 * - 4: settled back in the guard, the lead hand a touch low and in (it overshoots its place):
 *   the idle's first frame, the guard, is a hair away.
 *
 * The feet never slide: the lead foot stays flat, the rear one pumps its heel on a fixed ball.
 * The head stays the source drawing (under 20 degrees on screen) and rides the lean.
 */

const TOE = toeOf(GUARD.nearFoot);

/** Where the rear fist sits from the rear shoulder in the guard: under the chin. */
const TUCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The guard's on-screen head tilt. */
const LOOK = GUARD.torso + GUARD.head;

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** Chin down over the guard's, on screen (degrees). */
  readonly chin: number;
  readonly shrug: number;
  /** The lead shoulder reaching in. */
  readonly reach: number;
  readonly heel: number;
  /** The lead fist. */
  readonly fist: readonly [number, number];
  /** The rear fist from its place under the chin (carried by the rear shoulder). */
  readonly rear: readonly [number, number];
  readonly twist: number;
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  const pose: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: LOOK + k.chin - k.torso,
    shrug: k.shrug,
    reach: { far: k.reach },
    nearFoot: onBall(TOE, k.heel),
    farFist: at(k.fist[0], k.fist[1]),
    twist: k.twist,
    ...(k.effects ? { effects: k.effects } : {}),
  };
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  return {
    ...pose,
    nearFist: at(shoulder.x + TUCKED.x + k.rear[0], shoulder.y + TUCKED.y + k.rear[1]),
  };
}

const KEYS: readonly Key[] = [
  // 0: the tell.
  {
    hip: [-6.2, 31.6],
    torso: 20.5,
    chin: 1,
    shrug: 2.2,
    reach: -0.5,
    heel: -16,
    fist: [8.8, 43.4],
    rear: [-0.3, -0.2],
    twist: 0.4,
  },
  // 1: the snap.
  {
    hip: [-4.8, 31.3],
    torso: 25,
    chin: 4,
    shrug: 2,
    reach: 1.6,
    heel: -21,
    fist: [22, 47.9],
    rear: [-0.2, -0.6],
    twist: 0.22,
    effects: [smear(3, [8, 44.5], [14, 46.6], [20.5, 47.8])],
  },
  // 2: the jab.
  {
    hip: [-3.9, 31],
    torso: 25.5,
    chin: 6,
    shrug: 1.8,
    reach: 1.5,
    heel: -24,
    fist: [31.6, 47.5],
    rear: [-0.4, -1.2],
    twist: 0.02,
    effects: [
      smear(4, [12, 46], [19, 47.4], [25, 47.8], [29.5, 47.6]),
      { kind: 'flash', center: at(36.5, 47.5), radius: 3, tone: 'strike' },
    ],
  },
  // 3: the fist snaps back low.
  {
    hip: [-4.6, 31.2],
    torso: 25,
    chin: 4,
    shrug: 2,
    reach: 1.2,
    heel: -20,
    fist: [15, 45.4],
    rear: [-0.3, -0.6],
    twist: 0.28,
  },
  // 4: settled, the lead hand a touch low.
  {
    hip: [-7, 31.8],
    torso: 18.6,
    chin: 0,
    shrug: 2.3,
    reach: 0,
    heel: -13,
    fist: [8.9, 45.2],
    rear: [0.1, 0.2],
    twist: 0.47,
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
