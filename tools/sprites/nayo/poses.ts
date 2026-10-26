/**
 * Nayo's key poses, frame by frame. Character space (see skeleton.ts): feet anchor at the
 * origin, x toward the opponent, y up; a flat foot on the ground has its ankle at y = 5.
 *
 * Attack poses are placed against the Polyvalent hitboxes (src/data/fighters.ts): on the active
 * frame the striking fist or foot reaches the far edge of the hitbox, so what you see is what
 * hits. tests/tools/sprites.test.ts checks it for every move.
 */

import type { NayoSheet } from '../../../src/art/nayo/sheets.ts';
import type { Point } from '../raster.ts';
import { blend, planted, type Effect, type Foot, type Pose } from '../skeleton.ts';

/** A foot raised `height` pixels off the ground (a step). */
function lifted(foot: Foot, height: number): Foot {
  return { ...foot, y: foot.y + height };
}

const at = (x: number, y: number): Point => ({ x, y });
const smear = (width: number, ...points: readonly (readonly [number, number])[]): Effect => ({
  kind: 'smear',
  width,
  points: points.map(([x, y]) => at(x, y)),
});
const energy = (x: number, y: number, radius: number): Effect => ({
  kind: 'energy',
  center: at(x, y),
  radius,
});

// ---------------------------------------------------------------------------------------------
// Reference poses

/** Orthodox fighting stance: lead foot and fist forward, rear fist guarding the chin. */
const GUARD: Pose = {
  hip: at(0, 39),
  torso: 8,
  head: 4,
  nearFoot: planted(11),
  farFoot: planted(-12, -12),
  nearFist: at(17, 64),
  farFist: at(11, 62),
};

const CROUCH: Pose = {
  hip: at(0, 22),
  torso: 44,
  head: -18,
  nearFoot: planted(12),
  // Rear knee low but off the floor: a crouch, not a kneel.
  farFoot: planted(-11, -15),
  nearFist: at(24, 40),
  farFist: at(18, 38),
};

/** Knees pulled up to the chest, fists on the shins: the airborne ball for flips. */
const TUCK: Pose = {
  hip: at(0, 40),
  torso: 30,
  head: 15,
  nearFoot: { x: 9, y: 27, angle: -30 },
  farFoot: { x: 3, y: 25, angle: -30 },
  nearFist: at(13, 49),
  farFist: at(8, 48),
};

const TAKEOFF: Pose = {
  hip: at(0, 26),
  torso: 16,
  head: 2,
  nearFoot: planted(7),
  farFoot: planted(-6),
  nearFist: at(9, 34),
  farFist: at(-3, 36),
};

const RISING: Pose = {
  hip: at(0, 40),
  torso: 4,
  head: -4,
  nearFoot: { x: 4, y: 10, angle: -35 },
  farFoot: { x: -3, y: 12, angle: -35 },
  nearFist: at(12, 76),
  farFist: at(6, 74),
};

const APEX: Pose = {
  hip: at(0, 34),
  torso: 18,
  head: 6,
  nearFoot: { x: 10, y: 21, angle: -20 },
  farFoot: { x: 4, y: 19, angle: -20 },
  nearFist: at(17, 56),
  farFist: at(11, 54),
};

const FALLING: Pose = {
  hip: at(0, 39),
  torso: 10,
  head: 4,
  nearFoot: { x: 7, y: 8, angle: -20 },
  farFoot: { x: -5, y: 10, angle: -25 },
  nearFist: at(17, 62),
  farFist: at(11, 60),
};

const LANDING: Pose = {
  hip: at(0, 28),
  torso: 14,
  head: 4,
  nearFoot: planted(10),
  farFoot: planted(-11),
  nearFist: at(17, 52),
  farFist: at(11, 50),
};

/** Airborne guard used by the jump attacks between their active frames. */
const AIR_GUARD: Pose = {
  hip: at(0, 32),
  torso: 16,
  head: 6,
  nearFoot: { x: 10, y: 17, angle: -20 },
  farFoot: { x: 3, y: 15, angle: -25 },
  nearFist: at(16, 54),
  farFist: at(10, 52),
};

