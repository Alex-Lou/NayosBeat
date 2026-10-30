import type { Point } from '../../raster.ts';
import { solve, type Bend, type Effect, type Foot } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, smear, toeOf, type Pose } from './common.ts';
import { atChin, ANIMATED as CROUCH_ANIMATED, POSES as CROUCH_STRIP } from './crouch.ts';

export const ANIMATED: boolean = true;

/**
 * crouchHeavy (Windmill): 8 frames, 2, 2, 3, 3, 4, 4, 5, 5 ticks (28), the sweep on frame 3
 * (ticks 7-9), hitbox 10..44 / 2..14, low, knocks down. Her power move turned into a sweep: out
 * of the crouch she sits back onto her rear hand, rolls onto her upper back a hand's breadth off
 * the floor, and her legs open in a V and scissor over her like the blades of a windmill seen
 * from the side: the rear leg kicks up off the floor, comes over the top and down the floor into
 * the opponent's ankles, tucked under her and back to its print; the lead leg drives off its
 * print, whips up over her as the rear one comes down (the counterweight of the sweep), and
 * comes down in front again. The chest turns through it (to the viewer, then away, then back):
 * she spins on her back. Neither leg ever passes behind her back: sat back on the floor, a leg
 * swept out low behind would swing the thigh far past what a hip opens (anatomy.ts).
 *
 * - 0: the sit-back: the hips sink, the body drops back over them (the head back above the
 *   hips), the rear hand reaches back for its print, the rear knee chambers up off the floor
 *   (its trail starts), the lead foot pushes on its ball.
 * - 1: down on the hand, the rear leg shot straight up in front of her (its trail rising), the
 *   lead foot still driving off its print, the heel up, the knee bent over it: the V between the
 *   two, both legs clear of the head.
 * - 2: the V turns over, wide open in the air; the shoulders sink toward the floor and the rear
 *   hand comes in beside the hip, where it pushes the spin.
 * - 3: the sweep: the rear leg long on the floor, the boot hooked into the ankles, the lead leg
 *   straight up; the trail comes down the whole arc into the floor, a gold flash and dust at the
 *   boot.
 * - 4: on round: the rear leg tucks, its knee folding up over the hip, the lead leg comes down in
 *   front (its own trail); the dust rises.
 * - 5: the lead foot lands, the rear knee comes down behind it, the hand pushes off the floor.
 * - 6: up on her feet, a little higher than the crouch, the rear hand swinging up open in front
 *   of the hip, the elbow down under the shoulder (pulled back off the floor behind her, the
 *   elbow jutted out at shoulder height).
 * - 7: the crouch at rest (crouch.ts), the fist under the chin, where its loop picks up.
 *
 * Anatomy first. Every knee and elbow bends the way it bends (each is placed on the side its
 * joint folds toward, from the line of the limb: knees toward the toes, elbows away from the
 * crook). The rear hand only ever pushes on the floor beside her, along her body: on the sit-back
 * it lands behind her hips (frame 1), and once she is on her back it pushes beside the hip
 * (frames 2-4, one print, it never slides), never behind her head (a shoulder does not bend
 * that far back). On the floor the head is held up off it, the chin tucked as far as a neck goes
 * (48 degrees on the torso), the eyes on the opponent: it leans back on screen with the body
 * past that (RotSprite turns it). The legs in the air are placed by their angle from the hip
 * (polar), nearly straight; the boots point along them only as far as a combat boot lets an
 * ankle point (35 degrees past square to the shin): a V of long legs reads as a power move,
 * bent ones as someone sitting on the floor.
 */

const TOE = toeOf(GUARD.nearFoot);
const LEAD_TOE = toeOf(GUARD.farFoot);
const LEG = RIFF_BODY.thigh + RIFF_BODY.shin;

/** How far her neck tucks the chin toward the chest (or tips it back), in degrees. */
const NECK = 48;
/** How far past square to the shin a boot points (degrees): a boot keeps the ankle stiff. */
const POINT = 32;

/** Her crouch as crouch.ts draws it, for as long as that strip is not animated. */
const FALLBACK: Pose = atChin({
  ...GUARD,
  hip: at(-13, 17.5),
  torso: 35,
  head: -24,
  shrug: 2.6,
  nearFoot: onBall(TOE, -70),
  farFoot: GUARD.farFoot,
  farFist: at(10, 29),
  twist: 0.4,
});

/** The crouch at rest (the first frame of its loop): where the move starts and lands. */
const REST: Pose = (CROUCH_ANIMATED ? CROUCH_STRIP[3] : undefined) ?? FALLBACK;

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

