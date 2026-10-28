import type { Point } from '../../raster.ts';
import {
  solve,
  type Bend,
  type Bends,
  type Effect,
  type Face,
  type Foot,
  type Hand,
} from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * backHeavy (Retourné): 7 frames, 2, 2, 2, 5, 5, 5, 5 ticks (26), the kick on frame 3 (ticks
 * 6-10), hitbox -12..22 / 56..100, reached upward: an anti-air launcher that also covers behind
 * her. A hopping scorpion kick: she drives off the ball of her lead foot, both feet leave the
 * floor, and her rear leg whips up behind her and curls over her back, the boot hooked over her
 * head into whoever jumps at her (or over her); she lands on the lead ball while the leg uncurls
 * behind her, and settles back into her guard. On the spot: the game moves her nowhere, the hop
 * is drawn in the cell.
 *
 * - 0: the dip: the weight tips onto the lead leg, the rear heel pops, the hips sink.
 * - 1: the launch: the rear foot whips off the floor behind her, the lead knee loads, the body
 *   pitches over, the arms swing forward against it.
 * - 2: the take-off: up on the lead toes, the leg straight, the rear leg sweeping up behind her
 *   (a trail rising from the floor), the head driving up (the fringe flicks).
 * - 3: the scorpion (5 ticks): in the air, both feet about 16 px off the floor, the body pitched
 *   42 degrees and the chin up at the jumper, the arms reaching down in front of her; the rear
 *   knee bent behind her back and the boot hooked over the back of her head, the highest thing
 *   she draws (97 px: the drawn reach of the launcher, the hitbox's top at 100), the head below
 *   and behind it (its center at x 14.6, under the hitbox's front edge). The trail curls up from
 *   behind her over into the heel, a gold spark there and streaks rising from it: the launch.
 * - 4: the landing on the lead ball (dust), the hips back down, the leg uncurled straight out
 *   behind her.
 * - 5: the rear foot touches down on its ball, the body sinks past the guard: the hips 1.6 px
 *   below it, the lean 2.5 degrees short of it, the cocked fist a touch high.
 * - 6: the guard, settled.
 *
 * Why the hop: standing, her body cannot draw higher than about 85 px (her leg is 32 px from
 * the hip), so the reach to 100 is drawn with the hips 26 px up, the feet off the floor. Her
 * standing hurtbox (0..78) stays on the floor meanwhile: that is for the spec to decide (a move
 * hurtbox on frame 3, about -15..15 / 16..96, would match the drawing).
 *
 * The rear leg is placed by its angles from the hip (forward kinematics), drawn behind the
 * torso and the head, where a leg curling over the back belongs. The lead foot pivots on its
 * ball and lands back on its toe. The head stays the source drawing (under 20 degrees on
 * screen), its look up at the jumper on the kick; effort on the kick and the landing.
 */

const TOE = toeOf(GUARD.nearFoot);
const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The rear leg by its angles: thigh and shin (degrees from forward, y up) and the foot's. */
interface Kick {
  readonly thigh: number;
  readonly shin: number;
  readonly foot: number;
}

const kick = (thigh: number, shin: number, foot: number): Kick => ({ thigh, shin, foot });

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt (torso + head), degrees. */
  readonly look: number;
  readonly shrug: number;
  readonly reach?: { readonly near?: number; readonly far?: number };
  readonly twist: number;
  readonly near: Foot | Kick;
  readonly far: Foot;
  /** The rear fist: a point, or offsets from its cocked place on the rear shoulder. */
  readonly rear: Point | { readonly cocked: readonly [number, number] };
  readonly lead: readonly [number, number];
  readonly hands?: { readonly near?: Hand; readonly far?: Hand };
  readonly bends?: Bends;
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  let pose: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: k.look - k.torso,
    shrug: k.shrug,
    reach: k.reach ?? {},
    twist: k.twist,
    nearFoot: 'thigh' in k.near ? GUARD.nearFoot : k.near,
    farFoot: k.far,
    farFist: at(k.lead[0], k.lead[1]),
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.hands?.near ? { nearHand: k.hands.near } : {}),
    ...(k.hands?.far ? { farHand: k.hands.far } : {}),
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('thigh' in k.near) pose = nearLeg(pose, k.near);
  if ('cocked' in k.rear) {
    const shoulder = solve(pose, RIFF_BODY).near.shoulder;
    const [dx, dy] = k.rear.cocked;
    return { ...pose, nearFist: at(shoulder.x + COCKED.x + dx, shoulder.y + COCKED.y + dy) };
  }
  return { ...pose, nearFist: k.rear };
}