/** On the back, legs toward the opponent, arms by the sides. */
const LYING: Pose = {
  // The jacket's thickness lies under the spine: the hip rests 10 px up.
  hip: at(2, 10),
  torso: -88,
  head: 2,
  nearFoot: { x: 34, y: 8, angle: 80 },
  farFoot: { x: 30, y: 7, angle: 75 },
  bends: { nearKnee: 'up', farKnee: 'up' },
  // Arms straight along the body, hands by the hips (a folded arm would dig into the floor).
  nearFist: at(8, 7),
  farFist: at(6, 5),
  face: 'out',
};

// ---------------------------------------------------------------------------------------------
// Movement

function idle(frame: number): Pose {
  const breath = Math.sin((frame / 6) * Math.PI * 2);
  const drop = 0.6 + 0.6 * breath;
  return {
    ...GUARD,
    hip: at(GUARD.hip.x, GUARD.hip.y - drop),
    torso: GUARD.torso + breath * 0.8,
    nearFist: at(GUARD.nearFist.x, GUARD.nearFist.y - drop * 0.8),
    farFist: at(GUARD.farFist.x + breath * 0.4, GUARD.farFist.y - drop * 0.8),
  };
}

/**
 * Stance walk: the feet never cross. One foot swings while the other stays planted; a planted
 * foot slides back in the cell at exactly the walking speed, so it stays still on the stage.
 * `stride` is how far the body travels per half cycle; negative walks backward.
 */
function walk(frame: number, frames: number, stride: number): Pose {
  const phase = frame / frames;
  const first = phase < 0.5;
  const u = first ? phase * 2 : (phase - 0.5) * 2;
  const lift = Math.sin(Math.PI * u) * 3;
  const forward = stride > 0;
  const reach = Math.abs(stride);
  // Where each foot's step starts and ends; while planted it slides the other way.
  const lead = forward ? { from: 4, to: 4 + reach } : { from: 4 + reach, to: 4 };
  const rear = forward ? { from: -6 - reach, to: -6 } : { from: -6, to: -6 - reach };
  // Walking forward, the lead foot steps first; backward, the rear foot does.
  const leadSwings = forward === first;
  const swing = (from: number, to: number): number =>
    from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * u));
  const slide = (from: number, to: number): number => from + (to - from) * u;

  const nearX = leadSwings ? swing(lead.from, lead.to) : slide(lead.to, lead.from);
  const farX = leadSwings ? slide(rear.to, rear.from) : swing(rear.from, rear.to);

  const bob = 0.8 - 0.8 * Math.cos(phase * Math.PI * 4);
  return {
    ...GUARD,
    hip: at(0, GUARD.hip.y - bob),
    // Leaning in to advance, sitting back to retreat.
    torso: forward ? 10 : 4,
    nearFoot: lifted(planted(nearX), leadSwings ? lift : 0),
    farFoot: lifted(planted(farX, -12), leadSwings ? 0 : lift),
    nearFist: at(GUARD.nearFist.x + (forward ? 1 : -1), GUARD.nearFist.y - bob),
    farFist: at(GUARD.farFist.x, GUARD.farFist.y - bob + (forward ? 0 : 2)),
  };
}

function crouch(frame: number): Pose {
  if (frame === 0) return blend(GUARD, CROUCH, 0.45);
  if (frame === 1) return blend(GUARD, CROUCH, 0.85);
  const breath = frame === 3 ? 0.8 : 0;
  return { ...CROUCH, hip: at(CROUCH.hip.x, CROUCH.hip.y - breath) };
}

const FRONT_FLIP: readonly Pose[] = [
  { ...blend(TAKEOFF, RISING, 0.6), torso: 28, head: 10 },
  { ...TUCK, spin: 70 },
  { ...TUCK, spin: 160 },
  { ...TUCK, spin: 250 },
  { ...TUCK, spin: 330 },
  FALLING,
];

// ---------------------------------------------------------------------------------------------
// Guard and reactions

const BLOCK_STAND: Pose = {
  hip: at(-2, 38),
  torso: -2,
  head: 10,
  nearFoot: planted(9),
  farFoot: planted(-14, -12),
  // Forearms stacked in front of the face and chest.
  nearFist: at(15, 66),
  farFist: at(13, 58),
  bends: { nearElbow: 'down', farElbow: 'down' },
};

const BLOCK_CROUCH: Pose = {
  ...CROUCH,
  hip: at(-2, 21),
  torso: 34,
  head: -6,
  // Arms lowered in front of the knees against low attacks.
  nearFist: at(21, 34),
  farFist: at(18, 40),
};

