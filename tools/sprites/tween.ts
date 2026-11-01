/**
 * One in-between of two key poses, in joint space (docs/art/animation-plan.md §3.1, F2): the
 * drawings the game plays between its keys, drawn ahead of time (D23: nothing is interpolated
 * on screen). Taken from the prototype of the plan (anim-design/fluidite/tween.ts).
 *
 * - The body's scalars (hips, torso, head, spin, shrug, twist, reach): linear; the spin by the
 *   shortest way round.
 * - Arms: the shoulder's angle as anatomy.ts measures it (from the torso's "down", positive
 *   forward) and the elbow's signed flexion, mixed linearly without wrapping at ±180: anatomy.ts
 *   limits are intervals on those angles, so the in-between of two valid keys stays valid. Then
 *   forward kinematics from the in-between's shoulder: the fist is the wrist reached, the bend
 *   the one that gives that very elbow back. `straightArms`: the fist goes in a straight line
 *   from one key to the other instead (the ladder's fallback), the elbow still by continuity.
 * - Legs: a foot on the floor in both keys pivots around its point of support (toe or heel,
 *   whichever moves least between the keys): it does not slide. Otherwise in joint space like
 *   the arms (hip, knee, ankle against the shin), then kept above the floor.
 * - Knees and elbows: of the two solutions of the inverse kinematics, the one closest to the
 *   joints mixed between the keys, so that nothing flips over.
 * - What is discrete (hands, face, bends of the keys): the nearest key's. Effects: tweenEffects.
 */

import {
  type Body,
  type Bend,
  type Effect,
  type Foot,
  type Pose,
  type Side,
  solve,
} from './skeleton.ts';

interface Point {
  readonly x: number;
  readonly y: number;
}

const degrees = (r: number): number => (r * 180) / Math.PI;
const radians = (d: number): number => (d * Math.PI) / 180;
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;
const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x;
const length = (a: Point): number => Math.hypot(a.x, a.y);
const mix = (p: number, q: number, t: number): number => p + (q - p) * t;
const mixPoint = (p: Point, q: Point, t: number): Point => ({
  x: mix(p.x, q.x, t),
  y: mix(p.y, q.y, t),
});
/** The signed angle from `a` to `b`, in degrees. */
const signed = (a: Point, b: Point): number => degrees(Math.atan2(cross(a, b), dot(a, b)));
const rotate = (v: Point, by: number): Point => {
  const a = radians(by);
  return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
};
/** `b` brought within 180 degrees of `a`. */
const near = (a: number, b: number): number => b + 360 * Math.round((a - b) / 360);

/** The torso's frame: up along the spine, front across it. */
interface Basis {
  readonly up: Point;
  readonly front: Point;
}
function basisOf(torso: number): Basis {
  const lean = radians(torso);
  const up = { x: Math.sin(lean), y: Math.cos(lean) };
  return { up, front: { x: up.y, y: -up.x } };
}
/** A segment's angle from the torso's "down", positive forward (anatomy.ts measures so). */
const fromDown = (v: Point, b: Basis): number =>
  degrees(Math.atan2(dot(v, b.front), -dot(v, b.up)));
const directionFromDown = (angle: number, b: Basis): Point =>
  add(scale(b.up, -Math.cos(radians(angle))), scale(b.front, Math.sin(radians(angle))));

/** The two places an elbow (or a knee) may take, as skeleton.ts's twoBone finds them. */
function joints(root: Point, target: Point, first: number, second: number): [Point, Point] {
  const offset = sub(target, root);
  const distance = length(offset);
  const reach = Math.min(
    first + second - 0.01,
    Math.max(Math.abs(first - second) + 0.01, distance),
  );
  const direction = distance > 0 ? scale(offset, 1 / distance) : { x: 0, y: -1 };
  const cos = (first * first + reach * reach - second * second) / (2 * first * reach);
  const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
  const base = Math.atan2(direction.y, direction.x);
  const at = (sign: number): Point =>
    add(root, {
      x: Math.cos(base + sign * angle) * first,
      y: Math.sin(base + sign * angle) * first,
    });
  return [at(1), at(-1)];
}

/** The bend that picks, of the two places, the one nearest `wanted`. */
function bendToward(
  root: Point,
  target: Point,
  first: number,
  second: number,
  wanted: Point,
): Bend {
  const [p, q] = joints(root, target, first, second);
  const [pick, other] = length(sub(p, wanted)) <= length(sub(q, wanted)) ? [p, q] : [q, p];
  if (pick.y < other.y - 1e-9) return 'down';
  if (pick.y > other.y + 1e-9) return 'up';
  return pick.x >= other.x ? 'front' : 'back';
}

/** The lowest point of a shoe (its outline's bottom), above the floor. */
const lowestOf = (side: Side, body: Body): number =>
  Math.min(side.heel.y, side.toe.y) - body.footRadius;
const grounded = (side: Side, body: Body): boolean => lowestOf(side, body) <= 0.35;

