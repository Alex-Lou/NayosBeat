import { at, GUARD, planted, type Pose } from './common.ts';
import { onToes } from './hitHigh.ts';

/**
 * ko: 8 frames, 4,4,4,4,4,4,6 ticks then the last frame held. The blow snaps his head back out
 * of the high guard (the feet still in GUARD's footprint), the knees go, he topples backward
 * over the rear leg (away from the opponent), slams onto his back, bounces once and goes limp,
 * out cold. Lying poses stretch backward: the head toward negative x, the feet off the
 * opponent. The head turns past 20 degrees here (a fall): the face is closed, hurt then out.
 */

/**
 * Out cold: flat on his back, the head lolled back, chin in the air, the back of the skull on
 * the floor (a head kept up off it reads as a sit-up, not a knockout), both arms dead weight on
 * the floor at his sides (in reach, so they keep a soft bend; seen side on, an arm flung over the
 * head would go through it), legs limp. The hips sit a little higher than the slam's so that
 * the flatter back (the padded jacket is thicker at the shoulder blades) rests on the floor
 * without sinking into it.
 */
const OUT: Pose = {
  hip: at(-14, 6.9),
  torso: -84,
  head: -40,
  shrug: 0,
  nearFoot: { x: 15, y: 5.6, angle: 66 },
  farFoot: { x: 19.5, y: 5, angle: 76 },
  nearFist: at(-13, 5),
  farFist: at(-11, 4.3),
  bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'up', farKnee: 'up' },
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
    // The rear arm blown back and down past the hip, as far as a shoulder swings behind, a
    // slight bend left in it.
    farFist: at(-25.4, 33),
    bends: { nearElbow: 'down', farElbow: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 1 · Toppling back over the rear leg, which buckles (its heel comes up as the knee drops):
  // the lead foot kicks up off the floor. The arms lag: the lead hand still drifting forward
  // from the blow, the rear one swinging down and forward under the shoulder as the chest
  // falls away from it.
  {
    hip: at(-12, 31),
    torso: -32,
    head: -22,
    shrug: 0,
    twist: 0.2,
    nearFoot: { x: 9, y: 9, angle: 20 },
    farFoot: onToes(GUARD.farFoot, -35),
    nearFist: at(1, 54),
    farFist: at(-1.6, 39.8),
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
    // Both arms flung up past the head by the fall, loose at the elbows.
    nearFist: at(-24.8, 57.1),
    farFist: at(-40.4, 53.8),
    bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 3 · Slams onto his back: legs whip up, both arms slammed down onto the floor at his sides
  // by the impact: dead weight.
  {
    hip: at(-14, 6),
    torso: -80,
    head: -14,
    shrug: 0,
    nearFoot: { x: -1, y: 30, angle: 82 },
    farFoot: { x: 7, y: 25, angle: 76 },
    nearFist: at(-11.5, 3.8),
    farFist: at(-11, 4.4),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'up', farKnee: 'up' },
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
    nearFoot: { x: 5, y: 31, angle: 65 },
    farFoot: { x: 12, y: 26, angle: 68 },
    nearFist: at(-14, 28.5),
    farFist: at(-12.2, 8.3),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'up', farKnee: 'up' },
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
    farFist: at(-11, 4.3),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'out',
    effects: [
      { kind: 'dust', x: -36, size: 5, progress: 0.8 },
      { kind: 'dust', x: -10, size: 6, progress: 0.8 },
      { kind: 'dust', x: 16, size: 4, progress: 0.1 },
    ],
  },
  // 6 · Settles: the last of the bounce goes out of the limbs, the head rolling back onto the
  // floor.
  {
    ...OUT,
    head: -30,
    nearFoot: { x: 13, y: 8.5, angle: 50 },
    farFoot: { x: 19, y: 5.6, angle: 66 },
    effects: [{ kind: 'dust', x: 16, size: 4, progress: 0.55 }],
  },
  // 7 · Out cold (held).
  OUT,
];
