import { at, GUARD, planted, type Pose } from './common.ts';

/**
 * knockdown: 9 frames, 3,3,4,10,4,4,4,4,4 ticks (40, the knockdown time). He slams onto his
 * back (slapping the floor like a trained fighter), bounces, lies there a beat with his head
 * up, then kips up: rolls onto his shoulders, whips the legs over, springs up and lands in a
 * low crouch on a sound ring (the beat drops), rises a touch proud and settles into the shell.
 * Lying poses stretch backward (head toward negative x) so his feet stay off the opponent.
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

/** Rolled back onto the shoulders, legs swung up over him, palms flat by the ears. */
const CHAMBER: Pose = {
  hip: at(-14, 19.5),
  torso: -120,
  head: 88,
  shrug: 0,
  nearFoot: { x: -29, y: 49, angle: 80 },
  farFoot: { x: -33, y: 46, angle: 70 },
  nearFist: at(-37, 6),
  farFist: at(-40, 6),
  bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'back', farKnee: 'back' },
  nearHand: 'open',
  farHand: 'open',
  face: 'focus',
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
  // 3 · Lying (held 10 ticks).
  LYING,
  // 4 · Chamber: rocks back onto the shoulders.
  CHAMBER,
  // 5 · Kip: legs whip over and under, the push launches him up in a tuck, arms swinging in.
  {
    hip: at(-5, 27),
    torso: -24,
    head: 2,
    shrug: 1,
    nearFoot: { x: -2, y: 11, angle: -30 },
    farFoot: { x: -9, y: 13.5, angle: -40 },
    nearFist: at(5, 44),
    farFist: at(-5, 50),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front', farKnee: 'front' },
    face: 'effort',
    effects: [
      { kind: 'speed', center: at(-13, 15), length: 10, spread: 5, direction: 55, tone: 'sound' },
    ],
  },
  // 6 · Lands low, arms swinging into a crouched guard, eyes on the opponent.
  {
    hip: at(-6, 24.5),
    torso: 16,
    head: -19,
    shrug: 2,
    nearFoot: planted(5.6),
    farFoot: planted(-13.5, -16),
    nearFist: at(11, 37),
    farFist: at(7, 48),
    bends: { nearElbow: 'down', farElbow: 'down' },
    face: 'focus',
    effects: [
      { kind: 'dust', x: 8, size: 4, progress: 0.15 },
      { kind: 'dust', x: -15, size: 4, progress: 0.15 },
      { kind: 'ring', center: at(-4, 1), radius: 22, progress: 0.15, tone: 'sound', squash: 0.3 },
    ],
  },
  // 7 · Rises a touch proud, the shoulder rolling in.
  {
    ...GUARD,
    hip: at(-3.4, 38.6),
    torso: -6,
    head: 6,
    shrug: 4.6,
    nearFist: at(5.5, 45),
    farFist: at(5, 63.5),
    face: 'cool',
    effects: [
      { kind: 'dust', x: 8, size: 4, progress: 0.6 },
      { kind: 'dust', x: -15, size: 4, progress: 0.6 },
      { kind: 'ring', center: at(-4, 1), radius: 22, progress: 0.6, tone: 'sound', squash: 0.3 },
    ],
  },
  // 8 · Back in the shell, the last of the ring fading out.
  {
    ...GUARD,
    effects: [
      { kind: 'ring', center: at(-4, 1), radius: 22, progress: 0.92, tone: 'sound', squash: 0.3 },
    ],
  },
];
