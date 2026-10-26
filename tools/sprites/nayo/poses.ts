/**
 * Nayo's key poses, frame by frame. Character space (see skeleton.ts): feet anchor at the
 * origin, x toward the opponent, y up; a flat foot on the ground has its ankle at y = 5.
 */

import type { NayoSheet } from '../../../src/art/nayo/sheets.ts';
import { blend, planted, type Foot, type Pose } from '../skeleton.ts';

/** A foot raised `height` pixels off the ground (a step). */
function lifted(foot: Foot, height: number): Foot {
  return { ...foot, y: foot.y + height };
}

/** Orthodox fighting stance: lead foot and fist forward, rear fist guarding the chin. */
const GUARD: Pose = {
  hip: { x: 0, y: 39 },
  torso: 8,
  head: 4,
  nearFoot: planted(11),
  farFoot: planted(-12, -12),
  nearFist: { x: 17, y: 64 },
  farFist: { x: 11, y: 62 },
};

const CROUCH: Pose = {
  hip: { x: 0, y: 22 },
  torso: 44,
  head: -18,
  nearFoot: planted(12),
  // Rear knee low but off the floor: a crouch, not a kneel.
  farFoot: planted(-11, -15),
  nearFist: { x: 24, y: 40 },
  farFist: { x: 18, y: 38 },
};

/** Knees pulled up to the chest, fists on the shins: the airborne ball for flips. */
const TUCK: Pose = {
  hip: { x: 0, y: 40 },
  torso: 30,
  head: 15,
  nearFoot: { x: 9, y: 27, angle: -30 },
  farFoot: { x: 3, y: 25, angle: -30 },
  nearFist: { x: 13, y: 49 },
  farFist: { x: 8, y: 48 },
};

const TAKEOFF: Pose = {
  hip: { x: 0, y: 26 },
  torso: 16,
  head: 2,
  nearFoot: planted(7),
  farFoot: planted(-6),
  nearFist: { x: 9, y: 34 },
  farFist: { x: -3, y: 36 },
};

const RISING: Pose = {
  hip: { x: 0, y: 40 },
  torso: 4,
  head: -4,
  nearFoot: { x: 4, y: 10, angle: -35 },
  farFoot: { x: -3, y: 12, angle: -35 },
  nearFist: { x: 12, y: 76 },
  farFist: { x: 6, y: 74 },
};

const APEX: Pose = {
  hip: { x: 0, y: 34 },
  torso: 18,
  head: 6,
  nearFoot: { x: 10, y: 21, angle: -20 },
  farFoot: { x: 4, y: 19, angle: -20 },
  nearFist: { x: 17, y: 56 },
  farFist: { x: 11, y: 54 },
};

const FALLING: Pose = {
  hip: { x: 0, y: 39 },
  torso: 10,
  head: 4,
  nearFoot: { x: 7, y: 8, angle: -20 },
  farFoot: { x: -5, y: 10, angle: -25 },
  nearFist: { x: 17, y: 62 },
  farFist: { x: 11, y: 60 },
};

const LANDING: Pose = {
  hip: { x: 0, y: 28 },
  torso: 14,
  head: 4,
  nearFoot: planted(10),
  farFoot: planted(-11),
  nearFist: { x: 17, y: 52 },
  farFist: { x: 11, y: 50 },
};

function idle(frame: number): Pose {
  const breath = Math.sin((frame / 6) * Math.PI * 2);
  const drop = 0.6 + 0.6 * breath;
  return {
    ...GUARD,
    hip: { x: GUARD.hip.x, y: GUARD.hip.y - drop },
    torso: GUARD.torso + breath * 0.8,
    nearFist: { x: GUARD.nearFist.x, y: GUARD.nearFist.y - drop * 0.8 },
    farFist: { x: GUARD.farFist.x + breath * 0.4, y: GUARD.farFist.y - drop * 0.8 },
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
    hip: { x: 0, y: GUARD.hip.y - bob },
    // Leaning in to advance, sitting back to retreat.
    torso: forward ? 10 : 4,
    nearFoot: lifted(planted(nearX), leadSwings ? lift : 0),
    farFoot: lifted(planted(farX, -12), leadSwings ? 0 : lift),
    nearFist: { x: GUARD.nearFist.x + (forward ? 1 : -1), y: GUARD.nearFist.y - bob },
    farFist: { x: GUARD.farFist.x, y: GUARD.farFist.y - bob + (forward ? 0 : 2) },
  };
}

function crouch(frame: number): Pose {
  if (frame === 0) return blend(GUARD, CROUCH, 0.45);
  if (frame === 1) return blend(GUARD, CROUCH, 0.85);
  const breath = frame === 3 ? 0.8 : 0;
  return { ...CROUCH, hip: { x: CROUCH.hip.x, y: CROUCH.hip.y - breath } };
}

const FRONT_FLIP: readonly Pose[] = [
  { ...blend(TAKEOFF, RISING, 0.6), torso: 28, head: 10 },
  { ...TUCK, spin: 70 },
  { ...TUCK, spin: 160 },
  { ...TUCK, spin: 250 },
  { ...TUCK, spin: 330 },
  FALLING,
];

/** Poses of every strip drawn so far; each list has exactly the strip's number of frames. */
export const NAYO_POSES: Readonly<Record<NayoSheet, readonly Pose[]>> = {
  idle: Array.from({ length: 6 }, (_, i) => idle(i)),
  walkForward: Array.from({ length: 8 }, (_, i) => walk(i, 8, 14)),
  walkBack: Array.from({ length: 8 }, (_, i) => walk(i, 8, -12)),
  crouch: Array.from({ length: 4 }, (_, i) => crouch(i)),
  jump: [TAKEOFF, RISING, APEX, FALLING, LANDING],
  jumpForward: FRONT_FLIP,
};
