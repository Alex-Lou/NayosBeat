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
 * - 0: the dip: the weight tips onto the lead leg, the rear heel pops, the hips sink; the rear
 *   fist stays under the chin, sinking with the chest, the elbow down on the ribs.
 * - 1: the launch: the rear foot whips off the floor behind her, pointed down off the swing, the
 *   lead knee loads, the body pitches over, the arms swing forward and down against it (the rear
 *   one drops off the chin, its elbow opening under the shoulder; the lead fist, still folded,
 *   rides forward with the chest, its elbow down in front of the ribs).
 * - 2: the take-off: up on the lead ball, the hips come over it, the knee all but straight (the
 *   heel 35 degrees up: the shin stays over the foot), the rear leg sweeping up behind her (a
 *   trail rising from the floor), the head driving up (the fringe flicks); the lead arm swings
 *   down under the shoulder, the elbow opening, on its way to the reach of the kick.
 * - 3: the scorpion (5 ticks): in the air, the lead boot about 21 px off the floor, the chest
 *   pitched 62 degrees over the jumper, the face up on him, the arms reaching down in front of
 *   her; the rear thigh swept up behind her (88 degrees between it and the line of her back:
 *   the hip and the arched small of the back together, a b-girl's flexibility, no more) and the
 *   knee folded so that the heel curls up over her back, the highest thing she draws (about 95
 *   px: the drawn reach of the launcher, the hitbox's top at 100), the head ahead of it (its
 *   center at x 16, under the hitbox's front edge). The trail curls up from behind her into the
 *   heel, a gold spark there and streaks rising from it: the launch.
 * - 4: the landing on the lead ball (dust), the hips back down, the leg uncurled long behind her,
 *   a little under level, its toes pointed down at the floor; the lead fist folds back up toward
 *   its guard, the elbow down in front of the ribs.
 * - 5: the rear foot touches down on its ball, the body sinks past the guard: the hips 1.6 px
 *   below it, the lean 2.5 degrees short of it, the rear fist a touch high under the chin.
 * - 6: the guard, settled.
 *
 * Why the hop: standing, her body cannot draw higher than about 85 px (her leg is 32 px from
 * the hip), so the reach to 100 is drawn with the hips 30 px up, the feet off the floor. Her
 * standing hurtbox (0..78) stays on the floor meanwhile: that is for the spec to decide (a move
 * hurtbox on frame 3, about -15..15 / 16..96, would match the drawing).
 *
 * Anatomy (tools/sprites/anatomy.ts): every boot stays within 35 degrees of square to its shin
 * (a combat boot does not point like a dancer's foot, nor fold back on the shin); the head
 * tips 50 degrees on the neck at most, so the chest carries the pitch. The lead arm (behind the
 * body) keeps its elbow down in front of the chest, never pulled back and folded: its elbow
 * stuck out of her back at a right angle on the launch, the take-off and the landing, and read
 * as a broken arm (the owner's call). It goes guard, folded lower, swung down, reaching down,
 * then back up to the guard: the elbow opens and closes, it never swings behind her.
 *
 * The rear leg is placed by its angles from the hip (forward kinematics), drawn behind the
 * torso and the head, where a leg curling over the back belongs. The lead foot pivots on its
 * ball and lands back on its toe. The head stays the source drawing (under 20 degrees on
 * screen), its look up at the jumper on the kick; effort on the kick and the landing.
 */

const TOE = toeOf(GUARD.nearFoot);
const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/** Where the rear fist sits from the rear shoulder in the guard: under the chin. */
const CHIN = (() => {
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
  /** The lead leg: a foot, or (in the air) its angles from the hip. */
  readonly far: Foot | Kick;
  /** The rear fist: a point, or offsets from its guard place under the chin (from the shoulder). */
  readonly rear: Point | { readonly chin: readonly [number, number] };
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
    farFoot: 'thigh' in k.far ? GUARD.farFoot : k.far,
    farFist: at(k.lead[0], k.lead[1]),
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.hands?.near ? { nearHand: k.hands.near } : {}),
    ...(k.hands?.far ? { farHand: k.hands.far } : {}),
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('thigh' in k.near) pose = legAt(pose, 'near', k.near);
  if ('thigh' in k.far) pose = legAt(pose, 'far', k.far);
  if ('chin' in k.rear) {
    const shoulder = solve(pose, RIFF_BODY).near.shoulder;
    const [dx, dy] = k.rear.chin;
    return { ...pose, nearFist: at(shoulder.x + CHIN.x + dx, shoulder.y + CHIN.y + dy) };
  }
  return { ...pose, nearFist: k.rear };
}

/** One leg placed by its angles (forward kinematics), with the knee bend that fits. */
function legAt(pose: Pose, side: 'near' | 'far', leg: Kick): Pose {
  const hip = solve(pose, RIFF_BODY)[side].hip;
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
    const trial: Pose =
      side === 'near'
        ? { ...pose, nearFoot: foot, bends: { ...pose.bends, nearKnee: bend } }
        : { ...pose, farFoot: foot, bends: { ...pose.bends, farKnee: bend } };
    const e = solve(trial, RIFF_BODY)[side].knee;
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
    rear: { chin: [-0.6, -0.5] },
    lead: [10, 43],
  },
  // 1: the launch: the rear foot whips off the floor behind her, the lead knee loads.
  {
    hip: [-4, 31.5],
    torso: 30,
    look: 8,
    shrug: 2,
    twist: 0.3,
    near: kick(235, 190, 255),
    far: planted(GUARD.farFoot.x),
    rear: at(8.5, 38.5),
    lead: [17, 39.5],
    effects: [dust(-20, 2.5, 0.15)],
  },
  // 2: the take-off: up on the lead toes, the rear leg sweeping up behind her.
  {
    hip: [1, 40],
    torso: 34,
    look: 2,
    shrug: 1.6,
    twist: 0.3,
    near: kick(170, 150, 215),
    far: onBall(GUARD.farFoot.x + 6.8, -35),
    rear: at(12, 46),
    lead: [23, 37.5],
    hands: { near: 'open' },
    effects: [smear(4, [-27, 14], [-32, 27], [-33, 40], [-30, 52]), dust(12, 2.5, 0.15)],
  },
  // 3: the scorpion: in the air, the heel hooked over her head.
  {
    hip: [-12.5, 62],
    torso: 62,
    look: 12,
    shrug: 1.4,
    twist: 0.3,
    near: kick(120, 50, 132),
    far: kick(-75, -80, -15),
    rear: at(7.4, 56),
    lead: [10.6, 47.5],
    hands: { near: 'open', far: 'open' },
    face: 'effort',
    effects: [
      smear(5, [-32, 50], [-32, 66], [-27, 80], [-19, 89], [-10, 93]),
      { kind: 'flash', center: at(-7, 96), radius: 3.5, tone: 'strike' },
      { kind: 'speed', center: at(-7, 99), length: 8, spread: 5, direction: -90, tone: 'strike' },
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
    near: kick(190, 180, 245),
    far: onBall(GUARD.farFoot.x + 6.8, -26),
    rear: at(6, 44),
    lead: [17.5, 42.5],
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
    rear: { chin: [0.3, 1.6] },
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
    near: GUARD.nearFoot,
    far: planted(GUARD.farFoot.x),
    rear: { chin: [0, 0] },
    lead: [9.5, 46],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
