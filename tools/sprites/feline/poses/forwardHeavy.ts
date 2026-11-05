import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Foot, type Pose } from './common.ts';
import { hung } from './jump.ts';

/**
 * forwardHeavy (Fendoir d'émeraude / Overhead Axe Kick): 9 frames, 4, 4, 4, 4, 3, [3], 5, 5, 5
 * ticks (37), active frame 5 (ticks 19-21), hitbox x 12..40 / y 36..72, an overhead.
 * Instead of Nayo's overhand punch, Koda steps in on his rear leg, chambers his silver-greaved
 * lead leg high overhead like a guillotine blade (frames 2-4), and brings his heel crashing
 * straight down on frame 5 with a tall jade crescent blade arc and shockwave ring.
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

function withAxeLeg(body: Body, foot: Point, ankle = 88): Body {
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

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

// Frame 0 (4 ticks): Weight shifts onto the rear leg, hands crossing in front of the torso.
const COIL_BODY: Body = {
  ...GUARD,
  hip: at(-6.0, 35.5),
  torso: 12,
  head: 3,
  shrug: 1.5,
  twist: 0.25,
  nearFoot: planted(6.35, 3),
  farFoot: onToes(REAR_TOE + 2, -16),
};
const COIL: Pose = posed(COIL_BODY, [24, 90], [42, 86]);

// Frame 1 (4 ticks): Pivoting on the planted rear foot, the lead knee lifts sharply toward the
// chest as Koda leans back.
const LIFT_RAW: Body = {
  ...GUARD,
  hip: at(-2.0, 37.5),
  torso: 4,
  head: 6,
  shrug: 1.8,
  twist: 0.35,
  nearFoot: at(10, 28),
  farFoot: planted(-10.0, -6),
  face: 'focus',
};
const LIFT: Pose = posed(withAxeLeg(LIFT_RAW, at(10, 28), 94), [20, 96], [48, 92]);

// Frame 2 (4 ticks): The silver-greaved lead leg swings high up in front of his face (`y = 58`),
// tracing a rising crescent arc.
const CLIMB_RAW: Body = {
  ...GUARD,
  hip: at(1.5, 38.8),
  torso: -12,
  head: 14,
  shrug: 2.0,
  twist: -0.2,
  nearFoot: at(25, 54),
  farFoot: planted(-6.5, -8),
  face: 'focus',
};
const CLIMB: Pose = {
  ...posed(withAxeLeg(CLIMB_RAW, at(25, 54), 90), [-14, 28], [52, 96]),
  effects: [smear(3.8, [12, 34], [19, 44], [26, 54])],
};

// Frame 3 (4 ticks): Peak of the Axe Kick chamber! The lead leg reaches high overhead (`y = 62`),
// poised like a guillotine blade before the drop.
const TOP_RAW: Body = {
  ...GUARD,
  hip: at(3.0, 39.2),
  torso: -14,
  head: 16,
  shrug: 2.2,
  twist: -0.3,
  nearFoot: at(27, 62),
  farFoot: planted(-5.0, -8),
  face: 'effort',
};
const TOP: Pose = {
  ...posed(withAxeLeg(TOP_RAW, at(27, 62), 88), [-18, 24], [54, 98]),
  effects: [smear(4.2, [18, 46], [23, 55], [28, 63])],
};

// Frame 4 (3 ticks): Beginning the guillotine drop: the heel whips over the top and starts
// accelerating downward.
const OVER_RAW: Body = {
  ...GUARD,
  hip: at(4.5, 38.6),
  torso: -4,
  head: 8,
  shrug: 2.4,
  twist: -0.35,
  nearFoot: at(30, 60),
  farFoot: planted(-4.5, -8),
  face: 'effort',
};
const OVER: Pose = {
  ...posed(withAxeLeg(OVER_RAW, at(30, 60), 86), [-20, 22], [50, 94]),
  effects: [smear(4.8, [22, 67], [28, 65], [32, 59])],
};

// Frame 5 (3 ticks, active): The guillotine heel crashes down through the overhead hitbox
// (x 12..40, y 36..72)! A tall crescent blade trail, impact flash and acoustic ring frame the
// heel at x ~ 38, y ~ 46.
const IMPACT_RAW: Body = {
  ...GUARD,
  hip: at(5.5, 37.5),
  torso: 6,
  head: 0,
  shrug: 2.2,
  twist: -0.4,
  nearFoot: at(32.5, 44.0),
  farFoot: planted(-4.5, -10),
  face: 'kiai',
};
const IMPACT: Pose = {
  ...posed(withAxeLeg(IMPACT_RAW, at(32.5, 44.0), 86), [-16, 26], [46, 92]),
  effects: [
    smear(5.5, [22, 68], [30, 64], [36, 54], [38, 44]),
    { kind: 'flash', center: at(38.5, 44.0), radius: 5.5, tone: 'strike' },
    { kind: 'ring', center: at(37.0, 44.0), radius: 9, progress: 0.3, tone: 'sound', squash: 1.4 },
    dust(-4, 2.6, 0.2),
  ],
  glows: [{ center: at(37, 44), reach: 24, power: 1.0, tone: 'sound' }],
};

// Frame 6 (5 ticks): The heel follows through to the floor, kicking up dust as a low shockwave
// ripples outward.
const LAND_BODY: Body = {
  ...GUARD,
  hip: at(-1.5, 34.5),
  torso: 18,
  head: -3,
  shrug: 1.8,
  twist: -0.2,
  nearFoot: planted(12.0, -2),
  farFoot: onToes(REAR_TOE + 2, -24),
  face: 'effort',
};
const LAND: Pose = {
  ...posed(LAND_BODY, [18, 84], [42, 90]),
  effects: [
    { kind: 'ring', center: at(16, 2), radius: 12, progress: 0.45, tone: 'sound', squash: 0.3 },
    dust(14, 3.2, 0.35),
  ],
};

// Frame 7 (5 ticks): Stepping back into the open-palm martial guard.
const RISE_BODY: Body = {
  ...GUARD,
  hip: at(-5.2, 35.8),
  torso: 15,
  head: 1,
  shrug: 1.5,
  nearFoot: lifted(planted(8.0, 0), 0.8),
  farFoot: onToes(REAR_TOE, -18),
};
const RISE: Pose = {
  ...posed(RISE_BODY, [22, 88], [38, 92]),
  effects: [dust(14, 3.2, 0.8)],
};

// Frame 8 (5 ticks): Settled into GUARD.
export const POSES: readonly Pose[] = [COIL, LIFT, CLIMB, TOP, OVER, IMPACT, LAND, RISE, GUARD];
