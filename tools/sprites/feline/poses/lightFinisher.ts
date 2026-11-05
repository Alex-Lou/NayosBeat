import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Foot, type Pose } from './common.ts';
import { hung } from './jump.ts';

/**
 * lightFinisher (Fouet lunaire, L, L, L, `03_Coups_de_Pied/05_chambre_du_coup.png` ->
 * `07_coup_de_pied_haut_tendu.png` -> `08_repli_haut.png`):
 * 7 frames, 2, 3, 3, [3], 5, 6, 7 ticks (29), active frame 3 (ticks 8-10), hitbox x 10..48 / y 44..62.
 * Feline steps in out of `Direct félin`, chambers her knee high (`05_chambre_du_coup.png`), and
 * whips a full high roundhouse kick (`07_coup_de_pied_haut_tendu.png`) with an orbital crescent
 * blade (`kind: 'blade'`) and 8-point star burst (`kind: 'star'`) that floors the opponent!
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

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

// Frame 0 (2 ticks): Stepping onto the rear foot out of chainLight.
const STEP_BODY: Body = {
  ...GUARD,
  hip: at(-4.5, 35.8),
  torso: 12,
  head: 2,
  shrug: 1.6,
  twist: 0.25,
  nearFoot: lifted(planted(8.5, 2), 1.4),
  farFoot: onToes(REAR_TOE + 2, -18),
};
const STEP: Pose = posed(STEP_BODY, [28, 94], [42, 90]);

// Frame 1 (`05_chambre_du_coup.png`, 3 ticks): High chambered knee in front of the chest, both
// gloved fists held tight in guard.
const CHAMBER_RAW: Body = {
  ...GUARD,
  hip: at(-0.5, 37.5),
  torso: 4,
  head: 6,
  shrug: 1.8,
  twist: 0.35,
  nearFoot: at(12, 30),
  farFoot: planted(-9.0, -8),
  face: 'focus',
};
const CROSS: Pose = {
  ...posed(withKick(CHAMBER_RAW, at(12, 30), 95), [32, 96], [46, 92]),
  effects: [dust(-9, 2.5, 0.2)],
};

// Frame 2 (`06_coup_de_pied_horizontal.png`, 3 ticks): The leg whips outward toward head height.
const WHIP_RAW: Body = {
  ...GUARD,
  hip: at(3.5, 38.5),
  torso: -4,
  head: 10,
  shrug: 2.0,
  twist: -0.2,
  nearFoot: at(26, 46),
  farFoot: planted(-5.5, -8),
  face: 'effort',
};
const WHIP: Pose = {
  ...posed(withKick(WHIP_RAW, at(26, 46), 90), [34, 96], [48, 94]),
  effects: [smear(4.0, [12, 32], [20, 40], [28, 46]), dust(-5, 2.5, 0.55)],
};

// Frame 3 (`07_coup_de_pied_haut_tendu.png`, 3 ticks, active): Full high roundhouse whip kick!
// Leg extended to x = 35.5, y = 51.0 with orbital crescent blade (`blade`) and 8-point star burst
// (`star`) reaching x = 48 (hitbox 10..48, y 44..62).
const IMPACT_RAW: Body = {
  ...GUARD,
  hip: at(6.0, 39.0),
  torso: -8,
  head: 12,
  shrug: 2.2,
  twist: -0.35,
  nearFoot: at(35.0, 50.5),
  farFoot: planted(-4.5, -8),
  face: 'kiai',
};
const IMPACT: Pose = {
  ...posed(withKick(IMPACT_RAW, at(35.0, 50.5), 88), [36, 98], [50, 96]),
  effects: [
    smear(5.0, [16, 40], [27, 46], [40.5, 51.0]),
    { kind: 'blade', center: at(30, 50), rx: 14, ry: 6, tilt: -18, twin: true, tone: 'sound' },
    { kind: 'star', center: at(43.5, 51.5), radius: 4.5, tone: 'strike' },
    { kind: 'shards', center: at(41.5, 51.5), radius: 9, progress: 0.3, tone: 'sound' },
  ],
  glows: [{ center: at(40, 51.5), reach: 28, power: 1.2, tone: 'sound' }],
};

// Frame 4 (`08_repli_haut.png`, 5 ticks): Re-chambering the high kick as the orbital blade fades.
const THROUGH_RAW: Body = {
  ...IMPACT_RAW,
  hip: at(3.5, 38.0),
  torso: -3,
  head: 8,
  nearFoot: at(26.0, 42.0),
  farFoot: planted(-6.5, -8),
  face: 'effort',
};
const THROUGH: Pose = {
  ...posed(withKick(THROUGH_RAW, at(26.0, 42.0), 92), [32, 96], [46, 92]),
  effects: [{ kind: 'blade', center: at(33, 51), rx: 12, ry: 5, tilt: -14, tone: 'sound' }],
  glows: [{ center: at(36, 51), reach: 22, power: 0.7, tone: 'sound' }],
};

// Frame 5 (`09_recul_en_garde.png`, 6 ticks): Setting the kicking leg back down.
const RETRACT_BODY: Body = {
  ...GUARD,
  hip: at(-4.2, 35.8),
  torso: 14,
  head: 1,
  shrug: 1.6,
  nearFoot: lifted(planted(8.5, 0), 0.8),
  farFoot: onToes(REAR_TOE, -20),
};
const RETRACT: Pose = posed(RETRACT_BODY, [30, 86], [42, 90]);

// Frame 6 (7 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [STEP, CROSS, WHIP, IMPACT, THROUGH, RETRACT, GUARD];
