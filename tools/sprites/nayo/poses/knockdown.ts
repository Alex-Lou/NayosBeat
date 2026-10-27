import { at, planted, type Pose } from './common.ts';

/**
 * knockdown (docs/combat-v2.md §3.8, §11.1): 4 frames, 3, 3, 4, 20 ticks, the first 30 of the
 * 40-tick knockdown; the getup strip plays the last 10 (the kip-up). He slams onto his back
 * (slapping the floor like a trained fighter), bounces, then lies there with his head up,
 * ready to kip up. Lying poses stretch backward (head toward negative x) so his feet stay off
 * the opponent; the head turns past 20 degrees (RotSprite) only while he is on the floor.
 */

/** Flat on his back, head raised toward the opponent, knees up: ready to kip up. */
const LYING: Pose = {
  hip: at(-9, 6),
  torso: -80,
  head: 30,
  shrug: 0,
  nearFoot: planted(6, 0),
  farFoot: planted(13, 8),
  nearFist: at(-9, 11.5),
  farFist: at(-50, 5.2),
  bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

export const POSES: readonly Pose[] = [
  // 0 · Impact: the back slams the floor, legs fly up, the lead arm slaps the floor.
  {
    hip: at(-10, 6),
    torso: -80,
    head: -8,
    shrug: 0,
    nearFoot: { x: 2, y: 31, angle: 20 },
    farFoot: { x: 10, y: 26, angle: 30 },
    nearFist: at(-7, 3),
    farFist: at(-48, 5),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [
      { kind: 'dust', x: -34, size: 5, progress: 0.05 },
      { kind: 'dust', x: -6, size: 5.5, progress: 0.05 },
    ],
  },
  // 1 · Bounce: the whole body pops off the floor, limbs lagging.
  {
    hip: at(-10.5, 12.4),
    torso: -76,
    head: 24,
    shrug: 0,
    nearFoot: { x: 7, y: 32, angle: 10 },
    farFoot: { x: 14, y: 27, angle: 25 },
    nearFist: at(-8, 4),
    farFist: at(-46, 14),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [
      { kind: 'dust', x: -34, size: 5, progress: 0.4 },
      { kind: 'dust', x: -6, size: 5.5, progress: 0.4 },
    ],
  },
  // 2 · Drops back: legs come down, a second small puff.
  {
    hip: at(-9.5, 6),
    torso: -80,
    head: 22,
    shrug: 0,
    nearFoot: { x: 8, y: 9, angle: 10 },
    farFoot: { x: 17, y: 6.5, angle: 50 },
    nearFist: at(-8, 9),
    farFist: at(-49, 8),
    bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [
      { kind: 'dust', x: -34, size: 5, progress: 0.75 },
      { kind: 'dust', x: -6, size: 5.5, progress: 0.75 },
      { kind: 'dust', x: 17, size: 3.5, progress: 0.15 },
    ],
  },
  // 3 · Lying, held: the getup strip stands him up on the knockdown's last 10 ticks.
  LYING,
];