const DEG = Math.PI / 180;

/**
 * The bend that folds a knee the way knees fold, for a leg from `hip` to `ankle`: the knee on
 * the counterclockwise side of the line (seen side on, the shin turns clockwise from the thigh).
 */
function kneeBend(hip: Point, ankle: Point): Bend {
  const a = Math.atan2(ankle.y - hip.y, ankle.x - hip.x);
  const side = { x: -Math.sin(a), y: Math.cos(a) };
  if (Math.abs(side.x) >= Math.abs(side.y)) return side.x > 0 ? 'front' : 'back';
  return side.y > 0 ? 'up' : 'down';
}

/**
 * The bend that folds an elbow the way elbows fold, for an arm from `shoulder` to `wrist`: the
 * elbow on the clockwise side of the line (the forearm turns counterclockwise from the arm).
 */
function elbowBend(shoulder: Point, wrist: Point): Bend {
  const a = Math.atan2(wrist.y - shoulder.y, wrist.x - shoulder.x);
  const side = { x: Math.sin(a), y: -Math.cos(a) };
  if (Math.abs(side.x) >= Math.abs(side.y)) return side.x > 0 ? 'front' : 'back';
  return side.y > 0 ? 'up' : 'down';
}

/** A leg by its angle from the hip joint (degrees, y up) and its length fraction. */
type Polar = readonly [number, number];

/** A foot in the air: where its ankle goes, and how far past square to the shin it points. */
interface Free {
  readonly ankle: Point;
  readonly point?: number;
}

type Leg = Foot | Polar | Free;

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt: it counters the torso as far as the neck lets it. */
  readonly look: number;
  readonly near: Leg;
  readonly far: Leg;
  /** The rear hand open on (or reaching for) the floor; the fist under the chin when absent. */
  readonly palm?: readonly [number, number];
  /** The rear shoulder pushed up into the collar (the supporting arm's), 3 by default. */
  readonly shrug?: number;
  /** The lead fist. */
  readonly fist: readonly [number, number];
  readonly twist: number;
  readonly face?: Pose['face'];
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  const head = Math.max(-NECK, Math.min(NECK, k.look - k.torso));
  const body: Pose = {
    ...REST,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head,
    shrug: k.shrug ?? (k.palm ? 3 : (REST.shrug ?? 0)),
    farFist: at(k.fist[0], k.fist[1]),
    twist: k.twist,
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  const joints = solve(body, RIFF_BODY);
  // Where each ankle goes, and how far its boot points (a planted foot keeps its own angle).
  const target = (spec: Leg, joint: Point): { ankle: Point; foot?: Foot; point: number } => {
    if (Array.isArray(spec)) {
      const [degrees, fraction] = spec as Polar;
      const r = degrees * DEG;
      return {
        ankle: at(joint.x + Math.cos(r) * LEG * fraction, joint.y + Math.sin(r) * LEG * fraction),
        point: POINT,
      };
    }
    if ('ankle' in spec) return { ankle: spec.ankle, point: spec.point ?? POINT };
    const foot = spec as Foot;
    return { ankle: at(foot.x, foot.y), foot, point: 0 };
  };
  const near = target(k.near, joints.near.hip);
  const far = target(k.far, joints.far.hip);
  const legs: Pose = {
    ...body,
    nearFoot: near.foot ?? { ...near.ankle, angle: 0 },
    farFoot: far.foot ?? { ...far.ankle, angle: 0 },
    bends: {
      ...REST.bends,
      nearKnee: kneeBend(joints.near.hip, near.ankle),
      farKnee: kneeBend(joints.far.hip, far.ankle),
    },
  };
  // A foot in the air points along its shin as far as the boot lets it.
  const solved = solve(legs, RIFF_BODY);
  const aim = (side: typeof solved.near, leg: typeof near, foot: Foot): Foot => {
    if (leg.foot) return foot;
    const shin = Math.atan2(side.ankle.y - side.knee.y, side.ankle.x - side.knee.x) / DEG;
    return { ...foot, angle: shin + 90 - leg.point };
  };
  const pose: Pose = {
    ...legs,
    nearFoot: aim(solved.near, near, legs.nearFoot),
    farFoot: aim(solved.far, far, legs.farFoot),
    bends: {
      ...legs.bends,
      farElbow: elbowBend(solved.far.shoulder, body.farFist),
    },
  };
  if (!k.palm) return atChin(pose);
  const palm = at(k.palm[0], k.palm[1]);
  return {
    ...pose,
    nearFist: palm,
    nearHand: 'open',
    bends: { ...pose.bends, nearElbow: elbowBend(solved.near.shoulder, palm) },
  };
}

