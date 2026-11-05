import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, energy, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';
import { hung } from './jump.ts';

/**
 * victory: 8 frames, 6,6,6,6 then 8x4 looping from frame 4.
 * Wide-Wing Crane Master victory pose (completely distinct from Nayo):
 * Koda steps onto his rear leg, clashes his two silver gauntlets in front of his sternum, and
 * spreads both arms wide like crane wings — lead arm swept low and back (`[-24, 22]`), rear arm
 * raised high forward (`[126, 24]`), chest and coat wide open — while lifting his lead knee high
 * into a one-legged Crane Stance at the heart of a pulsing jade seal.
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
  center: at(4, 54),
  radius: 16,
  progress,
  tone: 'sound',
  squash: 1.25,
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
  torso: -4,
  head: 6,
  shrug: 1.4,
  twist: 0.5,
  nearFoot: at(7.0, 22.0),
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
  nearFist: at(7.5, 50.0),
  farFist: at(9.5, 54.0),
  bends: { nearElbow: 'down', farElbow: 'down' },
  face: 'cool',
};

// 1 · Crossing both silver gauntlets in front of his sternum as the lead knee begins to lift.
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

// 2 · Snapping into the Crane Salute posture (`near: [48, 114]` salute across the sternum,
// `far: [68, 28]` horizontal knife-hand extended over the raised knee `y = 23`), neither arm raised
// to the sky, as diamond shards and a jade crest burst around him!
const UNLEASH_RAW: Body = {
  ...CRANE_BASE,
  hip: at(-1.8, 40.0),
  torso: -5,
  head: 7,
};
const UNLEASH_ARMS = posed(withCraneLeg(UNLEASH_RAW, at(7.5, 23.0), 95), [48, 114], [68, 28]);
const UNLEASH: Pose = {
  ...UNLEASH_ARMS,
  effects: [
    smear(3.5, [10.5, 53.5], [16, 48], [UNLEASH_ARMS.farFist.x, UNLEASH_ARMS.farFist.y]),
    { kind: 'flash', center: at(12, 50), radius: 5.5, tone: 'sound' },
    { kind: 'shards', center: at(12, 50), radius: 16, progress: 0.25, tone: 'sound' },
    floorRing(0.2),
  ],
  glows: [{ center: at(12, 50), reach: 32, power: 1.4, tone: 'sound' }],
};

const PULSE = [
  { dip: 0.0, knee: 0.0, wing: 0, ring: 0.25, floor: 0.35 },
  { dip: 0.5, knee: 0.8, wing: 3, ring: 0.48, floor: 0.58 },
  { dip: 1.0, knee: 1.4, wing: 5, ring: 0.72, floor: 0.8 },
  { dip: 0.5, knee: 0.6, wing: 2, ring: 0.92, floor: 0.95 },
] as const;

function loopFrame(phase: 0 | 1 | 2 | 3): Pose {
  const { dip, knee, wing, ring, floor } = PULSE[phase];
  const body = withCraneLeg(
    {
      ...CRANE_BASE,
      hip: at(CRANE_BASE.hip.x, CRANE_BASE.hip.y - dip),
    },
    at(7.0, 22.0 + knee),
    95,
  );
  const p = posed(body, [46 + wing, 114], [64 + wing, 30]);
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
      { kind: 'shards', center: at(8, 56), radius: 20, progress: 0.65, tone: 'sound' },
      floorRing(0.6),
    ],
  },
  loopFrame(0),
  loopFrame(1),
  loopFrame(2),
  loopFrame(3),
];
