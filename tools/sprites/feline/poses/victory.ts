import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, energy, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';

/**
 * victory: 8 frames, 6,6,6,6 then 8x4 looping from frame 4.
 * Based on `Pack_Feline_Poses_Et_Degats/02_victoire/victoire_01_bras_ouverts.png` and
 * `victoire_02_pose_triomphante.png`:
 * Feline steps out of her stance, summons a shimmering vertical silver-white astral portal behind
 * her (`squash: 2.1`), and strikes her triumphant cat-fighter pose — one hand resting on her hip
 * (`near: [-14, 42]`), the other extended out in a graceful claw salute (`far: [76, 30]`) — while
 * star fragments and orbital portal rings pulse around her.
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

const portalRing = (progress: number): Effect => ({
  kind: 'ring',
  center: at(0, 48),
  radius: 17,
  progress,
  tone: 'sound',
  squash: 2.0,
});

const floorRing = (progress: number): Effect => ({
  kind: 'ring',
  center: at(-3, 2),
  radius: 20,
  progress,
  tone: 'sound',
  squash: 0.3,
});

const TRIUMPH_BASE: Body = {
  hip: at(-2.5, 40.0),
  torso: -3,
  head: 5,
  shrug: 1.4,
  twist: 0.45,
  nearFoot: planted(GUARD.nearFoot.x),
  farFoot: planted(-11.0),
  nearHand: 'open',
  farHand: 'open',
  face: 'smirk',
};

const STEP: Pose = {
  ...GUARD,
  hip: at(-4.2, 38.2),
  torso: 6,
  head: 3,
  farFoot: lifted(planted(-15.0, -8), 1.2),
  nearFist: at(8.0, 50.0),
  farFist: at(9.5, 54.0),
  face: 'cool',
};

const CHANNEL_BODY: Body = {
  ...TRIUMPH_BASE,
  hip: at(-3.2, 38.6),
  torso: 4,
  head: 2,
  twist: 0.2,
};
const CHANNEL: Pose = {
  ...posed(CHANNEL_BODY, [28, 100], [40, 94]),
  effects: [energy(10.0, 53.0, 3.8)],
  glows: [{ center: at(10, 53), reach: 26, power: 1.2, tone: 'sound' }],
};

// Frame 2: `victoire_01_bras_ouverts.png` — arms opening wide as a vertical silver portal erupts!
const OPEN_ARMS = posed(
  { ...TRIUMPH_BASE, hip: at(-2.2, 40.5), torso: -4, head: 6, face: 'kiai' },
  [-18, 32],
  [82, 24],
);
const UNLEASH: Pose = {
  ...OPEN_ARMS,
  effects: [
    smear(3.5, [10.5, 53.5], [16, 52], [OPEN_ARMS.farFist.x, OPEN_ARMS.farFist.y]),
    { kind: 'flash', center: at(12, 54), radius: 5.5, tone: 'sound' },
    { kind: 'shards', center: at(12, 54), radius: 16, progress: 0.25, tone: 'sound' },
    floorRing(0.2),
  ],
  glows: [{ center: at(12, 54), reach: 32, power: 1.4, tone: 'sound' }],
};

const PULSE = [
  { dip: 0.0, wave: 0, ring: 0.25, floor: 0.35 },
  { dip: 0.5, wave: 3, ring: 0.48, floor: 0.58 },
  { dip: 1.0, wave: 5, ring: 0.72, floor: 0.8 },
  { dip: 0.5, wave: 2, ring: 0.92, floor: 0.95 },
] as const;

function loopFrame(phase: 0 | 1 | 2 | 3): Pose {
  const { dip, wave, ring, floor } = PULSE[phase];
  const body: Body = {
    ...TRIUMPH_BASE,
    hip: at(TRIUMPH_BASE.hip.x, TRIUMPH_BASE.hip.y - dip),
  };
  const p = posed(body, [-16, 36], [72 + wave, 28]);
  return {
    ...p,
    effects: [portalRing(ring), floorRing(floor), energy(p.farFist.x, p.farFist.y, 2.2)],
    glows: [{ center: p.farFist, reach: 22, power: 0.8, tone: 'sound' }],
  };
}

export const POSES: readonly Pose[] = [
  STEP,
  CHANNEL,
  UNLEASH,
  {
    ...loopFrame(0),
    effects: [
      { kind: 'shards', center: at(12, 54), radius: 20, progress: 0.65, tone: 'sound' },
      floorRing(0.6),
    ],
  },
  loopFrame(0),
  loopFrame(1),
  loopFrame(2),
  loopFrame(3),
];