const BLOCK: readonly Pose[] = [
  BLOCK_STAND,
  { ...BLOCK_STAND, hip: at(-4, 37.5), torso: -6, nearFist: at(12, 66), farFist: at(10, 58) },
  BLOCK_CROUCH,
  { ...BLOCK_CROUCH, hip: at(-4, 20.5), torso: 30, nearFist: at(18, 34), farFist: at(15, 40) },
];

/** Head snapped back, arms flung loose. */
const HIT_SNAP: Pose = {
  hip: at(-3, 38),
  torso: -16,
  head: -22,
  nearFoot: planted(10),
  farFoot: planted(-14, -10),
  nearFist: at(4, 50),
  farFist: at(-8, 54),
  face: 'hurt',
};

const HIT: readonly Pose[] = [
  HIT_SNAP,
  // Doubled up by the blow.
  {
    hip: at(-5, 36),
    torso: 18,
    head: 22,
    nearFoot: planted(9),
    farFoot: planted(-15, -10),
    nearFist: at(6, 44),
    farFist: at(2, 46),
    face: 'hurt',
  },
  { ...blend(GUARD, { ...GUARD, hip: at(-4, 37), torso: 2 }, 0.6), face: 'hurt' },
  // Crouching: sits up under the hit.
  {
    ...CROUCH,
    hip: at(-3, 21),
    torso: 12,
    head: -22,
    nearFist: at(10, 30),
    farFist: at(4, 32),
    face: 'hurt',
  },
  { ...blend(CROUCH, { ...CROUCH, hip: at(-3, 21), torso: 24 }, 0.6), face: 'hurt' },
];

const AIR_HIT_BASE: Pose = {
  hip: at(0, 40),
  torso: -38,
  head: -25,
  nearFoot: { x: 16, y: 20, angle: 15 },
  farFoot: { x: 9, y: 16, angle: 10 },
  nearFist: at(-8, 64),
  farFist: at(-14, 58),
  face: 'hurt',
};

const AIR_HIT: readonly Pose[] = [
  AIR_HIT_BASE,
  { ...AIR_HIT_BASE, spin: -35, hip: at(0, 44) },
  { ...AIR_HIT_BASE, torso: -20, spin: -75, hip: at(2, 44) },
];

/** Back hits the floor, legs still up. */
const FLOOR_IMPACT: Pose = {
  ...LYING,
  hip: at(2, 12),
  torso: -80,
  nearFoot: { x: 24, y: 16, angle: 40 },
  farFoot: { x: 20, y: 20, angle: 40 },
  // On the back, knees fold upward.
  bends: { nearKnee: 'up', farKnee: 'up' },
  face: 'hurt',
};

const FLOOR_BOUNCE: Pose = {
  ...LYING,
  hip: at(2, 15),
  torso: -76,
  nearFoot: { x: 27, y: 18, angle: 50 },
  farFoot: { x: 23, y: 22, angle: 50 },
  bends: { nearKnee: 'up', farKnee: 'up' },
  face: 'hurt',
};

/** Starts as the fighter lands from an air hit; ends on the feet, 40 ticks later. */
const KNOCKDOWN: readonly Pose[] = [
  FLOOR_IMPACT,
  FLOOR_BOUNCE,
  { ...LYING, face: 'hurt' },
  // Sitting up on the rear hand.
  {
    hip: at(-2, 8),
    torso: -50,
    head: 10,
    nearFoot: planted(20),
    farFoot: { x: 26, y: 6, angle: 60 },
    nearFist: at(10, 22),
    farFist: at(-16, 4),
    farHand: 'open',
    face: 'hurt',
  },
  // Kneeling, pushing on the knee.
  {
    hip: at(0, 22),
    torso: 26,
    head: 0,
    nearFoot: planted(12),
    farFoot: planted(-10, -40),
    nearFist: at(14, 30),
    farFist: at(6, 28),
    nearHand: 'open',
  },
  blend(GUARD, CROUCH, 0.4),
];