/** An ankle placed from its point of support (toe or heel) and the foot's angle. */
function ankleFrom(pivot: Point, which: 'toe' | 'heel', angle: number, body: Body): Point {
  const along = { x: Math.cos(radians(angle)), y: Math.sin(radians(angle)) };
  const sole =
    which === 'toe' ? sub(pivot, scale(along, body.foot)) : add(pivot, scale(along, body.heel));
  const down = { x: along.y, y: -along.x };
  return sub(sole, scale(down, body.ankle - body.footRadius));
}

/** How low an ankle may go for a foot at `angle` (skeleton.ts's `planted`). */
function floorOf(angle: number, body: Body): number {
  const a = radians(angle);
  const sole = body.ankle - body.footRadius;
  const dip = sole * Math.cos(a) + Math.max(-body.foot * Math.sin(a), body.heel * Math.sin(a), 0);
  return dip + body.footRadius;
}

export interface TweenOptions {
  /** Rounds the hips to this step (world pixels): 0.5, one sprite pixel, against shimmering. */
  readonly snap?: number;
  /** The fists in a straight line from one key to the other (see the header). */
  readonly straightArms?: boolean;
  /** Lowers the whole pose by this many world pixels (to keep it on the floor). */
  readonly lower?: number;
}

/** The pose `t` (already eased) of the way from `a` to `b`, in joint space. */
export function inbetween(
  a: Pose,
  b: Pose,
  t: number,
  body: Body,
  options: TweenOptions = {},
): Pose {
  // The joints without the spin: fists and feet are placed there.
  const flatA = solve({ ...a, spin: 0 }, body);
  const flatB = solve({ ...b, spin: 0 }, body);
  const spunA = a.spin ? solve(a, body) : flatA;
  const spunB = b.spin ? solve(b, body) : flatB;
  const torso = mix(a.torso, b.torso, t);
  let hip = mixPoint(a.hip, b.hip, t);
  if (options.snap) {
    const step = options.snap;
    hip = { x: Math.round(hip.x / step) * step, y: Math.round(hip.y / step) * step };
  }
  // The spin is a turn: by the shortest way (300 then -20 is +40, not -320), written as the
  // nearest key writes it (the head is drawn from that angle).
  const spinA = a.spin ?? 0;
  const spinB = b.spin ?? 0;
  const turn = near(0, spinB - spinA);
  const spin = t < 0.5 ? spinA + turn * t : spinB - turn * (1 - t);
  const scalars: Pose = {
    ...(t < 0.5 ? a : b),
    hip,
    torso,
    head: mix(a.head, b.head, t),
    spin,
    shrug: mix(a.shrug ?? 0, b.shrug ?? 0, t),
    twist: mix(a.twist ?? 0, b.twist ?? 0, t),
    reach: {
      near: mix(a.reach?.near ?? 0, b.reach?.near ?? 0, t),
      far: mix(a.reach?.far ?? 0, b.reach?.far ?? 0, t),
    },
  };
  // The in-between's shoulders and hips: they do not depend on the fists nor the feet.
  const frame = solve({ ...scalars, spin: 0 }, body);
  const basisA = basisOf(a.torso);
  const basisB = basisOf(b.torso);
  const basis = basisOf(torso);

  const arm = (side: 'near' | 'far'): { fist: Point; bend: Bend } => {
    const keyA = flatA[side];
    const keyB = flatB[side];
    const upperA = sub(keyA.elbow, keyA.shoulder);
    const upperB = sub(keyB.elbow, keyB.shoulder);
    const shoulder = mix(fromDown(upperA, basisA), fromDown(upperB, basisB), t);
    const flexA = signed(upperA, sub(keyA.wrist, keyA.elbow));
    const flexB = signed(upperB, sub(keyB.wrist, keyB.elbow));
    const upper = directionFromDown(shoulder, basis);
    const root = frame[side].shoulder;
    const elbow = add(root, scale(upper, body.upperArm));
    const wrist = options.straightArms
      ? mixPoint(keyA.wrist, keyB.wrist, t)
      : add(elbow, scale(rotate(upper, mix(flexA, flexB, t)), body.forearm));
    return { fist: wrist, bend: bendToward(root, wrist, body.upperArm, body.forearm, elbow) };
  };

  const leg = (side: 'near' | 'far'): { foot: Foot; bend: Bend } => {
    const keyA = flatA[side];
    const keyB = flatB[side];
    const footA = side === 'near' ? a.nearFoot : a.farFoot;
    const footB = side === 'near' ? b.nearFoot : b.farFoot;
    const root = frame[side].hip;
    // The keys' knee, carried by the torso's frame: where it "should" be.
    const kneeA = fromDown(sub(keyA.knee, keyA.hip), basisA);
    const kneeB = fromDown(sub(keyB.knee, keyB.hip), basisB);
    const wantedKnee = add(root, scale(directionFromDown(mix(kneeA, kneeB, t), basis), body.thigh));
    const onFloor =
      !a.spin && !b.spin && grounded(spunA[side], body) && grounded(spunB[side], body);
    let foot: Foot;
    if (onFloor) {
      const angleA = footA.angle ?? 0;
      const angleB = footB.angle ?? 0;
      const which =
        length(sub(keyA.toe, keyB.toe)) <= length(sub(keyA.heel, keyB.heel)) ? 'toe' : 'heel';
      const pivotA = which === 'toe' ? keyA.toe : keyA.heel;
      const pivotB = which === 'toe' ? keyB.toe : keyB.heel;
      const angle = mix(angleA, angleB, t);
      let ankle = ankleFrom(mixPoint(pivotA, pivotB, t), which, angle, body);
      // A step: the point of support moves, the foot goes through the air.
      const stride = length(sub(pivotA, pivotB));
      if (stride > 2) {
        ankle = { x: ankle.x, y: ankle.y + Math.min(3, stride * 0.3) * Math.sin(Math.PI * t) };
      }
      foot = { x: ankle.x, y: Math.max(ankle.y, floorOf(angle, body)), angle };
    } else {
      const thighA = sub(keyA.knee, keyA.hip);
      const thighB = sub(keyB.knee, keyB.hip);
      const thigh = mix(fromDown(thighA, basisA), fromDown(thighB, basisB), t);
      const flexA = signed(thighA, sub(keyA.ankle, keyA.knee));
      const flexB = signed(thighB, sub(keyB.ankle, keyB.knee));
      const shinAngle = (s: Side): number =>
        degrees(Math.atan2(s.ankle.y - s.knee.y, s.ankle.x - s.knee.x));
      const relativeA = (footA.angle ?? 0) - shinAngle(keyA);
      const relativeB = near(relativeA, (footB.angle ?? 0) - shinAngle(keyB));
      const thighDirection = directionFromDown(thigh, basis);
      const knee = add(root, scale(thighDirection, body.thigh));
      const shin = rotate(thighDirection, mix(flexA, flexB, t));
      const ankle = add(knee, scale(shin, body.shin));
      const angle = degrees(Math.atan2(shin.y, shin.x)) + mix(relativeA, relativeB, t);
      const absolute = near(mix(footA.angle ?? 0, footB.angle ?? 0, t), angle);
      const floor = spin ? ankle.y : Math.max(ankle.y, floorOf(absolute, body));
      foot = { x: ankle.x, y: floor, angle: absolute };
    }
    return { foot, bend: bendToward(root, foot, body.thigh, body.shin, wantedKnee) };
  };

  const nearArm = arm('near');
  const farArm = arm('far');
  const nearLeg = leg('near');
  const farLeg = leg('far');
  const down = options.lower ?? 0;
  const lowered = <T extends Point>(p: T): T => ({ ...p, y: p.y - down });
  return {
    ...scalars,
    hip: lowered(scalars.hip),
    nearFist: lowered(nearArm.fist),
    farFist: lowered(farArm.fist),
    nearFoot: lowered(nearLeg.foot),
    farFoot: lowered(farLeg.foot),
    bends: {
      nearElbow: nearArm.bend,
      farElbow: farArm.bend,
      nearKnee: nearLeg.bend,
      farKnee: farLeg.bend,
    },
    effects: tweenEffects(a.effects ?? [], b.effects ?? [], t),
  };
}

