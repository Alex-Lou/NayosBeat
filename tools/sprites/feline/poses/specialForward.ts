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

function withDragonLeg(body: Body, foot: Point, ankle = 88): Body {
  const withFoot: Body = {
    ...body,
    nearFoot: { x: foot.x, y: foot.y, angle: 0 },
    bends: { ...body.bends, nearKnee: 'up' },
  };
  return { ...withFoot, nearFoot: hung(withFoot, 'near', ankle) };
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

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** Where the chambered silver bracer gathers jade energy before the dragon lunge. */
export const CHAMBER_BRACER = at(6, 42);

// Frame 0 (3 ticks): Koda sinks into a low coil, crossing his silver gauntlets at his waist before
// the gliding Dragon Kick lunge.
const COIL_BODY: Body = {
  ...GUARD,
  hip: at(-6.5, 33.5),
  torso: 16,
  head: -1,
  shrug: 1.8,
  twist: 0.25,
  nearFoot: onToes(LEAD_TOE, -3),
  farFoot: onToes(REAR_TOE, -24),
};
const COIL: Pose = posed(COIL_BODY, [18, 96], [46, 84]);

// Frame 1 (3 ticks): Push-off from the rear foot as the lead knee chambers up and the silver
// gauntlets glow with jade resonance.
const PUSH_RAW: Body = {
  ...COIL_BODY,
  hip: at(-2.0, 35.5),
  torso: 8,
  head: 4,
  shrug: 2.2,
  twist: 0.3,
  nearFoot: at(10, 24),
  farFoot: planted(-12.0, -14),
};
const PUSH: Pose = {
  ...posed(withDragonLeg(PUSH_RAW, at(10, 24), 95), [22, 98], [52, 88]),
  effects: [dust(-12, 3.4, 0.2), energy(CHAMBER_BRACER.x, CHAMBER_BRACER.y, 2.8)],
  glows: [{ center: CHAMBER_BRACER, reach: 22, power: 0.9, tone: 'sound' }],
};

// Frame 2 (3 ticks): Gliding across the floor on the rear foot (`farFoot` stays on the ground so
// Koda never floats above his standing hurtbox), the lead knee driving high and forward.
const GLIDE_RAW: Body = {
  ...GUARD,
  hip: at(2.0, 37.0),
  torso: -2,
  head: 8,
  shrug: 2.6,
  twist: -0.2,
  nearFoot: at(22, 36),
  farFoot: planted(-8.0, -16),
  face: 'effort',
};
const GLIDE: Pose = {
  ...posed(withDragonLeg(GLIDE_RAW, at(22, 36), 90), [-12, 28], [62, 56]),
  effects: [
    dust(-8, 3.6, 0.5),
    smear(3.8, [10, 26], [16, 32], [23, 36]),
    { kind: 'ring', center: at(-8, 40), radius: 14, progress: 0.3, tone: 'sound', squash: 2.2 },
    { kind: 'speed', center: at(-12, 38), length: 12, spread: 5, direction: 0, tone: 'sound' },
  ],
};

// Frame 3 (3 ticks): The silver-greaved lead leg extends three-quarters out in a flying-style
// Dragon Side Kick while the rear foot skims the floor.
const DRIVE_RAW: Body = {
  ...GUARD,
  hip: at(5.5, 38.0),
  torso: -6,
  head: 10,
  shrug: 2.8,
  twist: -0.35,
  nearFoot: at(31.0, 40.5),
  farFoot: planted(-5.0, -14),
  face: 'effort',
};
const DRIVE: Pose = {
  ...posed(withDragonLeg(DRIVE_RAW, at(31.0, 40.5), 88), [-18, 24], [68, 42]),
  effects: [
    dust(-5, 3.2, 0.2),
    smear(4.2, [18, 36], [26, 39], [34, 41]),
    { kind: 'speed', center: at(-14, 36), length: 16, spread: 6, direction: 0, tone: 'sound' },
  ],
};

// Frame 4 (4 ticks, active ticks 12-15): Full Dragon Side-Kick & Twin-Blade Lunge! The silver
// shin-greave and heel shoot out to x = 37, y = 41.5, with the jade dragon-spear trail, speed cone
// and impact flash reaching x = 46..49 (hitbox 10..49, y 32..52).
const PIERCE_RAW: Body = {
  ...DRIVE_RAW,
  hip: at(6.5, 38.5),
  torso: -8,
  head: 12,
  shrug: 3.0,
  twist: -0.45,
  nearFoot: at(35.5, 41.5),
  farFoot: planted(-4.0, -12),
  face: 'kiai',
};
const PIERCE: Pose = {
  ...posed(withDragonLeg(PIERCE_RAW, at(35.5, 41.5), 88), [-22, 22], [74, 32]),
  effects: [
    smear(5.2, [20, 38], [31, 40.5], [43.5, 41.5]),
    { kind: 'ring', center: at(22, 42), radius: 15, progress: 0.22, tone: 'sound', squash: 2.2 },
    { kind: 'speed', center: at(-15, 35), length: 20, spread: 7, direction: 0, tone: 'sound' },
    { kind: 'flash', center: at(46.5, 41.5), radius: 5.5, tone: 'strike' },
    {
      kind: 'ring',
      center: at(42.0, 41.5),
      radius: 11,
      progress: 0.25,
      tone: 'sound',
      squash: 0.45,
    },
    dust(-4, 3.6, 0.5),
  ],
  glows: [{ center: at(42, 41.5), reach: 28, power: 1.3, tone: 'sound' }],
};

// Frame 5 (6 ticks): Re-chambering the Dragon Kick as the acoustic ring ripples in the air.
const RECOIL_RAW: Body = {
  ...GUARD,
  hip: at(1.5, 37.0),
  torso: 2,
  head: 4,
  shrug: 2.0,
  twist: -0.2,
  nearFoot: at(20.0, 28.0),
  farFoot: planted(-9.0, -12),
  face: 'effort',
};
const RECOIL: Pose = {
  ...posed(withDragonLeg(RECOIL_RAW, at(20.0, 28.0), 94), [14, 82], [48, 86]),
  effects: [
    { kind: 'ring', center: at(44, 41.5), radius: 12, progress: 0.65, tone: 'sound', squash: 1.8 },
    dust(-4, 3.6, 0.85),
  ],
};

// Frame 6 (6 ticks): Setting the lead foot back down into the martial stance.
const RISE_BODY: Body = {
  ...GUARD,
  hip: at(-4.8, 36.0),
  torso: 13,
  head: 2,
  shrug: 1.6,
  nearFoot: lifted(planted(8.0, 0), 0.8),
  farFoot: onToes(REAR_TOE, -18),
};
const RISE: Pose = posed(RISE_BODY, [24, 88], [38, 92]);

// Frame 7 (6 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [COIL, PUSH, GLIDE, DRIVE, PIERCE, RECOIL, RISE, GUARD];