const KO: readonly Pose[] = [
  // Head thrown back hard.
  { ...HIT_SNAP, torso: -24, head: -30, hip: at(-4, 37), face: 'out' },
  // Falling backward, knees giving way.
  {
    hip: at(-6, 26),
    torso: -50,
    head: -10,
    nearFoot: planted(14),
    farFoot: planted(6),
    nearFist: at(-2, 46),
    farFist: at(-10, 44),
    face: 'out',
  },
  { ...FLOOR_IMPACT, face: 'out' },
  { ...FLOOR_BOUNCE, face: 'out' },
  LYING,
];

// ---------------------------------------------------------------------------------------------
// Attacks

/** Direct (standLight): lead jab. Hitbox 10..40 x 46..58: the fist front reaches ~39. */
const JAB_OUT: Pose = {
  ...GUARD,
  hip: at(3, 38),
  torso: 14,
  head: 8,
  nearFoot: planted(14),
  farFoot: planted(-11, -14),
  nearFist: at(34, 53),
  farFist: at(13, 63),
  face: 'shout',
  effects: [smear(5, [16, 58], [24, 55.5], [30, 54])],
};

const STAND_LIGHT: readonly Pose[] = [
  { ...blend(GUARD, JAB_OUT, 0.2), nearFist: at(15, 62), effects: [] },
  { ...blend(GUARD, JAB_OUT, 0.65), effects: [] },
  JAB_OUT,
  { ...blend(GUARD, JAB_OUT, 0.5), effects: [] },
  { ...blend(GUARD, JAB_OUT, 0.15), effects: [] },
];

/**
 * Crochet (standHeavy): stepping lead hook, on the camera side. Hitbox 10..54 x 44..62: the fist
 * reaches ~50 with a 10 px step (the drawing steps in place: the fighter itself does not move).
 */
const HOOK_OUT: Pose = {
  hip: at(10, 37),
  torso: 22,
  head: 10,
  nearFoot: planted(24),
  farFoot: planted(-6, -20),
  nearFist: at(48, 56),
  farFist: at(20, 62),
  face: 'shout',
  effects: [smear(7, [12, 60], [24, 63], [35, 61.5], [43, 58])],
};

const STAND_HEAVY: readonly Pose[] = [
  // Wind-up: shoulders turn away, lead fist drawn back and low.
  { ...GUARD, hip: at(-2, 38), torso: 2, nearFist: at(8, 58), farFist: at(10, 63) },
  { ...GUARD, hip: at(-3, 37), torso: -4, head: 8, nearFist: at(2, 56), farFist: at(9, 63) },
  // Swing starts with the step.
  {
    ...blend(GUARD, HOOK_OUT, 0.5),
    nearFist: at(24, 63),
    effects: [smear(5, [2, 58], [10, 62], [19, 63])],
  },
  HOOK_OUT,
  // Follow-through across the body.
  { ...HOOK_OUT, hip: at(9, 36), torso: 26, nearFist: at(36, 50), effects: [], face: 'calm' },
  { ...blend(HOOK_OUT, GUARD, 0.5), effects: [], face: 'calm' },
  { ...blend(HOOK_OUT, GUARD, 0.85), effects: [], face: 'calm' },
];

/** Coup bas (crouchLight): low snap kick. Hitbox 12..38 x 4..14: the toe reaches ~40. */
const LOW_KICK: Pose = {
  ...CROUCH,
  hip: at(-2, 22),
  torso: 40,
  head: -14,
  nearFoot: { x: 30, y: 8, angle: 0 },
  face: 'shout',
};

const CROUCH_LIGHT: readonly Pose[] = [
  { ...CROUCH, nearFoot: { x: 10, y: 11, angle: 0 } },
  { ...LOW_KICK, nearFoot: { x: 21, y: 9, angle: 0 }, face: 'calm' },
  LOW_KICK,
  { ...LOW_KICK, nearFoot: { x: 18, y: 8, angle: 0 }, face: 'calm' },
  blend(LOW_KICK, CROUCH, 0.8),
];

/** Balayage (crouchHeavy): sweep on the floor. Hitbox 12..52 x 2..14: the toe reaches ~50. */
const SWEEP: Pose = {
  hip: at(4, 18),
  torso: 55,
  head: -25,
  nearFoot: { x: 42, y: 5, angle: 0 },
  // Sitting on the rear heel: the hip is too low for a thigh pointing down.
  farFoot: planted(1, -40),
  nearFist: at(22, 32),
  farFist: at(16, 5),
  farHand: 'open',
  face: 'shout',
  effects: [smear(5, [8, 4], [22, 4], [36, 5])],
};

