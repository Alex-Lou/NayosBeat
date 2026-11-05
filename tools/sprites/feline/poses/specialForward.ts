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
 * specialForward (Rush dimensionnel, → + S, `04_Teleportation_Offensive_Rush/01..08` &
 * `06_Combo_Enchainement_Portails/07_frappe_finale.png`):
 * 8 frames, ticks 3, 3, 3, 3, [4], 6, 6, 6 (34 ticks, active: frame 4, hitbox x 10..49 / y 32..52).
 * Feline coils in front of an entry portal (`02_portail_entree.png`), bursts out of an exit portal
 * with horizontal portal speed-beams (`04_portail_sortie.png` -> `06_rush_01.png`) in a low
 * predator dash, and slashes through the target with twin intersecting orbital blades
 * (`07_frappe_finale.png`) and an 8-point star burst (`08_impact.png`).
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

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** Where the entry portal gathers astral energy on frame 1 (used by remixes.ts). */
export const CHAMBER_BRACER = at(6, 42);

// Frame 0 (`01_preparation.png`, 3 ticks): Feline drops into a low predator crouch.
const COIL_BODY: Body = {
  ...GUARD,
  hip: at(-6.5, 32.5),
  torso: 22,
  head: -6,
  shrug: 1.8,
  twist: 0.2,
  nearFoot: onToes(LEAD_TOE, -3),
  farFoot: onToes(REAR_TOE, -26),
};
const COIL: Pose = posed(COIL_BODY, [22, 92], [44, 86]);

// Frame 1 (`02_portail_entree.png`, 3 ticks): An entry portal opens right in front of her as she
// springs off her rear toes.
const PUSH_BODY: Body = {
  ...COIL_BODY,
  hip: at(-3.0, 32.0),
  torso: 28,
  head: -10,
  shrug: 2.2,
  twist: -0.15,
  nearFoot: planted(9.0, 0),
  farFoot: onToes(REAR_TOE + 3, -34),
};
const PUSH: Pose = {
  ...posed(PUSH_BODY, [48, 68], [-14, 28]),
  effects: [
    dust(-12, 3.4, 0.2),
    { kind: 'portal', center: at(8, 42), rx: 5.5, ry: 18, tone: 'sound' },
    energy(CHAMBER_BRACER.x, CHAMBER_BRACER.y, 2.8),
  ],
  glows: [{ center: CHAMBER_BRACER, reach: 24, power: 1.0, tone: 'sound' }],
};

// Frame 2 (`04_portail_sortie.png` / `05_reapparition.png`, 3 ticks): Bursting out of the exit
// portal with horizontal speed-beams (`beams: true`) in a low feline sprint!
const GLIDE_BODY: Body = {
  ...GUARD,
  hip: at(-0.5, 31.2),
  torso: 32,
  head: -14,
  shrug: 2.6,
  twist: -0.25,
  nearFoot: lifted(planted(13.5, 4), 0.6),
  farFoot: onToes(REAR_TOE + 5, -42),
  face: 'effort',
};
const GLIDE: Pose = {
  ...posed(GLIDE_BODY, [68, 42], [-20, 22]),
  effects: [
    dust(-8, 3.6, 0.5),
    { kind: 'portal', center: at(-10, 40), rx: 6.0, ry: 19, beams: true, tone: 'sound' },
    { kind: 'speed', center: at(-8, 38), length: 16, spread: 6, direction: 0, tone: 'sound' },
  ],
};

// Frame 3 (`06_rush_01.png` / `07_rush_02.png`, 3 ticks): Full predator rush, rear arm swept back
// past her hip pocket, lead claw-hand charging forward with an orbital blade wake!
const DRIVE_BODY: Body = {
  ...GLIDE_BODY,
  hip: at(1.5, 31.5),
  torso: 30,
  head: -12,
  shrug: 2.8,
  reach: { near: 2.4, far: -1.8 },
  twist: -0.35,
  nearFoot: planted(12.0, 0),
  farFoot: onToes(REAR_TOE + 6, -38),
  face: 'effort',
};
const DRIVE: Pose = {
  ...posed(DRIVE_BODY, [84, 20], [-24, 20]),
  nearHand: 'open',
  effects: [
    dust(-5, 3.2, 0.2),
    smear(4.2, [16, 40], [26, 41], [35, 41.5]),
    { kind: 'blade', center: at(18, 41), rx: 13, ry: 5.5, tilt: -18, tone: 'sound' },
    { kind: 'speed', center: at(-12, 36), length: 18, spread: 6, direction: 0, tone: 'sound' },
  ],
};

// Frame 4 (`07_frappe_finale.png` / `08_impact.png`, 4 ticks, active ticks 12-15): Full dimensional
// rush slash! Feline's claw-hand slices out to x = 41.5, y = 41.5 while twin intersecting orbital
// blades (`twin: true`) and an 8-point star burst (`kind: 'star'`) reach x = 46..49 (hitbox 10..49,
// y 32..52).
const PIERCE_BODY: Body = {
  ...DRIVE_BODY,
  hip: at(3.2, 32.0),
  torso: 28,
  head: -10,
  shrug: 3.2,
  reach: { near: 4.5, far: -2.2 },
  twist: -0.45,
  nearFoot: planted(12.5, -2),
  farFoot: onToes(REAR_TOE + 7, -36),
  face: 'kiai',
};
const PIERCE: Pose = {
  ...posed(PIERCE_BODY, [96, 6], [-26, 18]),
  nearHand: 'open',
  effects: [
    smear(5.2, [20, 40], [31, 41], [43.5, 41.5]),
    {
      kind: 'blade',
      center: at(27, 41.5),
      rx: 16.5,
      ry: 6.5,
      tilt: -18,
      from: -110,
      to: 110,
      twin: true,
      tone: 'sound',
    },
    { kind: 'speed', center: at(-14, 35), length: 20, spread: 7, direction: 0, tone: 'sound' },
    { kind: 'star', center: at(44.5, 41.5), radius: 5.0, tone: 'strike' },
    dust(-4, 3.6, 0.5),
  ],
  glows: [{ center: at(42, 41.5), reach: 28, power: 1.3, tone: 'sound' }],
};

// Frame 5 (`08_recuperation.png`, 6 ticks): Braking from the rush as the orbital blades fade.
const RECOIL_BODY: Body = {
  ...GUARD,
  hip: at(-1.5, 34.0),
  torso: 20,
  head: -4,
  shrug: 2.0,
  twist: -0.2,
  nearFoot: planted(10.0, 0),
  farFoot: onToes(REAR_TOE + 3, -26),
  face: 'effort',
};
const RECOIL: Pose = {
  ...posed(RECOIL_BODY, [56, 52], [28, 88]),
  effects: [
    { kind: 'blade', center: at(30, 41.5), rx: 14, ry: 5.5, tilt: -14, tone: 'sound' },
    dust(-4, 3.6, 0.85),
  ],
};

// Frame 6 (6 ticks): Rising back into her boxer-kickboxer guard.
const RISE_BODY: Body = {
  ...GUARD,
  hip: at(-4.8, 35.8),
  torso: 15,
  head: 1,
  shrug: 1.4,
  nearFoot: lifted(planted(7.8, 0), 0.8),
  farFoot: onToes(REAR_TOE, -18),
};
const RISE: Pose = posed(RISE_BODY, [34, 82], [44, 88]);

// Frame 7 (6 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [COIL, PUSH, GLIDE, DRIVE, PIERCE, RECOIL, RISE, GUARD];
