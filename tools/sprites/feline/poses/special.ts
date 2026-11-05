import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, energy, GUARD, lifted, planted, smear, type Foot, type Pose } from './common.ts';
import { hung } from './jump.ts';

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

/** Where the silver bracers clash in front of the chest on frame 2. */
export const BRACER_CLASH = at(14, 46);

// Frame 0 (3 ticks): Koda opens his frock coat wide and shifts weight onto his rear leg.
const OPEN_BODY: Body = {
  ...GUARD,
  hip: at(-6.5, 35.8),
  torso: 10,
  head: 5,
  shrug: 2.0,
  twist: 0.35,
  nearFoot: planted(6.35, 2),
  farFoot: onToes(REAR_TOE + 2, -16),
};
const OPEN: Pose = posed(OPEN_BODY, [18, 96], [42, 88]);

// Frame 1 (3 ticks): Chambering the lead knee and crossing both silver gauntlets in front of his
// chest as jade resonance gathers.
const COIL_RAW: Body = {
  ...GUARD,
  hip: at(-2.0, 37.0),
  torso: 4,
  head: 6,
  shrug: 2.4,
  twist: 0.4,
  nearFoot: at(8, 22),
  farFoot: planted(-10.0, -6),
};
const COIL_ARMS = posed(withKick(COIL_RAW, at(8, 22), 95), [28, 98], [44, 92]);
const COIL: Pose = {
  ...COIL_ARMS,
  effects: [
    energy(COIL_ARMS.nearFist.x, COIL_ARMS.nearFist.y, 2.6),
    energy(COIL_ARMS.farFist.x, COIL_ARMS.farFist.y, 2.6),
  ],
  glows: [{ center: at(10, 48), reach: 24, power: 0.9, tone: 'sound' }],
};

// Frame 2 (4 ticks): Clashing the silver gauntlets as the silver-greaved lead leg whips up toward
// waist height!
const CLASH_RAW: Body = {
  ...GUARD,
  hip: at(2.0, 38.0),
  torso: -2,
  head: 8,
  shrug: 2.8,
  twist: -0.2,
  nearFoot: at(22, 38),
  farFoot: planted(-6.0, -8),
  face: 'effort',
};
const CLASH: Pose = {
  ...posed(withKick(CLASH_RAW, at(22, 38), 90), [36, 98], [40, 94]),
  effects: [
    smear(3.8, [8, 22], [15, 30], [23, 38]),
    energy(BRACER_CLASH.x, BRACER_CLASH.y, 3.8),
    { kind: 'ring', center: BRACER_CLASH, radius: 9, progress: 0.2, tone: 'sound', squash: 1.5 },
  ],
  glows: [{ center: BRACER_CLASH, reach: 28, power: 1.3, tone: 'sound' }],
};

// Frame 3 (4 ticks, active): Crescent Roundhouse + Twin-Blade Wave! Koda's silver-greaved leg
// whips across at y ~ 43 (`nearFoot` at `32.5, 42.5`), while his rear open knife-hand slashes
// forward to `x = 35, y = 46`, unleashing a wide crescent jade wave, twin concentric rings, and
// diamond shards across the hitbox (x 8..45, y 30..56).
const RELEASE_RAW: Body = {
  ...GUARD,
  hip: at(5.0, 38.5),
  torso: -6,
  head: 10,
  shrug: 2.4,
  twist: -0.35,
  nearFoot: at(30.5, 42.5),
  farFoot: planted(-4.5, -8),
  face: 'kiai',
};
const RELEASE: Pose = {
  ...posed(withKick(RELEASE_RAW, at(30.5, 42.5), 88), [-16, 26], [68, 36]),
  effects: [
    smear(5.0, [16, 36], [27, 41], [39.5, 43.5]),
    { kind: 'ring', center: at(22, 44), radius: 15, progress: 0.2, tone: 'sound', squash: 2.2 },
    { kind: 'ring', center: at(36, 44), radius: 16, progress: 0.25, tone: 'sound', squash: 0.45 },
    { kind: 'shards', center: at(38, 44), radius: 13, progress: 0.25, tone: 'strike' },
    { kind: 'flash', center: at(41, 44.0), radius: 5.5, tone: 'strike' },
    { kind: 'dust', x: -4, size: 2.8, progress: 0.2 },
  ],
  glows: [{ center: at(34, 44), reach: 32, power: 1.4, tone: 'sound' }],
};

// Frame 4 (5 ticks): Follow-through of the crescent kick as the jade rings expand in the air.
const ECHO_RAW: Body = {
  ...RELEASE_RAW,
  hip: at(3.5, 38.0),
  torso: -2,
  head: 6,
  nearFoot: at(25.0, 36.0),
  farFoot: planted(-7.0, -8),
  face: 'effort',
};
const ECHO: Pose = {
  ...posed(withKick(ECHO_RAW, at(25.0, 36.0), 92), [-10, 30], [58, 52]),
  effects: [
    { kind: 'ring', center: at(39, 44), radius: 18, progress: 0.65, tone: 'sound', squash: 1.6 },
    { kind: 'speed', center: at(28, 44), length: 8, spread: 4, direction: 0, tone: 'sound' },
    { kind: 'dust', x: -4, size: 2.8, progress: 0.6 },
  ],
  glows: [{ center: at(36, 44), reach: 26, power: 0.8, tone: 'sound' }],
};

// Frame 5 (5 ticks): Setting the kicking leg back down toward the front mark.
const RETRACT_BODY: Body = {
  ...GUARD,
  hip: at(-3.5, 36.2),
  torso: 11,
  head: 2,
  shrug: 1.6,
  nearFoot: lifted(planted(8.0, 0), 1.2),
  farFoot: onToes(REAR_TOE, -18),
  effects: [{ kind: 'dust', x: -4, size: 2.8, progress: 0.9 }],
};
const RETRACT: Pose = posed(RETRACT_BODY, [22, 86], [38, 92]);

// Frame 6 (5 ticks): Settling back into the open-palm stance.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-6.8, 36.0),
  torso: 14,
  head: 2,
  shrug: 1.8,
  nearFist: at(8.6, 47.4),
  farFist: at(9.6, 61.8),
};

// Frame 7 (5 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [OPEN, COIL, CLASH, RELEASE, ECHO, RETRACT, SETTLE, GUARD];