const CROUCH_HEAVY: readonly Pose[] = [
  { ...CROUCH, hip: at(0, 20), torso: 48, farFoot: planted(-4, -40) },
  // Rear hand to the floor.
  {
    ...CROUCH,
    hip: at(2, 18),
    torso: 52,
    head: -22,
    farFoot: planted(-1, -40),
    farFist: at(14, 6),
    farHand: 'open',
  },
  // Leg swinging around from behind.
  { ...SWEEP, nearFoot: { x: 20, y: 6, angle: 0 }, effects: [smear(4, [-8, 6], [4, 5], [14, 5])] },
  SWEEP,
  { ...SWEEP, nearFoot: { x: 34, y: 6, angle: 10 }, face: 'calm', effects: [] },
  { ...SWEEP, nearFoot: { x: 14, y: 7, angle: 0 }, face: 'calm', effects: [] },
  blend(SWEEP, CROUCH, 0.85),
];

/** Genou sauté (jumpLight): knee thrust. Hitbox 4..30 x 10..26 (from the feet). */
const KNEE: Pose = {
  ...AIR_GUARD,
  hip: at(2, 26),
  torso: 12,
  nearFoot: { x: 14, y: 10, angle: -20 },
  farFoot: { x: -2, y: 12, angle: -30 },
  face: 'shout',
};

const JUMP_LIGHT: readonly Pose[] = [
  AIR_GUARD,
  blend(AIR_GUARD, KNEE, 0.5),
  KNEE,
  blend(KNEE, AIR_GUARD, 0.6),
];

/** Coup de pied sauté (jumpHeavy): kick down and forward. Hitbox 2..36 x -4..18. */
const DIVE_KICK: Pose = {
  hip: at(2, 32),
  torso: -10,
  head: 4,
  nearFoot: { x: 26, y: 8, angle: -35 },
  farFoot: { x: -2, y: 18, angle: -20 },
  nearFist: at(-6, 50),
  farFist: at(8, 52),
  face: 'shout',
  effects: [smear(5, [10, 24], [18, 14], [23, 8])],
};

const JUMP_HEAVY: readonly Pose[] = [
  AIR_GUARD,
  // Knee chambered high.
  { ...AIR_GUARD, nearFoot: { x: 12, y: 24, angle: -10 }, torso: 4 },
  DIVE_KICK,
  { ...DIVE_KICK, nearFoot: { x: 24, y: 10, angle: -30 }, effects: [], face: 'calm' },
  blend(DIVE_KICK, AIR_GUARD, 0.7),
];

/** Onde sonore (special): sound gathered at the hip, pushed out with both palms. */
const WAVE_PUSH: Pose = {
  hip: at(5, 37),
  torso: 16,
  head: 6,
  nearFoot: planted(18),
  farFoot: planted(-10, -15),
  nearFist: at(24, 46),
  farFist: at(22, 42),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'down', farElbow: 'down' },
  face: 'shout',
};

const GATHER: Pose = {
  hip: at(-3, 36),
  torso: -2,
  head: 4,
  nearFoot: planted(10),
  farFoot: planted(-14, -10),
  nearFist: at(-4, 47),
  farFist: at(-6, 49),
  nearHand: 'open',
  farHand: 'open',
};

const SPECIAL: readonly Pose[] = [
  GATHER,
  { ...GATHER, effects: [energy(-2, 48, 2.5)] },
  { ...GATHER, hip: at(-4, 35), nearFist: at(-5, 46), effects: [energy(-2, 48, 4.2)] },
  { ...WAVE_PUSH, effects: [energy(30, 44, 6)] },
  { ...WAVE_PUSH, face: 'calm', effects: [energy(30, 44, 2.5)] },
  { ...blend(WAVE_PUSH, GUARD, 0.5), face: 'calm' },
  { ...blend(WAVE_PUSH, GUARD, 0.85), face: 'calm' },
];

/** Coup de pied fendu (specialForward): flying side kick. Hitbox 8..44 x 24..40. */
const FLYING_KICK: Pose = {
  hip: at(0, 38),
  torso: -30,
  head: 12,
  nearFoot: { x: 34, y: 34, angle: 80 },
  farFoot: { x: -4, y: 24, angle: -40 },
  nearFist: at(8, 56),
  farFist: at(-14, 52),
  face: 'shout',
  effects: [smear(6, [8, 37], [20, 36], [30, 35])],
};

