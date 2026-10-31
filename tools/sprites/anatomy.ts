/**
 * What a human body can do, measured on a solved skeleton (character space: x toward the
 * opponent, y up). The skeleton places elbows and knees by two-bone inverse kinematics, which
 * knows no joint limits: it happily bends a knee backward or folds an arm out of the back. These
 * rules catch it. Angles in degrees.
 *
 * Seen side on, every joint bends one way in the plane of the picture:
 * - an elbow folds the forearm toward the front of the upper arm (counterclockwise, positive);
 * - a knee folds the shin behind the thigh (clockwise, negative);
 * - a hip swings the thigh up in front of the belly (positive) and only a little behind;
 * - an ankle stands square to the shin (90), toes up closes it, a pointed foot opens it.
 * Even on an arm raised out to the side, seen three quarters, an elbow that folds the other way
 * on the picture reads as a broken arm: that is a hard limit too. So does, on a fighter seen three
 * quarters, the far arm (behind the body) pulled back and folded: its elbow sticks out of the
 * back at a right angle (the owner's call).
 */

import type { Point } from './raster.ts';
import { solve, type Body, type Pose, type Side, type Skeleton } from './skeleton.ts';

/** Hard limits: past them, the pose is broken. */
export const LIMITS = {
  /** Knee hyperextension (a knee bent backward). */
  kneeBackward: 8,
  /** Knee folded flatter than this (shin through the thigh). */
  kneeFolded: -165,
  /** Elbow folded tighter than this (forearm through the biceps). */
  elbowFolded: 155,
  /** Elbow bent the other way, seen side on (an arm folded backward). */
  elbowReversed: -10,
  /** Arm raised behind the back, from hanging (shoulder extension). */
  shoulderBehind: -60,
  /**
   * Seen three quarters, the far arm pulled back past this (shoulder extension) while folded
   * past FOLDED_ARM: an elbow that sticks out of the back.
   */
  farArmBack: -15,
  /** Thigh swung behind the torso, from hanging (hip extension): past the splits. */
  hipBehind: -100,
  /** Thigh folded tighter than this against the torso (hip flexion): through the belly. */
  hipFolded: 165,
  /** Ankle closed tighter than this, toes up toward the shin: past a deep lunge. */
  ankleBentUp: 45,
  /** Ankle opened past this: the foot bent back beyond the line of the shin. */
  ankleBentDown: 185,
  /** Head tilted on the neck, either way. */
  neck: 50,
  /** An elbow or a wrist this close to the head's center (in head radii) is inside the head. */
  inHead: 0.8,
} as const;

/** How far an elbow folds (degrees) before an arm pulled back reads as folded. */
const FOLDED_ARM = 45;

/** Warnings, to judge on the picture. */
export const WARNINGS = {
  /** Thigh swung far behind (a scorpion, a back kick): a dancer's, to judge. */
  hipBehind: -60,
  /** Fist or ankle placed past the limb's reach: the solver locks it straight. */
  outOfReach: 0.5,
  /** Foot pointed past this (a kick's instep, a limp foot). */
  anklePointed: 150,
} as const;

export interface Joints {
  readonly elbow: number;
  readonly knee: number;
  readonly shoulder: number;
  readonly hip: number;
  readonly ankle: number;
  /** How far the fist and the ankle fall short of where the pose put them. */
  readonly fistMiss: number;
  readonly footMiss: number;
  /** Distance from the head's center to the nearer of the elbow and the wrist. */
  readonly headDistance: number;
}

export interface Issue {
  readonly side: 'near' | 'far';
  readonly rule: keyof typeof LIMITS | keyof typeof WARNINGS;
  readonly hard: boolean;
  readonly value: number;
}

const degrees = (r: number): number => (r * 180) / Math.PI;
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const length = (a: Point): number => Math.hypot(a.x, a.y);
const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;
/** Angle from `a` to `b`, counterclockwise positive, -180 to 180. */
const signed = (a: Point, b: Point): number =>
  degrees(Math.atan2(a.x * b.y - a.y * b.x, dot(a, b)));
