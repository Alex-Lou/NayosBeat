import { at, GUARD, onBall, planted, smear, type Pose } from './common.ts';
import { keyPose, type Key } from './strike.ts';

/**
 * Watt's round poses (docs/watt.md §10), played on the round clock:
 * - `intro` (10 frames): arrives in the dark (`face: 'out'`), screws his bulb in with both
 *   clamps until it ignites in an X-star plasma burst, then slams his two giant clamps together in
 *   front of his chest to power up his exoskeleton;
 * - `victory` (8 frames, looping 4..7): clashes his clamps and spreads both massive arms wide in a
 *   Colossus Double-Bicep / Power-Surge pose (nothing like Nayo's single raised fist), high-voltage
 *   arcs jumping from clamp to bulb to clamp while floor rings pulse under his boots;
 * - `timeOver` (4 frames looping): exoskeleton power-down — hunched low with both heavy mechanical
 *   arms hanging limp toward his knees and his bulb dark (`out`), flickering weakly (`tired`) on
 *   frame 2 with a dying collar spark.
 */

const EASE: Key = {
  hip: [-8, 38.5],
  torso: 4,
  shrug: 1.4,
  twist: 0.3,
  nearFoot: onBall(-17, -12),
  farFoot: planted(6),
  near: [-6, 40],
  far: [9, 40],
};

const screwing = (turn: number, face: Key['face']): Key => ({
  ...EASE,
  torso: 2,
  shrug: 2.2,
  near: [2 + turn, 71 + turn * 0.5],
  far: [8 - turn * 0.5, 72 - turn * 0.3],
  nearHand: 'open',
  farHand: 'open',
  ...(face ? { face } : {}),
});

export const INTRO_POSES: readonly Pose[] = [
  keyPose({ ...EASE, face: 'out' }),
  keyPose({
    ...EASE,
    near: [-1, 56],
    far: [9, 56],
    nearHand: 'open',
    farHand: 'open',
    face: 'out',
  }),
  keyPose(screwing(0, 'out')),
  keyPose({
    ...screwing(1.5, 'out'),
    effects: [{ kind: 'energy', center: at(-2, 74), radius: 2.4 }],
  }),
  keyPose({
    ...screwing(0, 'tired'),
    effects: [{ kind: 'arc', from: at(4, 68), to: at(-4, 78), spread: 2.8 }],
  }),
  keyPose(screwing(1.5, 'out')),
  keyPose({
    ...screwing(0, 'effort'),
    effects: [
      { kind: 'arc', from: at(-6, 44), to: at(4, 74), spread: 3.5 },
      { kind: 'energy', center: at(-2, 76), radius: 3.4 },
    ],
    glows: [{ center: at(-2, 76), reach: 26, power: 1.0, tone: 'sound' }],
  }),
  keyPose({
    ...screwing(1, 'kiai'),
    effects: [
      { kind: 'plasma', center: at(-2, 76), radius: 5.5, tone: 'sound' },
      { kind: 'arc', from: at(-10, 44), to: at(6, 78), spread: 4 },
      { kind: 'ring', center: at(-2, 76), radius: 12, progress: 0.25, tone: 'sound' },
    ],
    glows: [{ center: at(-2, 76), reach: 34, power: 1.3, tone: 'sound' }],
  }),
  // 8: Both giant clamps slam together in front of his chest, sending a green shockwave ring
  // across the floor!
  keyPose({
    ...EASE,
    hip: [-8.5, 36.5],
    torso: 12,
    shrug: 3.4,
    near: [5, 51],
    far: [9, 51],
    face: 'kiai',
    effects: [
      smear(3, [2, 68], [5, 58], [7, 51]),
      { kind: 'flash', center: at(8, 51), radius: 4.5, tone: 'sound' },
      { kind: 'arc', from: at(-2, 52), to: at(14, 51), spread: 3.5 },
      { kind: 'ring', center: at(-2, 2), radius: 18, progress: 0.3, squash: 0.3, tone: 'sound' },
    ],
    glows: [{ center: at(8, 51), reach: 28, power: 1.15, tone: 'sound' }],
  }),
  GUARD,
];

/**
 * Colossus Double-Bicep / Power-Surge victory posture: chest thrown open (`torso: -4, twist: 0.5`),
 * rear clamp spread wide and high at `[-11, 66]`, lead clamp raised out in front at `[16, 68]`,
 * both pincers wide open and crackling with high-voltage arcs through the bulb.
 */
const SURGE_BASE: Key = {
  hip: [-8, 39.2],
  torso: -4,
  tilt: -6,
  shrug: 3.2,
  twist: 0.5,
  nearFoot: onBall(-17, -14),
  farFoot: planted(6),
  near: [-16, 44],
  far: [16, 68],
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'back', farElbow: 'down', nearKnee: 'front' },
  face: 'kiai',
};