/** The rear leg placed by its angles (forward kinematics), with the knee bend that fits. */
function nearLeg(pose: Pose, leg: Kick): Pose {
  const hip = solve(pose, RIFF_BODY).near.hip;
  const r = (d: number) => (d * Math.PI) / 180;
  const knee = at(
    hip.x + RIFF_BODY.thigh * Math.cos(r(leg.thigh)),
    hip.y + RIFF_BODY.thigh * Math.sin(r(leg.thigh)),
  );
  const foot: Foot = {
    x: knee.x + RIFF_BODY.shin * Math.cos(r(leg.shin)),
    y: knee.y + RIFF_BODY.shin * Math.sin(r(leg.shin)),
    angle: leg.foot,
  };
  let best: Pose = pose;
  let error = Infinity;
  for (const bend of BENDS) {
    const trial: Pose = { ...pose, nearFoot: foot, bends: { ...pose.bends, nearKnee: bend } };
    const e = solve(trial, RIFF_BODY).near.knee;
    const d = Math.hypot(e.x - knee.x, e.y - knee.y);
    if (d < error) {
      error = d;
      best = trial;
    }
  }
  return best;
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

const KEYS: readonly Key[] = [
  // 0: the dip: the weight tips onto the lead leg, the rear heel pops, the hips sink.
  {
    hip: [-5.7, 30.6],
    torso: 22,
    look: 10,
    shrug: 2.6,
    twist: 0.4,
    near: onBall(TOE, -26),
    far: planted(GUARD.farFoot.x),
    rear: at(-10.5, 56.5),
    lead: [8.5, 44],
  },
  // 1: the launch: the rear foot whips off the floor behind her, the lead knee loads.
  {
    hip: [-4, 31.5],
    torso: 30,
    look: 8,
    shrug: 2,
    twist: 0.3,
    near: kick(212, 252, 170),
    far: planted(GUARD.farFoot.x),
    rear: at(6, 42),
    lead: [12, 40],
    effects: [dust(-20, 2.5, 0.15)],
  },
  // 2: the take-off: up on the lead toes, the rear leg sweeping up behind her.
  {
    hip: [-1.5, 41],
    torso: 34,
    look: 2,
    shrug: 1.6,
    twist: 0.3,
    near: kick(140, 122, 120),
    far: onBall(GUARD.farFoot.x + 6.8, -55),
    rear: at(12, 46),
    lead: [15, 42],
    hands: { near: 'open' },
    effects: [smear(4, [-27, 14], [-32, 30], [-31, 46], [-26, 62]), dust(12, 2.5, 0.15)],
  },
  // 3: the scorpion: in the air, the heel hooked over her head.
  {
    hip: [-6, 58],
    torso: 42,
    look: -14,
    shrug: 1.4,
    twist: 0.3,
    near: kick(90, 46, 120),
    far: { x: 7, y: 25, angle: -60 },
    rear: at(16, 57),
    lead: [19, 50],
    hands: { near: 'open', far: 'open' },
    face: 'effort',
    effects: [
      smear(5, [-28, 50], [-27, 66], [-20, 81], [-10, 91], [1, 93]),
      { kind: 'flash', center: at(6, 96), radius: 3.5, tone: 'strike' },
      { kind: 'speed', center: at(5, 99), length: 8, spread: 5, direction: -90, tone: 'strike' },
      dust(12, 3, 0.5),
    ],
  },
  // 4: the landing on the lead ball, the leg uncurling behind her.
  {
    hip: [-4, 34.5],
    torso: 30,
    look: 4,
    shrug: 1.8,
    twist: 0.35,
    near: kick(172, 186, 30),
    far: onBall(GUARD.farFoot.x + 6.8, -26),
    rear: at(6, 44),
    lead: [12, 41],
    hands: { near: 'open' },
    face: 'effort',
    effects: [dust(12, 3.5, 0.2)],
  },
  // 5: the rear foot touches down, the body sinks past the guard.
  {
    hip: [-7, 30.4],
    torso: 16.5,
    look: 8,
    shrug: 2.4,
    twist: 0.5,
    near: onBall(TOE - 1, -18),
    far: planted(GUARD.farFoot.x),
    rear: { cocked: [0.3, 1.6] },
    lead: [8.6, 45.4],
    effects: [dust(12, 3.5, 0.6)],
  },
  // 6: the guard.
  {
    hip: [-6.8, 32],
    torso: 19,
    look: 9,
    shrug: 2.2,
    twist: 0.45,
    near: onBall(TOE, -12),
    far: planted(GUARD.farFoot.x),
    rear: { cocked: [0, 0] },
    lead: [9.5, 46],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
