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

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** Where the chambered silver bracer gathers jade energy before the spear-lunge. */
export const CHAMBER_BRACER = at(2, 42);

// Frame 0 (3 ticks): Koda sinks into his stance and chambers his lead silver bracer back at his
// hip while his rear open palm extends to sight the line of the lunge.
const COIL_BODY: Body = {
  ...GUARD,
  hip: at(-7.2, 33.0),
  torso: 18,
  head: -1,
  shrug: 1.8,
  twist: -0.35,
  nearHand: 'open',
  farHand: 'open',
  nearFoot: onToes(LEAD_TOE, -3),
  farFoot: onToes(REAR_TOE, -26),
};
const COIL: Pose = posed(COIL_BODY, [-18, 96], [56, 48]);

// Frame 1 (3 ticks): Push-off from the rear foot, the lead foot skimming low over the floor as the
// silver bracer charges with jade light at his waist.
const PUSH_BODY: Body = {
  ...COIL_BODY,
  hip: at(-5.5, 31.5),
  torso: 22,
  head: -4,
  shrug: 2.2,
  twist: -0.5,
  nearFoot: lifted(onToes(LEAD_TOE + 3, 4), 1.2),
  farFoot: onToes(REAR_TOE - 4, -34),
};
const PUSH: Pose = {
  ...posed(PUSH_BODY, [-14, 102], [52, 56]),
  effects: [dust(REAR_TOE - 4, 3.4, 0.2), energy(CHAMBER_BRACER.x, CHAMBER_BRACER.y, 2.6)],
  glows: [{ center: CHAMBER_BRACER, reach: 22, power: 0.9, tone: 'sound' }],
};

// Frame 2 (3 ticks): Gliding low across the ground (the rear foot stays near the floor so his body
// never floats above his standing hurtbox), the rear arm sweeping back as the lead silver bracer
// begins to uncoil forward.
const GLIDE_BODY: Body = {
  ...GUARD,
  hip: at(-3.0, 30.5),
  torso: 25,
  head: -6,
  shrug: 2.6,
  reach: { near: 1.5, far: -1.5 },
  twist: -0.25,
  nearHand: 'open',
  farHand: 'open',
  nearFoot: lifted(onToes(LEAD_TOE + 5, 2), 0.8),
  farFoot: onToes(REAR_TOE - 5, -38),
  face: 'effort',
};
const GLIDE: Pose = {
  ...posed(GLIDE_BODY, [36, 74], [-22, 18]),
  effects: [
    dust(REAR_TOE - 8, 3.6, 0.5),
    smear(3.5, [2, 42], [12, 42.5], [22, 42]),
    { kind: 'speed', center: at(-12, 38), length: 12, spread: 5, direction: 0, tone: 'sound' },
  ],
};

// Frame 3 (3 ticks): The front foot stamps down into the deep martial lunge, the lead silver
// vambrace and spear-palm three-quarters extended down the line.
const DRIVE_BODY: Body = {
  ...GUARD,
  hip: at(-1.0, 29.8),
  torso: 27,
  head: -8,
  shrug: 3.0,
  reach: { near: 2.8, far: -2.0 },
  twist: -0.4,
  nearHand: 'open',
  farHand: 'open',
  nearFoot: planted(11.5),
  farFoot: onToes(REAR_TOE - 2, -42),
  face: 'effort',
};
const DRIVE: Pose = {
  ...DRIVE_BODY,
  nearFist: at(31.5, 42.0),
  farFist: arm(DRIVE_BODY, 'far', -24, 16).fist,
  bends: { nearElbow: 'down', farElbow: arm(DRIVE_BODY, 'far', -24, 16).bend },
  effects: [
    dust(12, 3.2, 0.2),
    smear(4, [14, 42], [23, 42], [33.5, 42]),
    { kind: 'speed', center: at(-14, 36), length: 16, spread: 6, direction: 0, tone: 'sound' },
  ],
};

// Frame 4 (4 ticks, active ticks 12-15): Full grounded Fente d'acier lunge! The lead silver
// vambrace and open spear-palm reach x = 44 (hitbox 10..44, y 32..52), the rear arm swept back
// along the coat tails as a counterweight, a jade speed cone and impact flash framing the palm.
const PIERCE_BODY: Body = {
  ...DRIVE_BODY,
  hip: at(0.5, 29.2),
  torso: 29,
  head: -10,
  shrug: 3.2,
  reach: { near: 3.6, far: -2.2 },
  twist: -0.45,
  nearFoot: planted(12.0),
  farFoot: onToes(REAR_TOE, -44),
  face: 'kiai',
};
const PIERCE: Pose = {
  ...PIERCE_BODY,
  nearFist: at(39.2, 41.5),
  farFist: arm(PIERCE_BODY, 'far', -26, 14).fist,
  bends: { nearElbow: 'down', farElbow: arm(PIERCE_BODY, 'far', -26, 14).bend },
  effects: [
    smear(5, [16, 42], [27, 41.8], [41.5, 41.5]),
    { kind: 'speed', center: at(-15, 35), length: 20, spread: 7, direction: 0, tone: 'sound' },
    { kind: 'flash', center: at(42.5, 41.5), radius: 5.5, tone: 'strike' },
    dust(13, 3.6, 0.5),
  ],
  glows: [{ center: at(41, 41.5), reach: 28, power: 1.3, tone: 'sound' }],
};

// Frame 5 (6 ticks): A standing acoustic ring ripples where the spear-palm pierced the air as Koda
// draws his lead arm and front foot back.
const RECOIL_BODY: Body = {
  ...GUARD,
  hip: at(-3.2, 32.5),
  torso: 21,
  head: -3,
  shrug: 2.2,
  reach: { near: 1.6, far: -1.0 },
  twist: -0.25,
  nearHand: 'open',
  farHand: 'open',
  nearFoot: planted(9.0),
  farFoot: onToes(REAR_TOE, -28),
  face: 'effort',
};
const RECOIL: Pose = {
  ...RECOIL_BODY,
  nearFist: at(22.5, 45.5),
  farFist: at(8.5, 53.0),
  bends: { nearElbow: 'down', farElbow: 'down' },
  effects: [
    { kind: 'ring', center: at(41, 41.5), radius: 8, progress: 0.55, tone: 'sound', squash: 1.8 },
    dust(13, 3.6, 0.85),
  ],
};

// Frame 6 (6 ticks): Rising back into the open-palm stance.
const RISE: Pose = {
  ...GUARD,
  hip: at(-6.2, 36.0),
  torso: 15,
  head: 2,
  shrug: 1.8,
  nearFist: at(10.5, 50.8),
  farFist: at(9.6, 60.5),
};

// Frame 7 (6 ticks): The idle's last frame.
const IDLE_END: Pose = {
  ...GUARD,
  shrug: 1.68,
  nearFist: at(8.7, 52.4),
  farFist: at(9.9, 61.5),
};

/**
 * specialForward (Fente d'acier): a grounded martial-arts spear-palm lunge with the silver
 * vambrace, 8 frames, ticks 3, 3, 3, 3, [4], 6, 6, 6 (34 ticks: 12/4/18).
 */
export const POSES: readonly Pose[] = [COIL, PUSH, GLIDE, DRIVE, PIERCE, RECOIL, RISE, IDLE_END];
