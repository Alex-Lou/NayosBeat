import { at, GUARD, planted, type Pose } from './common.ts';

/**
 * ko: 8 frames, 4,4,4,4,4,4,6 ticks then the last frame held. The blow snaps his head back out
 * of the high guard (the feet still in GUARD's footprint), the knees go, he topples backward
 * over the rear leg (away from the opponent), slams onto his back, bounces once and goes limp,
 * out cold. Lying poses stretch backward: the head toward negative x, the feet off the
 * opponent. The head turns past 20 degrees here (a fall): the face is closed, hurt then out.
 */

/**
 * Out cold: flat on his back, head lolled, the rear arm flung over his head, the lead one dead
 * weight on the floor at his side (in reach, so it keeps a soft bend), legs limp.
 */
const OUT: Pose = {
  hip: at(-14, 6),
  torso: -80,
  head: 12,
  shrug: 0,
  nearFoot: { x: 15, y: 5.6, angle: 66 },
  farFoot: { x: 19.5, y: 5, angle: 76 },
  nearFist: at(-13, 5),
  farFist: at(-54, 6),
  bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
  nearHand: 'open',
  farHand: 'open',
  face: 'out',
};

export const POSES: readonly Pose[] = [
  // 0 · The blow snaps the head back out of the high guard: the gloves blown open and apart,
  // the chest thrown up, the hips knocked back over the rear foot, the knees unlocking.
  {
    hip: at(-8.6, 35.2),
    torso: -16,
    head: -24,
    shrug: 0,
    twist: 0.4,
    // Rocked back onto the lead heel, the toes coming up.
    nearFoot: planted(GUARD.nearFoot.x, 8),
    farFoot: GUARD.farFoot,
    nearFist: at(8.5, 49),
    // The rear arm blown back below the head line, a slight bend left in it.
    farFist: at(-33, 50),
    bends: { nearElbow: 'down', farElbow: 'down' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 1 · Toppling back over the rear leg, which buckles: the lead foot kicks up off the floor.
  // The arms lag: the lead hand still drifting forward from the blow, the rear one trailing
  // back below the shoulders.
  {
    hip: at(-12, 31),
    torso: -32,
    head: -22,
    shrug: 0,
    twist: 0.2,
    nearFoot: { x: 9, y: 9, angle: 20 },
    farFoot: planted(GUARD.farFoot.x, -4),
    nearFist: at(1, 54),
    farFist: at(-32, 49),
    bends: { nearElbow: 'down', farElbow: 'down' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 2 · Falling: off his feet, legs swinging up, arms flung toward the sky.
  {
    hip: at(-14, 20),
    torso: -55,
    head: -18,
    shrug: 0,
    nearFoot: { x: 14, y: 20, angle: 30 },
    farFoot: { x: 1, y: 10, angle: 15 },
    nearFist: at(-14, 54),
    farFist: at(-27, 50),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 3 · Slams onto his back: legs whip up, the rear arm flung back over his head, the lead one
  // whipped down across the body by the impact and draped there, the hand dangling: dead weight.
  {
    hip: at(-14, 6),
    torso: -80,
    head: -14,
    shrug: 0,
    nearFoot: { x: -1, y: 30, angle: 20 },
    farFoot: { x: 7, y: 25, angle: 30 },
    nearFist: at(-17, 17),
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
  // 4 · Bounces off the floor, limp: the lead arm lifted by the bounce, not by him.
  {
    hip: at(-14.5, 11),
    torso: -76,
    head: 14,
    shrug: 0,
    nearFoot: { x: 5, y: 31, angle: 10 },
    farFoot: { x: 12, y: 26, angle: 25 },
    nearFist: at(-17, 21),
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
  // 5 · Drops back down, the legs flopping onto the floor, the lead arm sliding off the body and
  // slapping down on the floor at his side.
  {
    hip: at(-14, 6),
    torso: -80,
    head: -8,
    shrug: 0,
    nearFoot: { x: 8, y: 14, angle: 30 },
    farFoot: { x: 15, y: 9.5, angle: 50 },
    nearFist: at(-14, 6),
    farFist: at(-53, 8),
    bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
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
    effects: [{ kind: 'dust', x: 16, size: 4, progress: 0.55 }],
  },
  // 7 · Out cold (held).
  OUT,
];
