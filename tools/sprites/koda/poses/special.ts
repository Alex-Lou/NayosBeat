import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, energy, GUARD, lifted, planted, smear, type Foot, type Pose } from './common.ts';

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

/** Where the silver bracers clash in front of the chest on frame 2. */
export const BRACER_CLASH = at(14, 46);

// Frame 0 (3 ticks): Koda opens both arms wide from his martial stance, his frock coat parting
// across his bare chest as the silver vambraces begin to hum.
const OPEN_BODY: Body = {
  ...GUARD,
  hip: at(-7.6, 35.4),
  torso: 10,
  head: 5,
  shrug: 2.0,
  twist: -0.45,
  nearHand: 'open',
  farHand: 'open',
  nearFoot: onToes(LEAD_TOE, -4),
  farFoot: onToes(REAR_TOE, -16),
};
const OPEN: Pose = posed(OPEN_BODY, [18, 96], [42, 88]);

// Frame 1 (3 ticks): Deep coil on the rear leg, both silver bracers raised and glowing with jade
// acoustic energy before the clash.
const COIL_BODY: Body = {
  ...OPEN_BODY,
  hip: at(-9.0, 33.8),
  torso: 8,
  head: 7,
  shrug: 2.6,
  twist: -0.7,
  nearFoot: onToes(LEAD_TOE, -8),
  farFoot: onToes(REAR_TOE, -24),
};
const COIL_ARMS = posed(COIL_BODY, [-12, 92], [50, 98]);
const COIL: Pose = {
  ...COIL_ARMS,
  effects: [
    energy(COIL_ARMS.nearFist.x, COIL_ARMS.nearFist.y, 2.6),
    energy(COIL_ARMS.farFist.x, COIL_ARMS.farFist.y, 2.6),
  ],
  glows: [{ center: at(10, 48), reach: 24, power: 0.9, tone: 'sound' }],
};

// Frame 2 (4 ticks): Koda steps forward and clashes his two silver forearm bracers together in
// front of his chest, sparks and a tuning ring igniting at the point of impact.
const CLASH_BODY: Body = {
  ...GUARD,
  hip: at(-6.2, 33.2),
  torso: 16,
  head: 2,
  shrug: 2.8,
  twist: 0.1,
  nearHand: 'open',
  farHand: 'open',
  nearFoot: planted(9.0),
  farFoot: onToes(REAR_TOE, -28),
  face: 'effort',
};
const CLASH_ARMS = posed(CLASH_BODY, [34, 98], [38, 94]);
const CLASH: Pose = {
  ...CLASH_ARMS,
  effects: [
    smear(
      3,
      [COIL_ARMS.nearFist.x, COIL_ARMS.nearFist.y],
      [8, 44],
      [BRACER_CLASH.x, BRACER_CLASH.y],
    ),
    energy(BRACER_CLASH.x, BRACER_CLASH.y, 3.8),
    { kind: 'ring', center: BRACER_CLASH, radius: 9, progress: 0.2, tone: 'sound', squash: 1.5 },
  ],
  glows: [{ center: BRACER_CLASH, reach: 28, power: 1.3, tone: 'sound' }],
};

// Frame 3 (4 ticks, active ticks 10-13): From the clashed silver bracers, Koda thrusts his lead
// open palm and rear forearm out in a twin acoustic push, sending concentric jade shockwave rings
// and diamond shards across the hitbox (x 8..42, y 30..56).
const RELEASE_BODY: Body = {
  ...GUARD,
  hip: at(-2.5, 33.5),
  torso: 22,
  head: -3,
  shrug: 2.2,
  reach: { near: 3.6, far: 1.8 },
  twist: -0.35,
  nearHand: 'open',
  farHand: 'open',
  nearFoot: planted(11.5),
  farFoot: onToes(REAR_TOE, -32),
  face: 'kiai',
};
const RELEASE: Pose = {
  ...RELEASE_BODY,
  nearFist: at(35.0, 44.5),
  farFist: at(24.0, 41.0),
  bends: { nearElbow: 'down', farElbow: 'down' },
  effects: [
    smear(4.5, [14, 46], [26, 45], [38.5, 44.5]),
    { kind: 'ring', center: at(36, 44), radius: 14, progress: 0.25, tone: 'sound', squash: 1.6 },
    { kind: 'ring', center: at(28, 44), radius: 10, progress: 0.45, tone: 'sound', squash: 1.6 },
    { kind: 'shards', center: at(38, 44), radius: 12, progress: 0.25, tone: 'strike' },
    { kind: 'flash', center: at(40, 44.5), radius: 4.5, tone: 'strike' },
    { kind: 'dust', x: 12, size: 2.8, progress: 0.2 },
  ],
  glows: [{ center: at(34, 44), reach: 32, power: 1.4, tone: 'sound' }],
};

// Frame 4 (5 ticks): Follow-through as the acoustic rings expand and fade in the air ahead of his
// open palm.
const ECHO: Pose = {
  ...RELEASE,
  hip: at(-3.2, 34.0),
  torso: 20,
  head: -1,
  nearFist: at(32.5, 45.0),
  farFist: at(20.5, 43.0),
  face: 'effort',
  effects: [
    { kind: 'ring', center: at(39, 44), radius: 18, progress: 0.65, tone: 'sound', squash: 1.6 },
    { kind: 'speed', center: at(28, 44), length: 8, spread: 4, direction: 0, tone: 'sound' },
    { kind: 'dust', x: 12, size: 2.8, progress: 0.6 },
  ],
  glows: [{ center: at(36, 44), reach: 26, power: 0.8, tone: 'sound' }],
};

// Frame 5 (5 ticks): Drawing the silver bracers back toward the chest as the front foot steps home.
const RETRACT: Pose = {
  ...GUARD,
  hip: at(-5.2, 35.2),
  torso: 16,
  head: 1,
  shrug: 1.6,
  reach: { near: 1.0, far: 0.5 },
  twist: -0.15,
  nearFist: at(18.0, 48.5),
  farFist: at(13.5, 55.0),
  nearFoot: lifted(planted(8.0, -3), 1),
  farFoot: onToes(REAR_TOE, -18),
  effects: [{ kind: 'dust', x: 12, size: 2.8, progress: 0.9 }],
};

// Frame 6 (5 ticks): Settling back into the open-palm stance.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-6.8, 36.8),
  torso: 14,
  head: 3,
  shrug: 1.9,
  nearFist: at(8.8, 52.6),
  farFist: at(10.0, 61.0),
};

// Frame 7 (5 ticks): The idle's last frame, flowing seamlessly into the idle loop.
const IDLE_END: Pose = {
  ...GUARD,
  shrug: 1.68,
  nearFist: at(8.7, 52.4),
  farFist: at(9.9, 61.5),
};

/**
 * special (Diapason): Koda parts his frock coat, clashes his two silver forearm bracers together,
 * and thrusts both open palms forward to project a wide jade acoustic shockwave. 8 frames, ticks
 * 3, 3, 4, [4], 5, 5, 5, 5 (34 ticks: 10/4/20).
 */
export const POSES: readonly Pose[] = [OPEN, COIL, CLASH, RELEASE, ECHO, RETRACT, SETTLE, IDLE_END];
