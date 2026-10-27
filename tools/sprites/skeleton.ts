/**
 * A fighter's pose and the joints it puts in place. Character space: origin at the feet anchor,
 * x toward the opponent, y up, in pixels. Feet and fists are placed by hand; knees and elbows
 * follow (two-bone inverse kinematics), so planted feet never slide between frames.
 *
 * "Near" limbs are the ones on the camera side, drawn over the torso: for a fighter facing
 * right in an orthodox stance, they are the lead (front) arm and leg.
 */

import type { Point } from './raster.ts';

export interface Foot {
  /** Ankle position. A foot flat on the ground has its ankle at y = ANKLE_HEIGHT. */
  readonly x: number;
  readonly y: number;
  /** Foot angle in degrees, 0 = flat, positive = toes up. */
  readonly angle?: number;
}

/** Which way an elbow or knee folds when two placements reach the same hand or foot. */
export type Bend = 'down' | 'up' | 'front' | 'back';

export interface Bends {
  readonly nearElbow?: Bend;
  readonly farElbow?: Bend;
  readonly nearKnee?: Bend;
  readonly farKnee?: Bend;
}

export type Hand = 'fist' | 'open';

/**
 * Expressions stay restrained, the character is cool-headed: `focus` while fighting, `effort`
 * (jaw set) on heavy blows, `kiai` (short shout) only at the peak of a special.
 */
export type Face = 'focus' | 'effort' | 'kiai' | 'smirk' | 'cool' | 'hurt' | 'out' | 'tired';

/** Which of the fighter's two effect colors: sound (waves, energy) or strike (impacts, trails). */
export type Tone = 'sound' | 'strike';

/**
 * Effects of a frame, in character space (not turned by `spin`). Motion trails are drawn
 * behind the body; every other effect goes on the front layer, over both fighters.
 */
export type Effect =
  /** Motion trail of a fast limb: a band through `points`, tail first, `width` at the limb. */
  | { readonly kind: 'smear'; readonly points: readonly Point[]; readonly width: number }
  /** Sound energy gathered or released by the hands. */
  | { readonly kind: 'energy'; readonly center: Point; readonly radius: number }
  /** The flying sound wave (projectile), `phase` from 0 to 1 along its loop. */
  | { readonly kind: 'wave'; readonly center: Point; readonly phase: number }
  /** A star-shaped flash where a strike snaps out. */
  | { readonly kind: 'flash'; readonly center: Point; readonly radius: number; readonly tone: Tone }
  /**
   * A ring spreading from a point, `progress` from 0 (just born) to 1 (gone); `squash` < 1
   * flattens it (a shockwave on the floor).
   */
  | {
      readonly kind: 'ring';
      readonly center: Point;
      readonly radius: number;
      readonly progress: number;
      readonly tone: Tone;
      readonly squash?: number;
    }
  /** Speed lines streaming behind a part moving toward `direction` (degrees, 0 = forward). */
  | {
      readonly kind: 'speed';
      readonly center: Point;
      readonly length: number;
      readonly spread: number;
      readonly direction: number;
      readonly tone: Tone;
    }
  /** A column of sound rising from `base` (the uppercut), `progress` from 0 to 1. */
  | {
      readonly kind: 'column';
      readonly base: Point;
      readonly height: number;
      readonly width: number;
      readonly progress: number;
    }
  /**
   * Shards flying out of an impact along the blow (forward cone), `progress` from 0 to 1.
   */
  | {
      readonly kind: 'shards';
      readonly center: Point;
      readonly radius: number;
      readonly progress: number;
      readonly tone: Tone;
    }
  /** A guard arc facing the attacker (behind the point), `progress` from 0 to 1. */
  | {
      readonly kind: 'shield';
      readonly center: Point;
      readonly radius: number;
      readonly progress: number;
    }
  /** Dust kicked up from the floor at `x`, `progress` from 0 to 1. */
  | { readonly kind: 'dust'; readonly x: number; readonly size: number; readonly progress: number };

