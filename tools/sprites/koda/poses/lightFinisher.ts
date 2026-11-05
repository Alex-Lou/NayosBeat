import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import {
  at,
  energy,
  GUARD,
  lifted,
  planted,
  smear,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';

/**
 * lightFinisher (Frappe du manteau / Twin-Gauntlet Cross Slash): 7 frames, 2, 3, 3, [3], 5, 6, 7
 * ticks (29), active frame 3 (ticks 8-10), hitbox x 10..48 / y 44..62.
 * Instead of Nayo's overhand punch, Koda steps in out of Revers d'acier, crosses both silver
 * tuning-blade gauntlets at his chest with a jade spark, and slashes both open knife-hands across
 * in a wide X-shaped acoustic wave that knocks the opponent down.
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

const REAR_TOE = solve(GUARD).far.toe.x;

function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

// Frame 0 (2 ticks): Stepping in out of chainLight, drawing both silver gauntlets inward toward
// the chest.
const STEP_BODY: Body = {
  ...GUARD,
  hip: at(-5.5, 34.5),
  torso: 16,
  head: 0,
  shrug: 1.6,
  twist: 0.2,
  nearFoot: lifted(planted(8.5, 2), 1.4),
  farFoot: onToes(REAR_TOE - 2, -22),
};
const STEP: Pose = posed(STEP_BODY, [24, 96], [38, 92]);

// Frame 1 (3 ticks): Deep coil with both silver gauntlets crossed in an X in front of his sternum,
// charging with jade acoustic energy.
const CROSS_BODY: Body = {
  ...GUARD,
  hip: at(-6.2, 33.2),
  torso: 18,
  head: -2,
  shrug: 2.2,
  twist: 0.35,
  nearFoot: planted(9.5, 0),
  farFoot: onToes(REAR_TOE - 3, -26),
  face: 'focus',
};
const CROSS: Pose = {
  ...posed(CROSS_BODY, [28, 104], [42, 98]),
  effects: [energy(10, 48, 3.0), dust(10, 2.5, 0.2)],
  glows: [{ center: at(10, 48), reach: 22, power: 0.9, tone: 'sound' }],
};

// Frame 2 (3 ticks): Uncoiling from the hips, both silver tuning-blades whipping forward and
// upward toward the target.
const WHIP_BODY: Body = {
  ...GUARD,
  hip: at(-2.5, 34.0),
  torso: 21,
  head: -4,
  shrug: 2.8,
  reach: { near: 2.0, far: 1.5 },
  twist: -0.25,
  nearFoot: planted(11.0, 0),
  farFoot: onToes(REAR_TOE - 2, -30),
  face: 'effort',
};
const WHIP: Pose = {
  ...posed(WHIP_BODY, [76, 36], [64, 48]),
  effects: [smear(4.0, [10, 48], [20, 52], [30, 53]), dust(10, 2.5, 0.55)],
};

// Frame 3 (3 ticks, active): Twin-Gauntlet X-Slash! The lead knife-hand and silver tuning-blade
// slice out to x = 44 (with the blade arc + flash + ring reaching x = 48..50 across y 44..62),
// while the rear palm slashes across in tandem.
const IMPACT_BODY: Body = {
  ...GUARD,
  hip: at(0.5, 33.5),
  torso: 25,
  head: -8,
  shrug: 3.2,
  reach: { near: 3.8, far: 2.2 },
  twist: -0.45,
  nearFoot: planted(11.5, -3),
  farFoot: onToes(REAR_TOE, -34),
  face: 'kiai',
};
const IMPACT: Pose = {
  ...IMPACT_BODY,
  nearFist: at(39.8, 51.5),
  farFist: at(28.5, 47.0),
  bends: { nearElbow: 'down', farElbow: 'down' },
  effects: [
    smear(5.0, [16, 56], [28, 54], [43.5, 51.5]),
    smear(3.8, [14, 44], [26, 48], [38.0, 53.0]),
    { kind: 'flash', center: at(45.5, 51.5), radius: 5.2, tone: 'strike' },
    { kind: 'ring', center: at(42.0, 51.5), radius: 9, progress: 0.35, tone: 'sound', squash: 1.5 },
    { kind: 'shards', center: at(43.5, 51.5), radius: 10, progress: 0.3, tone: 'sound' },
  ],
  glows: [{ center: at(42, 51.5), reach: 28, power: 1.2, tone: 'sound' }],
};

// Frame 4 (5 ticks): Follow-through of the twin-blade slash as the jade ring expands.
const THROUGH: Pose = {
  ...IMPACT,
  hip: at(-1.0, 34.0),
  torso: 23,
  head: -6,
  nearFist: at(36.0, 50.0),
  farFist: at(24.0, 46.5),
  face: 'effort',
  effects: [
    { kind: 'ring', center: at(44.0, 51.5), radius: 13, progress: 0.7, tone: 'sound', squash: 1.5 },
  ],
  glows: [{ center: at(40, 51), reach: 22, power: 0.7, tone: 'sound' }],
};

// Frame 5 (6 ticks): Drawing the silver gauntlets back into the martial stance.
const RETRACT_BODY: Body = {
  ...GUARD,
  hip: at(-4.5, 35.4),
  torso: 17,
  head: -1,
  shrug: 1.8,
  nearFoot: lifted(planted(8.5, 0), 0.8),
  farFoot: onToes(REAR_TOE, -20),
};
const RETRACT: Pose = posed(RETRACT_BODY, [28, 78], [40, 88]);

// Frame 6 (7 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [STEP, CROSS, WHIP, IMPACT, THROUGH, RETRACT, GUARD];
