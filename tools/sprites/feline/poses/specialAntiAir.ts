import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, planted, smear, type Effect, type Foot, type Pose } from './common.ts';
import { hung } from './jump.ts';

/** Where the crouched fists gather portal energy at the bottom of the dip (used by remixes.ts). */
export const DIP_FIST = at(-6, 30);

/**
 * specialAntiAir (Portail ascendant, ↓ + S, `02_Portail_Horizontal_Sortie` +
 * `09_Coups_Speciaux_Annexes/01_uppercut_portail.png` & `05_vortex.png`):
 * 10 frames, ticks 3,[3],[5],4,4,4,4,4,4,4 (active: frames 1-2, hitbox x 4..24 / y 30..100).
 * A horizontal multi-ring dimensional vortex portal (`kind: 'portal'`) opens on the floor under
 * Feline; she erupts skyward out of the floor portal in a rising uppercut / high-knee ascension
 * (`01_uppercut_portail.png`) wrapped in a column of silver-white portal light (`column`), orbital
 * blades (`kind: 'blade'`), and an 8-point star burst at y = 96..100!
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

function withMoonKick(body: Body, nearFoot: Point, farFoot: Foot, nearAnkle = 88): Body {
  const withFeet: Body = {
    ...body,
    nearFoot: { x: nearFoot.x, y: nearFoot.y, angle: 0 },
    farFoot,
    bends: { ...body.bends, nearKnee: 'up' },
  };
  return { ...withFeet, nearFoot: hung(withFeet, 'near', nearAnkle) };
}

const REAR_TOE = solve(GUARD).far.toe.x;

function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

const floorPortal = (rx: number, ry = 4.5, y = 5.5): Effect => ({
  kind: 'portal',
  center: at(-1, y),
  rx,
  ry,
  tone: 'sound',
});

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

const column = (bottom: number, top: number, width: number, progress: number): Effect => ({
  kind: 'column',
  base: at(19, bottom),
  height: (top - bottom) / (0.4 + 0.6 * progress),
  width,
  progress,
});

// 0 - The dip (`01_ouverture_au_sol.png`, 3 ticks): Deep crouch into the horizontal floor portal!
const DIP_BODY: Body = {
  ...GUARD,
  hip: at(-6.6, 28.8),
  torso: 26,
  head: -10,
  shrug: 0.4,
  twist: 0.45,
  nearFoot: planted(6.35),
  farFoot: onToes(REAR_TOE, -40),
};
const DIP: Pose = posed(DIP_BODY, [-26, 24], [36, 88]);

// 1 - The launch (`02_emergence.png` / `01_uppercut_portail.png`, 3 ticks, active): Erupting
// upward out of the horizontal floor vortex!
const LAUNCH_RAW: Body = {
  ...GUARD,
  hip: at(-6.5, 44.0),
  torso: -22,
  head: 16,
  shrug: 2.0,
  twist: 0.35,
  nearFoot: at(12.0, 70.0),
  farFoot: onToes(REAR_TOE, -60),
  face: 'effort',
};
const LAUNCH: Pose = posed(
  withMoonKick(LAUNCH_RAW, at(12.0, 70.0), onToes(REAR_TOE, -60), 86),
  [-28, 22],
  [-12, 28],
);

// 2 - The peak (`01_uppercut_portail.png`, 5 ticks, active): Apex of the rising portal vortex!
const PEAK_RAW: Body = {
  ...GUARD,
  hip: at(-6.0, 48.0),
  torso: -26,
  head: 20,
  shrug: 2.2,
  twist: 0.4,
  nearFoot: at(13.0, 74.0),
  farFoot: { x: -16.0, y: 15.0, angle: -48 },
  face: 'kiai',
};
const PEAK: Pose = posed(
  withMoonKick(PEAK_RAW, at(13.0, 74.0), { x: -16.0, y: 15.0, angle: -48 }, 85),
  [-32, 20],
  [-14, 26],
);

// 3 - The apex hang (4 ticks): Folding back from the zenith inside the silver-white column.
const HANG_RAW: Body = {
  ...GUARD,
  hip: at(-1.0, 48.5),
  torso: -18,
  head: 14,
  shrug: 2.0,
  twist: 0.3,
  nearFoot: at(19.0, 58.0),
  farFoot: { x: -12.0, y: 15.0, angle: -45 },
};
const HANG: Pose = posed(
  withMoonKick(HANG_RAW, at(19.0, 58.0), { x: -12.0, y: 15.0, angle: -45 }, 90),
  [-22, 26],
  [48, 68],
);

// 4 - Descending (4 ticks).
const TOPPLE_RAW: Body = {
  ...GUARD,
  hip: at(-2.5, 44.5),
  torso: -2,
  head: 4,
  shrug: 1.6,
  twist: 0.3,
  nearFoot: at(10.0, 36.0),
  farFoot: { x: -14.5, y: 11.5, angle: -40 },
};
const TOPPLE: Pose = posed(
  withMoonKick(TOPPLE_RAW, at(10.0, 36.0), { x: -14.5, y: 11.5, angle: -40 }, 95),
  [-16, 30],
  [56, 62],
);

// 5 - Reaching for the floor.
const FALL_BODY: Body = {
  ...GUARD,
  hip: at(-4.0, 39.5),
  torso: 6,
  head: 4,
  shrug: 1.4,
  twist: 0.3,
  nearFoot: { x: 6.5, y: 11.0, angle: -10 },
  farFoot: onToes(REAR_TOE, -36),
};
const FALL: Pose = posed(FALL_BODY, [-14, 34], [62, 58]);

// 6 - Agile feline landing (`04_appui.png`).
const LAND: Pose = {
  ...GUARD,
  hip: at(-6.4, 29.5),
  torso: 20,
  head: -4,
  shrug: 1.6,
  nearFoot: planted(6.35),
  farFoot: onToes(REAR_TOE, -42),
  nearFist: at(12.5, 48.0),
  farFist: at(11.5, 54.0),
};

// 7 - Held low in the stance during recovery.
const LOW: Pose = {
  ...LAND,
  hip: at(-6.5, 31.5),
  torso: 18,
  head: -2,
  nearFist: at(11.5, 49.5),
  farFist: at(11.0, 56.0),
};

// 8 - Rising back into the feline guard (`05_redressement.png`).
const RISE: Pose = {
  ...GUARD,
  hip: at(-6.6, 35.0),
  torso: 14,
  head: 1,
  shrug: 1.2,
  nearFist: at(9.4, 51.5),
  farFist: at(9.6, 57.5),
  farFoot: onToes(REAR_TOE, -17),
};

// 9 - Hand-off to idle (`06_retour_garde.png`).
const IDLE_HANG: Pose = {
  ...GUARD,
  hip: at(-6.5, 36.6),
  torso: 13,
  shrug: 1.2,
  nearFist: at(9.0, 52.8),
  farFist: at(9.6, 57.4),
};

export const POSES: readonly Pose[] = [
  {
    ...DIP,
    effects: [
      floorPortal(16, 4.5, 5.5),
      dust(5, 3.6, 0.15),
      dust(-18, 3.2, 0.2),
      { kind: 'energy', center: at(-2, 29), radius: 2.8 },
    ],
  },
  {
    ...LAUNCH,
    effects: [
      smear(4.0, [7, 50], [12, 66], [14, 79], [14, 88]),
      column(0, 82, 10, 0.2),
      floorPortal(18, 5.0, 5.5),
      { kind: 'blade', center: at(10, 58), rx: 10, ry: 4.5, tilt: 24, twin: true, tone: 'sound' },
      dust(6, 3.6, 0.5),
      dust(-18.5, 3.2, 0.55),
      { kind: 'flash', center: at(16, 96.5), radius: 4.5, tone: 'strike' },
    ],
  },
  {
    ...PEAK,
    effects: [
      smear(4.0, [8, 56], [11, 70], [12, 84], [11.5, 92]),
      column(0, 98, 11, 0.45),
      floorPortal(15, 4.0, 5.0),
      { kind: 'blade', center: at(11, 72), rx: 10, ry: 4.5, tilt: -22, twin: true, tone: 'sound' },
      dust(7, 3.6, 0.85),
      dust(-19, 3.2, 0.9),
      { kind: 'flash', center: at(13.5, 100.5), radius: 6, tone: 'strike' },
      { kind: 'shards', center: at(15, 88), radius: 12, progress: 0.3, tone: 'sound' },
    ],
  },
  { ...HANG, effects: [column(0, 100, 10, 0.6)] },
  { ...TOPPLE, effects: [column(0, 90, 8.5, 0.74)] },
  { ...FALL, effects: [column(0, 70, 7, 0.85)] },
  { ...LAND, effects: [column(0, 30, 4, 0.95), dust(8, 3.6, 0.2), dust(-18, 3.2, 0.25)] },
  { ...LOW, effects: [dust(9, 3.6, 0.6), dust(-18.5, 3.2, 0.65)] },
  RISE,
  IDLE_HANG,
];
