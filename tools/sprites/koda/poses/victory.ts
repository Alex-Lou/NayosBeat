import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, energy, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';
import { hung } from './jump.ts';

/**
 * victory: 8 frames, 6,6,6,6 then 8x4 looping from frame 4.
 * Iconic martial-arts Crane / Master victory stance (nothing like Nayo's raised-fist pump):
 * Koda steps onto his rear leg, clashes his two silver gauntlets in front of his sternum in a
 * burst of diamond shards, and rises into a poised one-legged Crane Stance — lead knee raised high
 * in front of his waist, lead hand held in a vertical kung-fu salute at his chest, rear knife-hand
 * extended forward — while concentric jade acoustic rings pulse around him.
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

function withCraneLeg(body: Body, foot: Point, ankle = 95): Body {
  const withFoot: Body = {
    ...body,
    nearFoot: { x: foot.x, y: foot.y, angle: 0 },
    bends: { ...body.bends, nearKnee: 'up' },
  };
  return { ...withFoot, nearFoot: hung(withFoot, 'near', ankle) };
}

const crestRing = (progress: number): Effect => ({
  kind: 'ring',
  center: at(8, 52),
  radius: 15,
  progress,
  tone: 'sound',
  squash: 1.3,
});

const floorRing = (progress: number): Effect => ({
  kind: 'ring',
  center: at(-3, 2),
  radius: 20,
  progress,
  tone: 'sound',
  squash: 0.3,
});

const CRANE_BASE: Body = {
  hip: at(-2.0, 39.5),
  torso: -3,
  head: 5,
  shrug: 1.4,
  twist: 0.45,
  nearFoot: at(6.0, 21.0),
  farFoot: planted(-6.0),
  nearHand: 'open',
  farHand: 'open',
  face: 'cool',
};

// 0 · Stepping the rear foot under the hips, drawing both silver gauntlets inward.
const STEP: Pose = {
  ...GUARD,
  hip: at(-4.0, 38.0),
  torso: 6,
  head: 3,
  farFoot: lifted(planted(-12.0, -8), 1.2),
  nearFist: at(8.0, 50.0),
  farFist: at(9.5, 54.0),
  face: 'cool',
};

// 1 · Crossing both silver gauntlets in front of his sternum as the lead foot begins to lift.
const CROSS_RAW: Body = {
  ...CRANE_BASE,
  hip: at(-2.8, 38.4),
  torso: 4,
  head: 2,
  twist: 0.15,
};
const CROSS: Pose = {
  ...posed(withCraneLeg(CROSS_RAW, at(5.5, 13.0), 95), [30, 100], [40, 94]),
  effects: [energy(10.0, 53.0, 3.8)],
  glows: [{ center: at(10, 53), reach: 26, power: 1.2, tone: 'sound' }],
};

// 2 · Snapping into the one-legged Crane Master posture! The lead knee rises high (`y = 22`), the
// lead open palm forms a vertical salute at the chest (`[42, 108]`), and the rear silver gauntlet
// extends forward in a horizontal knife-hand (`[76, 32]`) as diamond shards burst outward!
const UNLEASH_RAW: Body = {
  ...CRANE_BASE,
  hip: at(-1.8, 40.0),
  torso: -4,
  head: 6,
};
const UNLEASH_ARMS = posed(withCraneLeg(UNLEASH_RAW, at(6.5, 22.5), 95), [42, 108], [76, 32]);
const UNLEASH: Pose = {
  ...UNLEASH_ARMS,
  effects: [
    smear(3.5, [10.5, 53.5], [16, 54], [UNLEASH_ARMS.farFist.x, UNLEASH_ARMS.farFist.y]),
    { kind: 'flash', center: at(12, 54), radius: 5.5, tone: 'sound' },
    { kind: 'shards', center: at(12, 54), radius: 16, progress: 0.25, tone: 'sound' },
    floorRing(0.2),
  ],
  glows: [{ center: at(12, 54), reach: 32, power: 1.4, tone: 'sound' }],
};

const PULSE = [
  { dip: 0.0, knee: 0.0, palm: 0, ring: 0.25, floor: 0.35 },
  { dip: 0.5, knee: 0.8, palm: 3, ring: 0.48, floor: 0.58 },
  { dip: 1.0, knee: 1.4, palm: 5, ring: 0.72, floor: 0.8 },
  { dip: 0.5, knee: 0.6, palm: 2, ring: 0.92, floor: 0.95 },
] as const;

function loopFrame(phase: 0 | 1 | 2 | 3): Pose {
  const { dip, knee, palm, ring, floor } = PULSE[phase];
  const body = withCraneLeg(
    {
      ...CRANE_BASE,
      hip: at(CRANE_BASE.hip.x, CRANE_BASE.hip.y - dip),
    },
    at(6.0, 21.0 + knee),
    95,
  );
  const p = posed(body, [40 + palm, 108], [72 + palm, 34]);
  return {
    ...p,
    effects: [crestRing(ring), floorRing(floor), energy(p.farFist.x, p.farFist.y, 2.2)],
    glows: [{ center: p.farFist, reach: 22, power: 0.8, tone: 'sound' }],
  };
}

export const POSES: readonly Pose[] = [
  STEP,
  CROSS,
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