/** Angle of `limb` from the torso's "down", positive toward its front. */
const fromDown = (skeleton: Skeleton, limb: Point): number => {
  const down = { x: -skeleton.up.x, y: -skeleton.up.y };
  return degrees(Math.atan2(dot(limb, skeleton.front), dot(limb, down)));
};

/**
 * The joints of one side of a solved pose. `flat` is the same side solved without the pose's
 * spin, where the fist and the foot are still in the frame the pose placed them in.
 */
export function jointsOf(
  skeleton: Skeleton,
  side: Side,
  flat: Side,
  fist: Point,
  foot: Point,
): Joints {
  const upper = sub(side.elbow, side.shoulder);
  // Clockwise from the front of the shin (ankle to knee) to the sole: 90 square, and on to
  // 270 so a foot bent back past the shin reads past 180, one folded past it below 0.
  const ankle = -signed(sub(side.knee, side.ankle), sub(side.toe, side.heel));
  return {
    elbow: signed(upper, sub(side.wrist, side.elbow)),
    knee: signed(sub(side.knee, side.hip), sub(side.ankle, side.knee)),
    shoulder: fromDown(skeleton, upper),
    hip: fromDown(skeleton, sub(side.knee, side.hip)),
    ankle: ((ankle + 450) % 360) - 90,
    fistMiss: length(sub(flat.wrist, fist)),
    footMiss: length(sub(flat.ankle, foot)),
    headDistance: Math.min(
      length(sub(side.elbow, skeleton.head)),
      length(sub(side.wrist, skeleton.head)),
    ),
  };
}

/** What is wrong with a pose, hard limits first. */
export function anatomyIssues(pose: Pose, body: Body): Issue[] {
  const skeleton = solve(pose, body);
  // A spun pose is solved first, then turned: its fists and feet are reached before the turn.
  const flat = pose.spin ? solve({ ...pose, spin: 0 }, body) : skeleton;
  const issues: Issue[] = [];
  const sides = [
    ['near', skeleton.near, flat.near, pose.nearFist, pose.nearFoot],
    ['far', skeleton.far, flat.far, pose.farFist, pose.farFoot],
  ] as const;
  for (const [name, side, flatSide, fist, foot] of sides) {
    const j = jointsOf(skeleton, side, flatSide, fist, foot);
    const add = (rule: Issue['rule'], hard: boolean, value: number): void => {
      issues.push({ side: name, rule, hard, value: Math.round(value * 10) / 10 });
    };
    if (j.knee > LIMITS.kneeBackward) add('kneeBackward', true, j.knee);
    if (j.knee < LIMITS.kneeFolded) add('kneeFolded', true, j.knee);
    if (j.elbow > LIMITS.elbowFolded) add('elbowFolded', true, j.elbow);
    if (j.shoulder < LIMITS.shoulderBehind) add('shoulderBehind', true, j.shoulder);
    const threeQuarters = body.shoulderSpread < 0;
    if (threeQuarters && name === 'far' && j.shoulder < LIMITS.farArmBack && j.elbow > FOLDED_ARM) {
      add('farArmBack', true, j.shoulder);
    }
    if (j.hip < LIMITS.hipBehind) add('hipBehind', true, j.hip);
    else if (j.hip < WARNINGS.hipBehind) add('hipBehind', false, j.hip);
    if (j.hip > LIMITS.hipFolded) add('hipFolded', true, j.hip);
    if (j.ankle < LIMITS.ankleBentUp) add('ankleBentUp', true, j.ankle);
    if (j.ankle > LIMITS.ankleBentDown) add('ankleBentDown', true, j.ankle);
    else if (j.ankle > WARNINGS.anklePointed) add('anklePointed', false, j.ankle);
    if (j.headDistance < LIMITS.inHead * body.headRadius) add('inHead', true, j.headDistance);
    if (j.elbow < LIMITS.elbowReversed) add('elbowReversed', true, j.elbow);
    if (Math.max(j.fistMiss, j.footMiss) > WARNINGS.outOfReach) {
      add('outOfReach', false, Math.max(j.fistMiss, j.footMiss));
    }
  }
  if (Math.abs(pose.head) > LIMITS.neck) {
    issues.push({ side: 'near', rule: 'neck', hard: true, value: pose.head });
  }
  return issues.sort((a, b) => Number(b.hard) - Number(a.hard));
}
