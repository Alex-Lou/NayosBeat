import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Foot, type Pose } from './common.ts';
import { hung } from './jump.ts';

/**
 * standHeavy (Coup de talon / High Martial Side Kick): 9 frames, ticks 3,3,2,[4],3,3,3,3,4
 * (active: frame 3, hitbox x 10..52 / y 44..62).
 * Instead of a boxing hook, Koda pivots on his rear foot, chambers his lead knee high across his
 * chest, and snaps a high martial-arts side-thrust kick with his silver shin-greave at chest/head
 * height, counter-balancing with his open knife-hand and unleashing a crescent jade shockwave and
 * diamond shards.
 */

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

function arm(
  body: Body,
  which: 'near' | 'far',
  shoulder: number,
  elbow: number,
): { fist: Point; bend: Bend } {
  const s = solve({ ...body, nearFist: GUARD.nearFist, farFist: GUARD.farFist });
  const root = s[which].shoulder;
  const turn = (v: Point, degrees: number): Point => {
    const a = (degrees * Math.PI) / 180;
    return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
  };
  const upper = turn({ x: -s.up.x, y: -s.up.y }, shoulder);
  const joint = add(root, scale(upper, BODY.upperArm));
  const fist = add(joint, scale(turn(upper, elbow), BODY.forearm));
  const line = sub(fist, root);
  const axis = scale(line, 1 / (Math.hypot(line.x, line.y) || 1));
  const offset = sub(joint, root);
  const along = offset.x * axis.x + offset.y * axis.y;
  const mirror = add(root, sub(scale(axis, 2 * along), offset));
  const dx = joint.x - mirror.x;
  const dy = joint.y - mirror.y;
  const bend: Bend =
    Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'down' : 'up') : dx > 0 ? 'front' : 'back';
  return { fist: at(fist.x, fist.y), bend };
}

function posed(body: Body, near: readonly [number, number], far: readonly [number, number]): Pose {
  const lead = arm(body, 'near', near[0], near[1]);
  const rear = arm(body, 'far', far[0], far[1]);
  return {
    ...body,
    nearFist: lead.fist,
    farFist: rear.fist,
    bends: { ...body.bends, nearElbow: lead.bend, farElbow: rear.bend },
  };
}

function withKick(body: Body, foot: Point, ankle = 90): Body {
  const withFoot: Body = {
    ...body,
    nearFoot: { x: foot.x, y: foot.y, angle: 0 },
    bends: { ...body.bends, nearKnee: 'up' },
  };
  return { ...withFoot, nearFoot: hung(withFoot, 'near', ankle) };
}

const REAR_TOE = solve(GUARD).far.toe.x;

function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

// Frame 0 (3 ticks): Weight shifts onto the rear leg, hands crossing in front of the torso to
// gather momentum for the high kick.
const COIL_BODY: Body = {
  ...GUARD,
  hip: at(-5.5, 35.8),
  torso: 12,
  head: 3,
  shrug: 1.4,
  twist: 0.25,
  nearFoot: planted(6.35, 2),
  farFoot: onToes(REAR_TOE + 2, -16),
};
const COIL: Pose = posed(COIL_BODY, [24, 92], [38, 88]);

// Frame 1 (3 ticks): Pivoting on the planted rear foot, Koda chambers his lead knee high in front
// of his chest while his torso leans back to counterbalance.
const CHAMBER_RAW: Body = {
  ...GUARD,
  hip: at(-1.0, 37.5),
  torso: 4,
  head: 6,
  shrug: 1.8,
  twist: 0.35,
  nearFoot: at(10, 28),
  farFoot: planted(-10.0, -6),
  face: 'focus',
};
const CHAMBER: Pose = posed(withKick(CHAMBER_RAW, at(10, 28), 95), [18, 96], [46, 92]);