const SPECIAL_FORWARD: readonly Pose[] = [
  { ...TAKEOFF, hip: at(0, 28), torso: 20, nearFist: at(16, 50), farFist: at(10, 48) },
  // Springing forward, rear leg pushing.
  {
    hip: at(4, 36),
    torso: 26,
    head: 8,
    nearFoot: { x: 16, y: 20, angle: -10 },
    farFoot: { x: -14, y: 11, angle: -40 },
    nearFist: at(18, 56),
    farFist: at(12, 54),
  },
  // Kicking leg chambered in the air.
  {
    hip: at(2, 40),
    torso: -12,
    head: 6,
    nearFoot: { x: 12, y: 30, angle: 30 },
    farFoot: { x: -6, y: 24, angle: -30 },
    nearFist: at(14, 58),
    farFist: at(-6, 56),
  },
  FLYING_KICK,
  // Lands forward.
  { ...LANDING, hip: at(6, 30), nearFoot: planted(17), farFoot: planted(-7, -15) },
  blend(
    { ...LANDING, hip: at(6, 30), nearFoot: planted(17), farFoot: planted(-7, -15) },
    GUARD,
    0.5,
  ),
  blend(
    { ...LANDING, hip: at(6, 30), nearFoot: planted(17), farFoot: planted(-7, -15) },
    GUARD,
    0.85,
  ),
];

/** Uppercut (specialAntiAir): rising fist, on tiptoes at the peak. Hitbox 4..30 x 30..100. */
const UPPERCUT_PEAK: Pose = {
  hip: at(5, 42),
  torso: -4,
  head: -20,
  nearFoot: planted(12, -25),
  farFoot: planted(-6, -35),
  nearFist: at(8, 92),
  farFist: at(12, 50),
  bends: { nearElbow: 'front' },
  face: 'shout',
};

const SPECIAL_ANTI_AIR: readonly Pose[] = [
  // Deep crouch, fist low.
  {
    hip: at(2, 23),
    torso: 30,
    head: -4,
    nearFoot: planted(12),
    farFoot: planted(-10, -15),
    nearFist: at(14, 26),
    farFist: at(14, 40),
  },
  // Exploding upward on tiptoes, fist driving up past the face.
  {
    hip: at(4, 42),
    torso: 6,
    head: -14,
    nearFoot: planted(12, -20),
    farFoot: planted(-7, -32),
    nearFist: at(14, 93),
    farFist: at(12, 50),
    bends: { nearElbow: 'front' },
    face: 'shout',
  },
  UPPERCUT_PEAK,
  { ...UPPERCUT_PEAK, hip: at(5, 41.5) },
  // Arm coming down.
  {
    ...GUARD,
    hip: at(4, 38),
    torso: 2,
    head: -6,
    nearFist: at(14, 72),
    bends: { nearElbow: 'front' },
  },
  blend({ ...GUARD, hip: at(4, 38), torso: 2 }, GUARD, 0.5),
  blend({ ...GUARD, hip: at(4, 38), torso: 2 }, GUARD, 0.85),
];

/** Projection (throw): grab the collar, pivot, hurl over the shoulder. Hitbox 6..26 x 20..60. */
const GRAB: Pose = {
  hip: at(4, 37),
  torso: 16,
  head: 8,
  nearFoot: planted(16),
  farFoot: planted(-10, -14),
  nearFist: at(25, 52),
  farFist: at(23, 46),
  face: 'smirk',
};

const THROW: readonly Pose[] = [
  {
    ...GRAB,
    nearFist: at(20, 54),
    farFist: at(18, 48),
    nearHand: 'open',
    farHand: 'open',
    face: 'calm',
  },
  GRAB,
  // Pivoting and lifting the opponent.
  {
    hip: at(0, 39),
    torso: -10,
    head: -6,
    nearFoot: planted(12),
    farFoot: planted(-12, -20),
    nearFist: at(12, 68),
    farFist: at(8, 66),
    bends: { nearElbow: 'front', farElbow: 'front' },
    face: 'shout',
  },
  // Hurled over the shoulder.
  {
    hip: at(-2, 38),
    torso: -26,
    head: -12,
    nearFoot: planted(10),
    farFoot: planted(-15, -10),
    nearFist: at(-8, 70),
    farFist: at(-12, 66),
    bends: { nearElbow: 'up', farElbow: 'up' },
    face: 'shout',
  },
  blend(GRAB, GUARD, 0.7),
];