/** The effects that age and fade on their own (`progress` from 0 to 1). */
type Aging = Extract<Effect, { readonly kind: 'dust' | 'ring' | 'shards' | 'column' }>;
const isAging = (effect: Effect): effect is Aging =>
  effect.kind === 'dust' ||
  effect.kind === 'ring' ||
  effect.kind === 'shards' ||
  effect.kind === 'column';

/**
 * The effects of an in-between. In both keys (same kind, same rank), they glide from one to
 * the other. In the first key only, the ones that age on their own (dust, ring, shards, column)
 * go on toward their end (progress 1), the others stop; born in the second, nothing shows
 * before it. Motion trails and flashes belong to their key alone: never copied (a flash more
 * would light anew).
 */
export function tweenEffects(a: readonly Effect[], b: readonly Effect[], t: number): Effect[] {
  const out: Effect[] = [];
  const ofKind = (list: readonly Effect[], kind: Effect['kind']): Effect[] =>
    list.filter((effect) => effect.kind === kind);
  for (const effect of a) {
    if (effect.kind === 'smear' || effect.kind === 'flash') continue;
    const rank = ofKind(a, effect.kind).indexOf(effect);
    const twin = ofKind(b, effect.kind)[rank];
    if (twin) out.push(mixEffect(effect, twin, t));
    else if (isAging(effect)) out.push({ ...effect, progress: mix(effect.progress, 1, t) });
  }
  return out;
}

/** `e` with every number and point of it mixed toward `f`'s, of the same kind. */
function mixEffect(e: Effect, f: Effect, t: number): Effect {
  const mixed: Record<string, unknown> = { ...e };
  const other = f as unknown as Readonly<Record<string, unknown>>;
  for (const [key, value] of Object.entries(e)) {
    const twin = other[key];
    if (typeof value === 'number' && typeof twin === 'number') mixed[key] = mix(value, twin, t);
    else if (isPoint(value) && isPoint(twin)) mixed[key] = mixPoint(value, twin, t);
  }
  return mixed as unknown as Effect;
}

function isPoint(value: unknown): value is Point {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    typeof value.x === 'number' &&
    typeof value.y === 'number'
  );
}
