import { at, GUARD, onBall, planted, type Pose } from './common.ts';
import { keyPose, type Key } from './strike.ts';

/**
 * Watt's round poses (docs/watt.md §10), played on the round clock. The bulb tells the story:
 * he walks in with it off, screws it back into its socket and it lights; he wins with it at full
 * glow; out of time, it dims.
 */

/** Standing at ease, the weight on both boots, the clamps low. */
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

/** The rear clamp up on the bulb's lower side, screwing it in. */
const screwing = (turn: number, face: Key['face']): Key => ({
  ...EASE,
  torso: 3,
  shrug: 2,
  near: [4 + turn, 72 + turn * 0.5],
  nearHand: 'open',
  ...(face ? { face } : {}),
});

/**
 * intro: 10 frames of 9 ticks (90). Walking in from the dark with the bulb off, he raises a
 * clamp to it, gives it two turns (a flicker, then it holds), and settles into the guard.
 */
export const INTRO_POSES: readonly Pose[] = [
  keyPose({ ...EASE, face: 'out' }),
  keyPose({ ...EASE, near: [-2, 56], face: 'out' }),
  keyPose(screwing(0, 'out')),
  keyPose({
    ...screwing(1.5, 'out'),
    effects: [{ kind: 'energy', center: at(-2, 74), radius: 2.2 }],
  }),
  keyPose({
    ...screwing(0, 'tired'),
    effects: [{ kind: 'arc', from: at(2, 68), to: at(-4, 78), spread: 2.5 }],
  }),
  keyPose(screwing(1.5, 'out')),
  keyPose({
    ...screwing(0, 'effort'),
    effects: [
      { kind: 'arc', from: at(-6, 42), to: at(4, 74), spread: 3.5 },
      { kind: 'energy', center: at(-2, 76), radius: 3.2 },
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
  keyPose({
    ...EASE,
    hip: [-8.5, 38],
    torso: 6,
    near: [-3, 50],
    far: [10, 46],
    effects: [{ kind: 'ring', center: at(-2, 76), radius: 18, progress: 0.65, tone: 'sound' }],
  }),
  GUARD,
];

/** The lead clamp raised high, the rear one pumped at the chest, the bulb at full glow. */
const FLEX: Key = {
  hip: [-8, 39],
  torso: 0,
  tilt: -6,
  shrug: 3,
  nearFoot: onBall(-17, -14),
  farFoot: planted(6),
  near: [2, 56],
  far: [12, 83],
  face: 'kiai',
  effects: [
    { kind: 'plasma', center: at(12, 84), radius: 4.5, tone: 'sound' },
    { kind: 'arc', from: at(2, 56), to: at(12, 83), spread: 3 },
  ],
  glows: [{ center: at(12, 83), reach: 28, power: 1.1, tone: 'sound' }],
};

/**
 * victory: 8 frames, 6, 6, 6, 6 ticks in, then 8, 8, 8, 8 looping from frame 4. He straightens
 * out of the guard, raises the lead clamp high and pumps the rear one at his chest, the bulb at
 * full glow, pumping a hair on the beat.
 */
export const VICTORY_POSES: readonly Pose[] = [
  keyPose({ hip: [-8.5, 38], torso: 6, near: [-3, 56], far: [6, 56] }),
  keyPose({ hip: [-8, 38.5], torso: 3, near: [0, 54], far: [10, 70], face: 'effort' }),
  keyPose({ ...FLEX, near: [1, 55], far: [12, 80] }),
  keyPose(FLEX),
  keyPose(FLEX),
  keyPose({ ...FLEX, hip: [-8, 39.4], near: [2, 57], far: [12, 84] }),
  keyPose(FLEX),
  keyPose({ ...FLEX, hip: [-8, 38.6], near: [2, 55.5], far: [12, 82.5] }),
];

/** Slumped, out of breath, the clamps hanging, the bulb dim. */
const SLUMP: Key = {
  hip: [-8, 37],
  torso: 12,
  tilt: 8,
  shrug: 0.6,
  nearFoot: onBall(-17, -14),
  farFoot: planted(6),
  near: [-4, 39],
  far: [9, 39],
  face: 'tired',
};

/** timeOver: 4 frames of 10 ticks, looping: slumped, breathing hard, a dying spark off the collar. */
export const TIME_OVER_POSES: readonly Pose[] = [
  keyPose({
    ...SLUMP,
    effects: [{ kind: 'energy', center: at(-2, 66), radius: 1.8 }],
  }),
  keyPose({ ...SLUMP, hip: [-8, 37.6], torso: 10, near: [-4, 40], far: [9, 40] }),
  keyPose({
    ...SLUMP,
    hip: [-8, 37.8],
    torso: 9,
    effects: [{ kind: 'energy', center: at(9, 40), radius: 1.6 }],
  }),
  keyPose({ ...SLUMP, hip: [-8, 37.2], torso: 11 }),
];
