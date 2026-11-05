import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Foot, type Pose } from './common.ts';

/**
 * chainLight (Revers d'acier / Open-Chest Rear Gauntlet Slash): 6 frames, 2, 2, 2, [3], 6, 6 ticks
 * (21), active frame 3 (ticks 6-8), hitbox x 10..46 / y 46..60.
 * Instead of Nayo's boxing cross with the lead glove at the cheek, Koda whips his lead arm back to
 * his waist (`[-20, 24]`), rotating his bare chest wide open toward the camera (`twist: 0.45`),
 * and slashes his rear silver tuning-blade gauntlet straight out across the target (`x = 41.5, y = 53`).
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

const LEAD_TOE = solve(GUARD).near.toe.x;
const REAR_TOE = solve(GUARD).far.toe.x;

function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

// Frame 0 (2 ticks): Out of standLight, the lead arm begins sweeping down toward the waist while
// the rear silver gauntlet cocks at the shoulder.
const COIL_BODY: Body = {
  ...GUARD,
  hip: at(-4.8, 35.5),
  torso: 16,
  head: 0,
  shrug: 1.8,
  twist: 0.1,
  nearFoot: lifted(onToes(LEAD_TOE + 1, 2), 1.0),
  farFoot: onToes(REAR_TOE - 2, -22),
};
const COIL: Pose = posed(COIL_BODY, [24, 64], [36, 98]);

// Frame 1 (2 ticks): The lead foot steps in, the lead arm sweeps back to the hip (`[-14, 28]`),
// opening the chest as the rear gauntlet starts forward.
const TURN_BODY: Body = {
  ...GUARD,
  hip: at(-3.5, 34.8),
  torso: 18,
  head: -2,
  shrug: 1.4,
  reach: { near: -1.5, far: 1.8 },
  twist: 0.35,
  nearFoot: planted(8.5, 0),
  farFoot: onToes(REAR_TOE - 3, -28),
};
const TURN: Pose = posed(TURN_BODY, [-14, 28], [58, 56]);

// Frame 2 (2 ticks): Three-quarters out, a jade blade streak trailing the rear silver gauntlet.
const SNAP_BODY: Body = {
  ...GUARD,
  hip: at(-2.0, 34.2),
  torso: 21,
  head: -4,
  shrug: 1.2,
  reach: { near: -2.0, far: 3.2 },
  twist: 0.5,
  nearFoot: planted(9.5, -2),
  farFoot: onToes(REAR_TOE - 2, -32),
  face: 'effort',
};
const SNAP_POSE = posed(SNAP_BODY, [-20, 24], [74, 26]);
const SNAP: Pose = {
  ...SNAP_POSE,
  effects: [smear(3.8, [16, 52], [25, 53], [SNAP_POSE.farFist.x + 2, SNAP_POSE.farFist.y])],
};

// Frame 3 (3 ticks, active): Full rear-gauntlet slash across x 10..46, y 46..60! The lead arm is
// swept back past the hip as a counterweight (`[-24, 22]`), chest wide open, rear knife-hand at
// x = 40.5, y = 53.0.
const STRIKE_BODY: Body = {
  ...SNAP_BODY,
  hip: at(0.5, 33.8),
  torso: 24,
  head: -6,
  reach: { near: -2.2, far: 5.5 },
  twist: 0.55,
  nearFoot: planted(10.0, -3),
  farFoot: onToes(REAR_TOE, -36),
  face: 'effort',
};
const STRIKE_ARM = posed(STRIKE_BODY, [-24, 22], [96, 8]);
const STRIKE: Pose = {
  ...STRIKE_ARM,
  effects: [
    smear(4.8, [22, 53], [32, 53], [43.5, 53.0]),
    { kind: 'blade', center: at(32, 53), rx: 11, ry: 4.5, tilt: -10, tone: 'sound' },
    { kind: 'star', center: at(44.2, 53.0), radius: 3.8, tone: 'strike' },
  ],
};

// Frame 4 (6 ticks): Retracting the rear arm into the forward guard position while the lead hand
// settles at the hip.
const RETRACT_BODY: Body = {
  ...GUARD,
  hip: at(-4.2, 35.4),
  torso: 16,
  head: 0,
  shrug: 1.2,
  reach: { near: -0.8, far: 1.5 },
  twist: 0.4,
  nearFoot: lifted(planted(7.8, 0), 0.6),
  farFoot: onToes(REAR_TOE, -22),
};
const RETRACT: Pose = posed(RETRACT_BODY, [-12, 32], [62, 54]);

// Frame 5 (6 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [COIL, TURN, SNAP, STRIKE, RETRACT, GUARD];