// Frame 2 (2 ticks): The hip snaps over and the silver-greaved leg whips outward toward chest
// height, trailing a jade crescent arc.
const WHIP_RAW: Body = {
  ...GUARD,
  hip: at(3.5, 38.5),
  torso: -4,
  head: 10,
  shrug: 2.0,
  twist: -0.25,
  nearFoot: at(27, 45),
  farFoot: planted(-5.5, -8),
  face: 'effort',
};
const WHIP: Pose = {
  ...posed(withKick(WHIP_RAW, at(27, 45), 90), [-12, 28], [48, 94]),
  effects: [smear(4.0, [10, 32], [19, 40], [29, 46])],
};

// Frame 3 (4 ticks, active): Full high side-thrust kick! The lead leg is extended at y ~ 50,
// torso counter-balanced back, lead arm swept down-back and rear palm guarding the temple; the
// jade blade arc, impact flash and diamond shards reach x = 52 (hitbox 10..52, y 44..62).
const IMPACT_RAW: Body = {
  ...GUARD,
  hip: at(7.5, 39.0),
  torso: -8,
  head: 12,
  shrug: 2.2,
  twist: -0.4,
  nearFoot: at(38.0, 49.5),
  farFoot: planted(-4.0, -8),
  face: 'kiai',
};
const IMPACT: Pose = {
  ...posed(withKick(IMPACT_RAW, at(38.0, 49.5), 88), [-18, 24], [52, 96]),
  effects: [
    smear(5.5, [16, 40], [28, 46], [42, 50]),
    { kind: 'flash', center: at(46.5, 51), radius: 5.5, tone: 'strike' },
    { kind: 'shards', center: at(43.5, 51), radius: 8.5, progress: 0.3, tone: 'sound' },
    { kind: 'dust', x: -4, size: 2.8, progress: 0.25 },
  ],
  glows: [{ center: at(42, 50), reach: 26, power: 1.1, tone: 'sound' }],
};

// Frame 4 (3 ticks): Follow-through at the end of the kick as a standing jade ring ripples where
// the silver shin-greave struck.
const THROUGH_RAW: Body = {
  ...IMPACT_RAW,
  hip: at(5.5, 38.5),
  torso: -5,
  head: 9,
  nearFoot: at(32.0, 46.0),
  farFoot: planted(-6.0, -8),
  face: 'effort',
};
const THROUGH: Pose = {
  ...posed(withKick(THROUGH_RAW, at(32.0, 46.0), 90), [-12, 28], [48, 94]),
  effects: [
    { kind: 'ring', center: at(44, 51), radius: 9, progress: 0.5, tone: 'sound', squash: 1.6 },
    { kind: 'dust', x: -4, size: 2.8, progress: 0.65 },
  ],
};

// Frame 5 (3 ticks): Re-chambering the kicking knee cleanly in front of the hip.
const RECHAMBER_RAW: Body = {
  ...GUARD,
  hip: at(0.5, 37.5),
  torso: 4,
  head: 4,
  shrug: 1.8,
  twist: -0.15,
  nearFoot: at(15, 25),
  farFoot: planted(-11.0, -10),
};
const RECHAMBER: Pose = posed(withKick(RECHAMBER_RAW, at(15, 25), 95), [16, 84], [42, 90]);

// Frame 6 (3 ticks): Setting the lead foot back down toward its guard mark.
const STEP_DOWN_BODY: Body = {
  ...GUARD,
  hip: at(-4.2, 36.4),
  torso: 11,
  head: 2,
  shrug: 1.5,
  nearFoot: lifted(planted(8.5, 2), 1.2),
  farFoot: onToes(REAR_TOE, -18),
};
const STEP_DOWN: Pose = posed(STEP_DOWN_BODY, [22, 88], [38, 92]);

// Frame 7 (3 ticks): Sinking into the martial stance as the foot plants.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-6.8, 35.8),
  torso: 14.5,
  head: 2,
  shrug: 1.6,
  nearFist: at(8.6, 47.0),
  farFist: at(9.5, 61.8),
};

// Frame 8 (4 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [
  COIL,
  CHAMBER,
  WHIP,
  IMPACT,
  THROUGH,
  RECHAMBER,
  STEP_DOWN,
  SETTLE,
  GUARD,
];