export interface Pose {
  readonly hip: Point;
  /** Lean of the torso in degrees: 0 = upright, positive = toward the opponent. */
  readonly torso: number;
  /** Extra head tilt in degrees, positive = chin down / forward. */
  readonly head: number;
  readonly nearFoot: Foot;
  readonly farFoot: Foot;
  readonly nearFist: Point;
  readonly farFist: Point;
  /** Whole-body rotation around the hip in degrees, positive = forward somersault. */
  readonly spin?: number;
  /** Rolls the lead (near) shoulder up and forward, in pixels: the shoulder roll of the guard. */
  readonly shrug?: number;
  /** Shoulders reaching forward with a punch, in pixels: near (lead) and far (rear). */
  readonly reach?: { readonly near?: number; readonly far?: number };
  /**
   * Chest turned toward the viewer (positive, a rear-hand punch opening the chest) or away
   * (negative), from -1 to 1: the open front of the jacket slides across the torso.
   */
  readonly twist?: number;
  /** Defaults: elbows down, knees toward the opponent. */
  readonly bends?: Bends;
  /** Defaults to fists. */
  readonly nearHand?: Hand;
  readonly farHand?: Hand;
  /** Defaults to focus. */
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

/**
 * Body measurements of a fighter in world pixels (the sprites are drawn ART_SCALE times finer):
 * every character has their own proportions, the skeleton solves any of them.
 */
export interface Body {
  /** Height of the shoulders above the hip, along the spine. */
  readonly shoulder: number;
  /** Height of the base of the neck above the hip, along the spine. */
  readonly neck: number;
  /** From the base of the neck to the middle of the skull. */
  readonly headDistance: number;
  readonly headRadius: number;
  /** Distance from the head's center to the point it turns around (near the jaw). */
  readonly headPivot: number;
  /** How far each shoulder and each hip joint sits from the spine, across the torso. */
  readonly shoulderSpread: number;
  readonly hipSpread: number;
  readonly upperArm: number;
  readonly forearm: number;
  readonly thigh: number;
  readonly shin: number;
  /** Ankle height above the ground for a flat foot. */
  readonly ankle: number;
  /** Half thickness of the shoe. */
  readonly footRadius: number;
  /** From the ankle to the toe, and back to the heel. */
  readonly foot: number;
  readonly heel: number;
}

/** Nayo's measurements, the default of every function that takes a body. */
export const BODY = {
  shoulder: 21.5,
  neck: 25.5,
  headDistance: 7.4,
  headRadius: 5.6,
  upperArm: 13,
  forearm: 12,
  thigh: 19.5,
  shin: 17.5,
  /** Ankle height above the ground for a flat foot. */
  ankle: 4.6,
  /** Half thickness of the shoe. */
  footRadius: 2.3,
  foot: 7,
  heel: 2.6,
  headPivot: 2.4,
  shoulderSpread: 1.2,
  hipSpread: 1.5,
} as const satisfies Body;

/**
 * A foot planted at `x` with its lowest point exactly on the ground: a raised heel (negative
 * angle) or raised toes lift the ankle so the shoe never sinks below the floor.
 */
export function planted(x: number, angle = 0, body: Body = BODY): Foot {
  const a = radians(angle);
  const sole = body.ankle - body.footRadius;
  // Lowest point of the shoe below the ankle: the sole line, then whichever end dips more.
  const dip = sole * Math.cos(a) + Math.max(-body.foot * Math.sin(a), body.heel * Math.sin(a), 0);
  return { x, y: dip + body.footRadius, angle };
}

export interface Skeleton {
  readonly hip: Point;
  /** Unit vector from the hip toward the neck. */
  readonly up: Point;
  /** Unit vector across the torso, toward the front (perpendicular to `up`). */
  readonly front: Point;
  readonly neck: Point;
  readonly head: Point;
  /** Head orientation in degrees (torso lean + head tilt + spin), for face details. */
  readonly headAngle: number;
  /** Lead shoulder roll (see Pose.shrug): the jacket's shoulder line rises with it. */
  readonly shrug: number;
  /** Chest turn (see Pose.twist). */
  readonly twist: number;
  readonly near: Side;
  readonly far: Side;
  readonly face: Face;
  readonly effects: readonly Effect[];
}

export interface Side {
  readonly shoulder: Point;
  readonly elbow: Point;
  readonly wrist: Point;
  readonly hip: Point;
  readonly knee: Point;
  readonly ankle: Point;
  readonly heel: Point;
  readonly toe: Point;
  /** Direction of the forearm, to place the hand past the wrist. */
  readonly forearm: Point;
  readonly hand: Hand;
}

export function solve(pose: Pose, body: Body = BODY): Skeleton {
  const lean = radians(pose.torso);
  const up = { x: Math.sin(lean), y: Math.cos(lean) };
  const front = { x: up.y, y: -up.x };
  const { hip } = pose;
  const neck = add(hip, scale(up, body.neck));
  const headAngle = pose.torso + pose.head + (pose.spin ?? 0);
  const tilt = radians(pose.torso + pose.head);
  // The head pivots near the jaw: nods and snaps turn it in place, they don't swing it around.
  const head = add(
    add(neck, scale(up, body.headDistance - body.headPivot)),
    scale({ x: Math.sin(tilt), y: Math.cos(tilt) }, body.headPivot),
  );
  const shoulderBase = add(hip, scale(up, body.shoulder));
  const shrug = pose.shrug ?? 0;
  // The lead shoulder rolls up and forward, toward the chin.
  const roll = add(scale(up, shrug), scale(front, shrug * 0.45));

  const bends = pose.bends ?? {};
  const side = (
    sign: 1 | -1,
    foot: Foot,
    fist: Point,
    elbow: Bend,
    knee: Bend,
    hand: Hand,
  ): Side => {
    const reach = (sign > 0 ? pose.reach?.near : pose.reach?.far) ?? 0;
    const shoulder = add(
      add(shoulderBase, scale(front, sign * body.shoulderSpread + reach)),
      sign > 0 ? roll : ZERO,
    );
    const arm = twoBone(shoulder, fist, body.upperArm, body.forearm, PICKS[elbow]);
    const hipJoint = add(hip, scale(front, sign * body.hipSpread));
    const ankle = { x: foot.x, y: foot.y };
    const leg = twoBone(hipJoint, ankle, body.thigh, body.shin, PICKS[knee]);
    const footAngle = radians(foot.angle ?? 0);
    const along = { x: Math.cos(footAngle), y: Math.sin(footAngle) };
    // Center line of the shoe, below the ankle, across the foot's own "down".
    const sole = add(leg.end, scale({ x: along.y, y: -along.x }, body.ankle - body.footRadius));
    return {
      shoulder,
      elbow: arm.joint,
      wrist: arm.end,
      forearm: unit(sub(arm.end, arm.joint)),
      hip: hipJoint,
      knee: leg.joint,
      ankle: leg.end,
      heel: sub(sole, scale(along, body.heel)),
      toe: add(sole, scale(along, body.foot)),
      hand,
    };
  };

  const skeleton: Skeleton = {
    hip,
    up,
    front,
    neck,
    head,
    headAngle,
    near: side(
      1,
      pose.nearFoot,
      pose.nearFist,
      bends.nearElbow ?? 'down',
      bends.nearKnee ?? 'front',
      pose.nearHand ?? 'fist',
    ),
    far: side(
      -1,
      pose.farFoot,
      pose.farFist,
      bends.farElbow ?? 'down',
      bends.farKnee ?? 'front',
      pose.farHand ?? 'fist',
    ),
    shrug,
    twist: pose.twist ?? 0,
    face: pose.face ?? 'focus',
    effects: pose.effects ?? [],
  };
  return pose.spin ? spin(skeleton, pose.spin) : skeleton;
}

/**
 * Linear blend of two poses, `t` from 0 (a) to 1 (b): used to author in-between frames.
 * Hands, face, bends and effects come from the nearer of the two.
 */
export function blend(a: Pose, b: Pose, t: number): Pose {
  const mix = (p: number, q: number): number => p + (q - p) * t;
  const point = (p: Point, q: Point): Point => ({ x: mix(p.x, q.x), y: mix(p.y, q.y) });
  const foot = (p: Foot, q: Foot): Foot => ({
    ...point(p, q),
    angle: mix(p.angle ?? 0, q.angle ?? 0),
  });
  return {
    ...(t < 0.5 ? a : b),
    hip: point(a.hip, b.hip),
    torso: mix(a.torso, b.torso),
    head: mix(a.head, b.head),
    nearFoot: foot(a.nearFoot, b.nearFoot),
    farFoot: foot(a.farFoot, b.farFoot),
    nearFist: point(a.nearFist, b.nearFist),
    farFist: point(a.farFist, b.farFist),
    spin: mix(a.spin ?? 0, b.spin ?? 0),
    shrug: mix(a.shrug ?? 0, b.shrug ?? 0),
    twist: mix(a.twist ?? 0, b.twist ?? 0),
    reach: {
      near: mix(a.reach?.near ?? 0, b.reach?.near ?? 0),
      far: mix(a.reach?.far ?? 0, b.reach?.far ?? 0),
    },
  };
}

const ZERO: Point = { x: 0, y: 0 };

type Pick = (a: Point, b: Point) => Point;
const PICKS: Readonly<Record<Bend, Pick>> = {
  down: (a, b) => (a.y <= b.y ? a : b),
  up: (a, b) => (a.y >= b.y ? a : b),
  front: (a, b) => (a.x >= b.x ? a : b),
  back: (a, b) => (a.x <= b.x ? a : b),
};

/** Places the middle joint of a two-segment limb reaching from `root` toward `target`. */
function twoBone(root: Point, target: Point, first: number, second: number, pick: Pick) {
  const offset = sub(target, root);
  const reach = Math.min(
    first + second - 0.01,
    Math.max(Math.abs(first - second) + 0.01, length(offset)),
  );
  const direction = length(offset) > 0 ? unit(offset) : { x: 0, y: -1 };
  const end = add(root, scale(direction, reach));
  const cos = (first * first + reach * reach - second * second) / (2 * first * reach);
  const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
  const base = Math.atan2(direction.y, direction.x);
  const joint = pick(
    add(root, { x: Math.cos(base + angle) * first, y: Math.sin(base + angle) * first }),
    add(root, { x: Math.cos(base - angle) * first, y: Math.sin(base - angle) * first }),
  );
  return { joint, end };
}

/** Rotates every joint around the hip (forward somersault for positive degrees). */
function spin(skeleton: Skeleton, degrees: number): Skeleton {
  const angle = -radians(degrees);
  const rotate = (p: Point): Point => {
    const d = sub(p, skeleton.hip);
    return add(skeleton.hip, {
      x: d.x * Math.cos(angle) - d.y * Math.sin(angle),
      y: d.x * Math.sin(angle) + d.y * Math.cos(angle),
    });
  };
  const direction = (p: Point): Point => sub(rotate(add(skeleton.hip, p)), skeleton.hip);
  const side = (s: Side): Side => ({
    shoulder: rotate(s.shoulder),
    elbow: rotate(s.elbow),
    wrist: rotate(s.wrist),
    hip: rotate(s.hip),
    knee: rotate(s.knee),
    ankle: rotate(s.ankle),
    heel: rotate(s.heel),
    toe: rotate(s.toe),
    forearm: direction(s.forearm),
    hand: s.hand,
  });
  return {
    ...skeleton,
    up: direction(skeleton.up),
    front: direction(skeleton.front),
    neck: rotate(skeleton.neck),
    head: rotate(skeleton.head),
    near: side(skeleton.near),
    far: side(skeleton.far),
  };
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}
export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}
export function scale(a: Point, k: number): Point {
  return { x: a.x * k, y: a.y * k };
}
function length(a: Point): number {
  return Math.hypot(a.x, a.y);
}
function unit(a: Point): Point {
  const l = length(a) || 1;
  return { x: a.x / l, y: a.y / l };
}
export function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