// ---------------------------------------------------------------------------------------------
// Round poses

const RELAXED: Pose = {
  hip: at(0, 41),
  torso: 0,
  head: 0,
  nearFoot: planted(5),
  farFoot: planted(-6),
  nearFist: at(4, 45),
  farFist: at(-4, 46),
};

const INTRO: readonly Pose[] = [
  RELAXED,
  // Fists together at the chest...
  { ...RELAXED, nearFist: at(10, 60), farFist: at(8, 59) },
  // ...knuckles cracked.
  {
    ...RELAXED,
    hip: at(0, 41.6),
    nearFist: at(11, 61),
    farFist: at(9, 61),
    head: 6,
    face: 'smirk',
  },
  // Hand on the headphones.
  {
    ...RELAXED,
    nearFist: at(2, 64),
    nearHand: 'open',
    farFist: at(-6, 42),
    head: -4,
    bends: { nearElbow: 'front' },
  },
  {
    ...RELAXED,
    nearFist: at(2, 64),
    nearHand: 'open',
    farFist: at(-6, 42),
    head: -8,
    face: 'smirk',
    bends: { nearElbow: 'front' },
  },
  { ...GUARD, face: 'smirk' },
];

const FIST_UP: Pose = {
  ...RELAXED,
  hip: at(0, 41),
  head: -6,
  nearFist: at(8, 90),
  farFist: at(-6, 44),
  bends: { nearElbow: 'front' },
  face: 'smirk',
};

const VICTORY: readonly Pose[] = [
  { ...RELAXED, face: 'smirk' },
  { ...FIST_UP, nearFist: at(14, 70), face: 'smirk' },
  { ...FIST_UP, face: 'shout' },
  // Loop: a little bounce with the fist up.
  FIST_UP,
  { ...FIST_UP, hip: at(0, 39.8), nearFist: at(9, 88.5), face: 'shout' },
  { ...FIST_UP, hip: at(0, 40.4), nearFist: at(8.5, 89.3) },
];

/** Lost on time: hands on the knees, catching breath. */
const WINDED: Pose = {
  hip: at(-2, 31),
  torso: 48,
  head: 14,
  nearFoot: planted(10),
  farFoot: planted(-9),
  nearFist: at(14, 26),
  farFist: at(10, 24),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

const TIME_OVER: readonly Pose[] = [WINDED, { ...WINDED, hip: at(-2, 31.8), torso: 44 }];

type PosedSheet = Exclude<NayoSheet, 'projectile'>;

/** Poses of every strip; each list has exactly the strip's number of frames. */
export const NAYO_POSES: Readonly<Record<PosedSheet, readonly Pose[]>> = {
  idle: Array.from({ length: 6 }, (_, i) => idle(i)),
  walkForward: Array.from({ length: 8 }, (_, i) => walk(i, 8, 14)),
  walkBack: Array.from({ length: 8 }, (_, i) => walk(i, 8, -12)),
  crouch: Array.from({ length: 4 }, (_, i) => crouch(i)),
  jump: [TAKEOFF, RISING, APEX, FALLING, LANDING],
  jumpForward: FRONT_FLIP,
  block: BLOCK,
  hit: HIT,
  airHit: AIR_HIT,
  knockdown: KNOCKDOWN,
  ko: KO,
  standLight: STAND_LIGHT,
  standHeavy: STAND_HEAVY,
  crouchLight: CROUCH_LIGHT,
  crouchHeavy: CROUCH_HEAVY,
  jumpLight: JUMP_LIGHT,
  jumpHeavy: JUMP_HEAVY,
  special: SPECIAL,
  specialForward: SPECIAL_FORWARD,
  specialAntiAir: SPECIAL_ANTI_AIR,
  throw: THROW,
  intro: INTRO,
  victory: VICTORY,
  timeOver: TIME_OVER,
};

/** The flying sound wave: its hitbox is centered 43 px above the ground. */
export const NAYO_PROJECTILE: readonly Effect[] = [0, 0.25, 0.5, 0.75].map((phase) => ({
  kind: 'wave',
  center: at(0, 43),
  phase,
}));