function surgeLoop(dy: number, spread: number, ringProgress: number, arcToBulb: boolean): Pose {
  const nearX = -16 - spread;
  const nearY = 44 - dy * 0.6;
  const farX = 16 + spread;
  const farY = 68 + dy * 1.2;
  return keyPose({
    ...SURGE_BASE,
    hip: [-8, 39.2 + dy],
    shrug: 3.2 + dy * 0.4,
    near: [nearX, nearY],
    far: [farX, farY],
    effects: [
      { kind: 'energy', center: at(nearX, nearY + 2), radius: 2.8, tone: 'sound' },
      { kind: 'energy', center: at(farX + 2, farY + 2), radius: 3.2, tone: 'sound' },
      arcToBulb
        ? { kind: 'arc', from: at(nearX + 1, nearY + 2), to: at(-2, 78), spread: 3.0 }
        : { kind: 'arc', from: at(-2, 78), to: at(farX + 2, farY + 2), spread: 3.2 },
      {
        kind: 'ring',
        center: at(-3, 2),
        radius: 20,
        progress: ringProgress,
        squash: 0.3,
        tone: 'sound',
      },
    ],
    glows: [
      { center: at(-2, 76), reach: 28, power: 1.0, tone: 'sound' },
      { center: at(farX, farY), reach: 22, power: 0.85, tone: 'sound' },
    ],
  });
}

export const VICTORY_POSES: readonly Pose[] = [
  // 0: Sinking and drawing both clamps inward to the chest.
  keyPose({
    hip: [-8.5, 36.5],
    torso: 12,
    shrug: 3.4,
    near: [3, 50],
    far: [9, 50],
    face: 'effort',
    effects: [{ kind: 'energy', center: at(7, 50), radius: 3.0 }],
  }),
  // 1: Clashing both clamps together in front of the sternal core!
  keyPose({
    hip: [-8.5, 36.0],
    torso: 14,
    shrug: 3.8,
    near: [5, 52],
    far: [8, 52],
    face: 'kiai',
    effects: [
      { kind: 'flash', center: at(7, 52), radius: 5.0, tone: 'sound' },
      { kind: 'arc', from: at(-2, 50), to: at(14, 54), spread: 3.5 },
    ],
    glows: [{ center: at(7, 52), reach: 28, power: 1.2, tone: 'sound' }],
  }),
  // 2: Throwing both massive arms wide into the Colossus Power-Surge!
  keyPose({
    ...SURGE_BASE,
    hip: [-8, 39.8],
    near: [-17, 43],
    far: [17, 70],
    effects: [
      smear(3.5, [5, 52], [-6, 48], [-17, 43]),
      smear(3.5, [8, 52], [13, 61], [17, 70]),
      { kind: 'plasma', center: at(-2, 78), radius: 5.5, tone: 'sound' },
      { kind: 'shards', center: at(-2, 78), radius: 14, progress: 0.25, tone: 'sound' },
      { kind: 'arc', from: at(-12, 68), to: at(17, 70), spread: 4.0 },
    ],
    glows: [{ center: at(-2, 78), reach: 34, power: 1.35, tone: 'sound' }],
  }),
  // 3: Settling into the loop's first beat as the shards disperse.
  {
    ...surgeLoop(0.2, 0.5, 0.15, true),
    effects: [
      ...(surgeLoop(0.2, 0.5, 0.15, true).effects ?? []),
      { kind: 'shards', center: at(-2, 78), radius: 18, progress: 0.65, tone: 'sound' },
    ],
  },
  // 4..7: 4-frame looping power-surge beat (every frame distinct).
  surgeLoop(0.0, 0.0, 0.25, true),
  surgeLoop(0.6, 0.8, 0.48, false),
  surgeLoop(1.0, 1.2, 0.72, true),
  surgeLoop(0.4, 0.5, 0.92, false),
];

/**
 * Hunched power-down defeat posture: torso pitched forward (`torso: 24`), knees bent (`hip.y: 33.5`),
 * both heavy exoskeleton arms dangling low toward the knees (`near: [-2, 31], far: [10, 30]`),
 * bulb extinguished (`out`) and flickering weakly (`tired`) on frame 2.
 */
const POWER_DOWN: Key = {
  hip: [-8.5, 33.5],
  torso: 24,
  tilt: 14,
  shrug: 0.4,
  twist: 0.25,
  nearFoot: onBall(-17, -18),
  farFoot: planted(6),
  near: [-2, 31],
  far: [10, 30],
  nearHand: 'open',
  farHand: 'open',
  face: 'out',
};

export const TIME_OVER_POSES: readonly Pose[] = [
  keyPose(POWER_DOWN),
  keyPose({
    ...POWER_DOWN,
    hip: [-8.5, 34.3],
    torso: 22,
    shrug: 1.0,
    near: [-2, 32],
    far: [10, 31],
  }),
  // Frame 2: Weak short-circuit flicker in the bulb and collar before going dark again.
  keyPose({
    ...POWER_DOWN,
    hip: [-8.5, 34.8],
    torso: 21,
    shrug: 1.3,
    near: [-1.5, 32.5],
    far: [10.5, 31.5],
    face: 'tired',
    effects: [
      { kind: 'arc', from: at(-4, 60), to: at(4, 66), spread: 2.0 },
      { kind: 'energy', center: at(10, 31), radius: 1.6 },
    ],
  }),
  keyPose({
    ...POWER_DOWN,
    hip: [-8.5, 33.8],
    torso: 23,
    shrug: 0.6,
    near: [-2, 31.5],
    far: [10, 30.5],
  }),
];
