import { at, planted, type Pose } from './common.ts';

/**
 * ko: 8 frames, 4,4,4,4,4,4,6 ticks then the last frame held. The blow snaps his head back,
 * the knees go, he topples backward (away from the opponent), slams onto his back, bounces
 * once and goes limp, out cold. Lying poses stretch backward: the head toward negative x.
 */

/** Out cold: flat on his back, head lolled, one arm flung over his head, legs limp. */
const OUT: Pose = {
  hip: at(-14, 6),
  torso: -80,
  head: 12,
  shrug: 0,
  nearFoot: { x: 15, y: 5.6, angle: 66 },
  farFoot: { x: 19.5, y: 5, angle: 76 },
  nearFist: at(-3, 4.5),
  farFist: at(-54, 6),
  bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
  nearHand: 'open',
  farHand: 'open',
  face: 'out',
};

export const POSES: readonly Pose[] = [
  // 0 · The head snaps back, the guard blown open, the knees unlock.
  {
    hip: at(-1.5, 35.5),
    torso: -12,
    head: -30,
    shrug: 0,
    twist: 0.4,
    nearFoot: planted(5.6),
    farFoot: planted(-13.5, -6),
    nearFist: at(11, 39),
    farFist: at(-20, 47),
    bends: { nearElbow: 'down', farElbow: 'down' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 1 · Toppling back: the lead leg buckles off the floor, arms trailing up.
  {
    hip: at(-4.5, 33),
    torso: -26,
    head: -26,
    shrug: 0,
    twist: 0.2,
    nearFoot: { x: 8, y: 8, angle: 20 },
    farFoot: planted(-13.5, 0),
    nearFist: at(9, 52),
    farFist: at(-12, 66),
    bends: { nearElbow: 'down', farElbow: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 2 · Falling: off his feet, legs swinging up, arms flung toward the sky.
  {
    hip: at(-9, 21),
    torso: -52,
    head: -20,
    shrug: 0,
    nearFoot: { x: 16, y: 20, angle: 30 },
    farFoot: { x: 3, y: 9, angle: 15 },
    nearFist: at(-10, 54),
    farFist: at(-22, 52),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 3 · Slams onto his back: legs whip up, arms flung back over his head.
  {
    hip: at(-14, 6),
    torso: -80,
    head: -14,
    shrug: 0,
    nearFoot: { x: -1, y: 30, angle: 20 },
    farFoot: { x: 7, y: 25, angle: 30 },
    nearFist: at(-32, 30),
    farFist: at(-52, 12),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'out',
    effects: [
      { kind: 'dust', x: -36, size: 5, progress: 0.05 },
      { kind: 'dust', x: -10, size: 6, progress: 0.05 },
    ],
  },
  // 4 · Bounces off the floor, limp.
  {
    hip: at(-14.5, 11),
    torso: -76,
    head: 14,
    shrug: 0,
    nearFoot: { x: 5, y: 31, angle: 10 },
    farFoot: { x: 12, y: 26, angle: 25 },
    nearFist: at(-26, 30),
    farFist: at(-50, 20),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'out',
    effects: [
      { kind: 'dust', x: -36, size: 5, progress: 0.45 },
      { kind: 'dust', x: -10, size: 6, progress: 0.45 },
    ],
  },
  // 5 · Drops back down, the legs flopping onto the floor.
  {
    hip: at(-14, 6),
    torso: -80,
    head: -8,
    shrug: 0,
    nearFoot: { x: 8, y: 14, angle: 30 },
    farFoot: { x: 15, y: 9.5, angle: 50 },
    nearFist: at(-16, 18),
    farFist: at(-53, 8),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'out',
    effects: [
      { kind: 'dust', x: -36, size: 5, progress: 0.8 },
      { kind: 'dust', x: -10, size: 6, progress: 0.8 },
      { kind: 'dust', x: 16, size: 4, progress: 0.1 },
    ],
  },
  // 6 · Settles: the last of the bounce goes out of the limbs.
  {
    ...OUT,
    head: 0,
    nearFoot: { x: 13, y: 8.5, angle: 50 },
    farFoot: { x: 19, y: 5.6, angle: 66 },
    nearFist: at(-6, 7),
    effects: [{ kind: 'dust', x: 16, size: 4, progress: 0.55 }],
  },
  // 7 · Out cold (held).
  OUT,
];
