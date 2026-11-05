import { at, GUARD, inReach, onBall, planted, smear, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * specialAntiAir (Plafonnier, docs/watt.md §5): 8 frames, 3, 3, [3, 3], 6, 6, 7, 7 ticks (38),
 * active frames 2-3 (ticks 6-11), hitbox x −4..24 / y 50..90; invincible to attacks from the
 * air on ticks 0-8. He catches the jumper above him and in front, both clamps open, then slams him
 * down in front of him: the arms shoot up (a green trail up from the shoulders), shut above the
 * bulb, then come down in one heavy arc to the floor in front.
 */

// Frame 0: the crouch, both clamps low, about to go up.
const CROUCH: Pose = {
  ...GUARD,
  hip: at(-9.5, 33.5),
  torso: 8,
  head: -14,
  shrug: 3.4,
  nearFoot: onBall(-18, -26),
  nearFist: at(0.5, 45),
  farFist: at(9, 46.5),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
};

// Frame 1: the arms going up, the body rising.
const RISE: Pose = {
  ...GUARD,
  hip: at(-6.5, 38),
  torso: 2,
  head: -16,
  shrug: 1.6,
  nearFist: at(6, 68),
  farFist: at(11, 69),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
  effects: [smear(2.5, [4, 50], [5, 59], [6, 68]), smear(2.5, [12, 50], [11, 59], [11, 69])],
};

// Frames 2-3 (active): the catch, both clamps open above the bulb, then shut on the jumper.
const CATCH: Pose = {
  ...RISE,
  hip: at(-4.5, 39),
  torso: -2,
  head: -18,
  nearFist: at(9, 77.5),
  farFist: at(15.5, 80),
  face: 'kiai',
  effects: [
    smear(2, [6, 68], [7.5, 73], [9, 77.5]),
    smear(2, [11, 69], [13, 75], [15.5, 80]),
    { kind: 'plasma', center: at(13, 80), radius: 4.5, tone: 'sound' },
    { kind: 'arc', from: at(7, 76), to: at(17, 81), spread: 3.0 },
    { kind: 'ring', center: at(13, 80), radius: 10, progress: 0.25, tone: 'sound' },
  ],
  glows: [{ center: at(13, 80), reach: 28, power: 1.2, tone: 'sound' }],
};

const SHUT: Pose = {
  ...CATCH,
  nearHand: 'fist',
  farHand: 'fist',
  effects: [
    { kind: 'flash', center: at(13, 80), radius: 4.5, tone: 'sound' },
    { kind: 'arc', from: at(8, 77), to: at(16, 80), spread: 2.5 },
  ],
  glows: [{ center: at(13, 80), reach: 24, power: 1.0, tone: 'sound' }],
};

// Frames 4-5: the slam, the arms coming down in front in one heavy arc.
const SLAM: Pose = {
  ...GUARD,
  hip: at(-3.5, 36),
  torso: 14,
  shrug: 3,
  nearFist: at(11, 62),
  farFist: at(16, 61),
  face: 'effort',
  effects: [smear(3, [2, 72], [8, 70], [12, 64]), smear(3, [7, 73], [13, 70], [16, 61])],
};

const DOWN: Pose = {
  ...GUARD,
  hip: at(-2.5, 33),
  torso: 26,
  shrug: 3.4,
  nearFoot: onBall(-16, -24),
  farFoot: planted(11.5, 0),
  nearFist: at(14, 42),
  farFist: at(18.5, 41),
  effects: [
    { kind: 'ring', center: at(16, 4), radius: 12, progress: 0.35, squash: 0.3, tone: 'sound' },
    { kind: 'dust', x: 16, size: 1.4, progress: 0.4 },
  ],
};

// Frames 6-7: back up into the guard.
const UP: Pose = { ...GUARD, hip: at(-8, 35.5), torso: 11 };

export const POSES: readonly Pose[] = [CROUCH, RISE, CATCH, SHUT, SLAM, DOWN, UP, GUARD].map(
  inReach,
);
