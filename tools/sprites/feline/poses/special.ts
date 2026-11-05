import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, energy, GUARD, lifted, planted, smear, type Foot, type Pose } from './common.ts';

/**
 * special (Lame de portail, S, `05_Lame_de_Portail/01..06` & `Pack_05/fx_02_arc_orbital.png`):
 * 8 frames, ticks 3, 3, 4, [4], 5, 5, 5, 5 (34 ticks, active: frame 3, hitbox x 8..45 / y 30..56).
 * Completely distinct from Koda's kick: Feline stays grounded (`02_invocation` -> `03_lame_initiale`
 * -> `04_lame_formee` -> `05_lame_projetee`), summons a vertical silver-white dimensional portal in
 * front of her (`kind: 'portal'`), and slashes her open claw-hand across to project a sweeping
 * orbital crescent portal blade (`kind: 'blade'`) and 8-point star impact (`kind: 'star'`).
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

/** Where the portal rift forms in front of her chest on frame 2 (used by remixes.ts). */
export const BRACER_CLASH = at(14, 46);

// Frame 0 (`01_garde.png`, 3 ticks): Feline shifts weight and opens her claw-hands to summon the portal.
const OPEN_BODY: Body = {
  ...GUARD,
  hip: at(-6.2, 35.8),
  torso: 11,
  head: 4,
  shrug: 1.6,
  twist: 0.3,
  nearFoot: planted(6.35, 2),
  farFoot: onToes(REAR_TOE + 2, -16),
  nearHand: 'open',
  farHand: 'open',
};
const OPEN: Pose = posed(OPEN_BODY, [22, 92], [44, 86]);

// Frame 1 (`02_invocation.png`, 3 ticks): Stepping forward as a vertical dimensional rift begins to
// open in front of her hands.
const COIL_BODY: Body = {
  ...OPEN_BODY,
  hip: at(-3.5, 35.2),
  torso: 14,
  head: 2,
  shrug: 2.0,
  twist: 0.35,
  nearFoot: planted(8.5, 0),
  farFoot: onToes(REAR_TOE, -22),
};
const COIL_ARMS = posed(COIL_BODY, [34, 88], [52, 82]);
const COIL: Pose = {
  ...COIL_ARMS,
  effects: [
    { kind: 'portal', center: at(14, 45), rx: 4.5, ry: 15, tone: 'sound' },
    energy(COIL_ARMS.nearFist.x, COIL_ARMS.nearFist.y, 2.5),
  ],
  glows: [{ center: at(14, 45), reach: 24, power: 0.9, tone: 'sound' }],
};

// Frame 2 (`03_lame_initiale.png`, 4 ticks): The vertical portal opens wide at x = 16, y = 44 and
// the silver-white orbital blade forms inside it as Feline cocks her claw-hand across her chest.
const CLASH_BODY: Body = {
  ...OPEN_BODY,
  hip: at(-1.5, 34.8),
  torso: 17,
  head: -1,
  shrug: 2.4,
  twist: -0.25,
  nearFoot: planted(10.0, 0),
  farFoot: onToes(REAR_TOE, -26),
  face: 'effort',
};
const CLASH: Pose = {
  ...posed(CLASH_BODY, [64, 48], [26, 94]),
  effects: [
    { kind: 'portal', center: at(15, 44), rx: 5.5, ry: 18, tone: 'sound' },
    { kind: 'blade', center: at(18, 44), rx: 10, ry: 4.5, tilt: -14, tone: 'sound' },
  ],
  glows: [{ center: BRACER_CLASH, reach: 28, power: 1.3, tone: 'sound' }],
};

// Frame 3 (`04_lame_formee.png` / `05_lame_projetee.png`, 4 ticks, active): Feline lunges on her
// front foot and slashes her open claw-hand forward to x = 39.5, projecting a sweeping twin orbital
// portal blade (`kind: 'blade'`) and an 8-point star burst (`kind: 'star'`) across x 8..45, y 30..56!
const RELEASE_BODY: Body = {
  ...OPEN_BODY,
  hip: at(1.2, 34.2),
  torso: 22,
  head: -5,
  shrug: 3.0,
  reach: { near: 3.6, far: -1.8 },
  twist: -0.45,
  nearFoot: planted(11.5, -2),
  farFoot: onToes(REAR_TOE, -32),
  face: 'kiai',
};
const RELEASE: Pose = {
  ...posed(RELEASE_BODY, [94, 8], [-18, 26]),
  effects: [
    smear(4.8, [16, 44], [27, 43.5], [39.5, 43.5]),
    { kind: 'portal', center: at(14, 44), rx: 5.5, ry: 18, tone: 'sound' },
    {
      kind: 'blade',
      center: at(25, 43.5),
      rx: 15.5,
      ry: 6.5,
      tilt: -12,
      from: -105,
      to: 105,
      twin: true,
      tone: 'sound',
    },
    { kind: 'star', center: at(40.5, 43.5), radius: 5.0, tone: 'strike' },
    { kind: 'dust', x: 10, size: 2.8, progress: 0.2 },
  ],
  glows: [{ center: at(34, 44), reach: 32, power: 1.4, tone: 'sound' }],
};

// Frame 4 (`05_lame_projetee.png`, 5 ticks): Follow-through as the projected orbital portal blade
// dissipates in a shower of silver-white star fragments.
const ECHO_BODY: Body = {
  ...RELEASE_BODY,
  hip: at(0.0, 34.6),
  torso: 19,
  head: -3,
  reach: { near: 2.2, far: -1.2 },
  twist: -0.3,
  face: 'effort',
};
const ECHO: Pose = {
  ...posed(ECHO_BODY, [84, 22], [-12, 32]),
  effects: [
    { kind: 'blade', center: at(28, 43.5), rx: 14, ry: 5.5, tilt: -8, tone: 'sound' },
    { kind: 'shards', center: at(36, 43.5), radius: 12, progress: 0.6, tone: 'sound' },
    { kind: 'dust', x: 10, size: 2.8, progress: 0.6 },
  ],
  glows: [{ center: at(36, 44), reach: 26, power: 0.8, tone: 'sound' }],
};

// Frame 5 (`06_retour_garde.png`, 5 ticks): Stepping back toward her guard mark.
const RETRACT_BODY: Body = {
  ...GUARD,
  hip: at(-3.8, 35.8),
  torso: 14,
  head: 1,
  shrug: 1.6,
  nearFoot: lifted(planted(8.0, 0), 1.0),
  farFoot: onToes(REAR_TOE, -20),
  effects: [{ kind: 'dust', x: 10, size: 2.8, progress: 0.9 }],
};
const RETRACT: Pose = posed(RETRACT_BODY, [36, 78], [44, 88]);

// Frame 6 (5 ticks): Settling back into the feline boxer-kickboxer guard.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-6.8, 36.0),
  torso: 13.5,
  head: 2,
  shrug: 1.4,
  nearFist: at(8.6, 51.8),
  farFist: at(9.4, 58.0),
};

// Frame 7 (5 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [OPEN, COIL, CLASH, RELEASE, ECHO, RETRACT, SETTLE, GUARD];