/** Where the rear hand lands behind her hips on the sit-back (frame 1). */
const BACK_PALM = [-16.5, 3] as const;
/** Where it pushes beside her hip as she rolls onto her back (frame 2). */
const PALM = [-7, 3] as const;
/** On the sweep the arm comes off the floor, tucked along her side, the hand over the hip. */
const TUCK = [-5, 10] as const;
/** Where it plants again to push her back up (frame 4). */
const PUSH = [-11, 3] as const;

const KEYS: readonly Key[] = [
  // 0: the sit-back: the rear knee chambers, the rear hand reaches back for its print.
  {
    hip: [-11, 12.6],
    torso: -12,
    look: 8,
    near: { ankle: at(-2.5, 11), point: 20 },
    far: onBall(LEAD_TOE, -12),
    palm: [-17.5, 10.5],
    shrug: 1,
    fist: [3, 30],
    twist: 0.45,
    effects: [smear(3, [-17, 6], [-11, 7], [-4, 10])],
  },
  // 1: down on the hand, the rear leg shot straight up, the lead foot still driving off its
  // print: the V.
  {
    hip: [-5.5, 13],
    torso: -56,
    look: 4,
    near: [95, 0.97],
    far: onBall(LEAD_TOE, -26),
    palm: BACK_PALM,
    shrug: 1.5,
    fist: [-9, 30],
    twist: 0.6,
    effects: [smear(4, [-4.5, 12], [-5.5, 24], [-6.5, 34], [-7.5, 41.5]), dust(-16.5, 2.5, 0.1)],
  },
  // 2: the V turns over, wide open in the air; the shoulders sink, the chest turns, the hand
  // pushes beside the hip.
  {
    hip: [-1, 12.6],
    torso: -70,
    look: 2,
    near: [42, 0.97],
    far: [122, 0.95],
    palm: PALM,
    shrug: 1.5,
    fist: [-12, 30],
    twist: 0.05,
    effects: [smear(5, [-6, 44], [6, 46], [16, 40], [21, 33]), dust(-16.5, 2.5, 0.35)],
  },
  // 3: the sweep: the body slides forward over the planted hand, the chest turned away.
  {
    hip: [2.5, 11.8],
    torso: -74,
    look: 0,
    near: { ankle: at(33.5, 5.8), point: 32 },
    far: [85, 0.97],
    palm: TUCK,
    shrug: 1,
    fist: [-10, 28],
    twist: -0.5,
    face: 'effort',
    effects: [
      smear(5, [14, 44], [26, 37], [31.5, 24], [34, 12], [35, 7]),
      { kind: 'flash', center: at(44.5, 6), radius: 4.5, tone: 'strike' },
      dust(38, 4, 0.15),
    ],
  },
  // 4: on round: the rear leg tucks, its knee folding up over the hip, the lead leg comes down
  // in front.
  {
    hip: [-1.5, 13.5],
    torso: -62,
    look: 2,
    near: { ankle: at(3.5, 8), point: 5 },
    far: [14, 0.96],
    palm: PUSH,
    shrug: 2,
    fist: [-10, 30],
    twist: -0.25,
    face: 'effort',
    effects: [smear(4, [6, 45], [17, 42], [25.5, 34], [30, 25.5]), dust(38, 4, 0.5)],
  },
  // 5: the lead foot lands, the rear knee comes down behind it, the hand pushes off the floor.
  {
    hip: [-11, 17.6],
    torso: -2,
    look: 6,
    near: onBall(TOE, -79),
    far: planted(GUARD.farFoot.x),
    palm: [-18, 19],
    shrug: 1,
    fist: [2, 30],
    twist: 0.3,
    effects: [dust(38, 4, 0.85)],
  },
  // 6: up on her feet, a little higher than the crouch, the rear hand swinging up in front of
  // the hip on its way to the chin, the elbow down under the shoulder.
  {
    hip: [-11, 18.8],
    torso: 24,
    look: 9,
    near: onBall(TOE, -72),
    far: planted(GUARD.farFoot.x),
    palm: [-1.5, 31],
    shrug: 2.6,
    fist: [8, 30],
    twist: 0.42,
  },
];

export const POSES: readonly Pose[] = [...KEYS.map(key), REST];
