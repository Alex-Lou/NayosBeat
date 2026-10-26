import { at, ease, GUARD, planted, smear, tween, type Effect, type Pose } from './common.ts';

/**
 * specialAntiAir, the uppercut "le drop". Ticks 3,[3],[5],4,4,4,4,4,4,4 (active: frames 1-2).
 *
 * The bass drop as an uppercut. He sinks into a deep coil (the lead fist cocked at the hip, the
 * beat hitting the floor as a sound shockwave), then everything releases at once: the back toe
 * drives, the lead knee rises, the lead fist rips up the front of the body to above his head
 * (hitbox top, y ~100) while the rear fist yanks back to the hip as a counterweight. A sound
 * column shoots up in front of him, right under the fist, through the airborne opponent.
 *
 * Line of action: a tight C curled over the lead knee on the dip, one straight diagonal from the
 * back toe to the fist on the launch, a slight backward arc at the peak (chin up, legs tucked,
 * airborne). Then a short hang, the fist swings forward and down into a high guard while he
 * falls, a deep landing, a bounce a hair past the guard as the lead shoulder rolls back up into
 * the shell, and he settles. The column falls back like an equalizer bar as he comes down.
 *
 * Faces: focus, effort on the launch, kiai only at the peak, focus again from the hang on.
 */

const ring = (x: number, y: number, radius: number, progress: number, squash?: number): Effect => ({
  kind: 'ring',
  center: at(x, y),
  radius,
  progress,
  tone: 'sound',
  ...(squash === undefined ? {} : { squash }),
});

/** The drop hitting the floor: a flat sound shockwave spreading from between the feet. */
const floorRing = (progress: number): Effect => ring(2, 1.5, 26, progress, 0.3);

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/**
 * The sound column, standing on the floor in the middle of the hitbox (in front of the body, so
 * it never hides the punching arm), from `bottom` up to `top` (world y).
 */
const column = (bottom: number, top: number, width: number, progress: number): Effect => ({
  kind: 'column',
  base: at(21, bottom),
  height: (top - bottom) / (0.4 + 0.6 * progress),
  width,
  progress,
});

// 0 - The dip (3 ticks): low on both legs, curled over the lead knee, the lead shoulder dropped
// and the lead fist cocked back at the hip (elbow behind), the chest opened toward us. Rear fist
// in front of the chin, eyes up on the target.
const DIP: Pose = {
  hip: at(-6, 26.5),
  torso: 27,
  head: -15,
  shrug: 0.4,
  twist: 0.5,
  nearFoot: planted(5.6),
  farFoot: planted(-12.8, -16),
  nearFist: at(-4, 29.5),
  farFist: at(17, 47.5),
  bends: { nearElbow: 'back', farElbow: 'down' },
};

// 1 - The launch (3 ticks, active): uncoiled in one line from the back toe (still pivoting on
// the floor) to the fist above the head; the lead knee starts driving up, the chin tucked behind
// the rising lead shoulder, the rear fist snapped back to the hip.
const LAUNCH: Pose = {
  hip: at(-0.5, 44.5),
  torso: 13,
  head: 4,
  shrug: 3.6,
  reach: { near: 2.5 },
  twist: -0.3,
  nearFoot: { x: 7.5, y: 12.5, angle: -40 },
  farFoot: planted(-9, -55),
  nearFist: at(16, 91),
  farFist: at(-6, 47.5),
  bends: { nearElbow: 'front', farElbow: 'back' },
  face: 'effort',
};

// 2 - The peak (5 ticks, active): off the floor, lead knee high, toes pointed, the body arched
// a touch back under the fist, chin up. The shout.
const PEAK: Pose = {
  hip: at(1, 47.5),
  torso: -5,
  head: -12,
  shrug: 3.5,
  reach: { near: 3 },
  twist: -0.5,
  nearFoot: { x: 8, y: 23, angle: -35 },
  farFoot: { x: -9.5, y: 13, angle: -50 },
  nearFist: at(12.5, 95),
  farFist: at(-6, 50.5),
  bends: { nearElbow: 'front', farElbow: 'back' },
  face: 'kiai',
};

// 3 - Hang time: barely lower, the arm relaxing, the knee starting to drop.
const HANG: Pose = {
  hip: at(1, 46),
  torso: -3,
  head: -6,
  shrug: 3.5,
  reach: { near: 2 },
  twist: -0.4,
  nearFoot: { x: 8, y: 20, angle: -30 },
  farFoot: { x: -10, y: 11.5, angle: -45 },
  nearFist: at(11.5, 91),
  farFist: at(-5, 52),
  bends: { nearElbow: 'front', farElbow: 'back' },
};

// 4 - Coming down: the fist swings forward and down into a high guard, the rear hand comes
// back in front of the chest, the back toe reaches the floor first (where it took off).
const FALL: Pose = {
  hip: at(-0.5, 40.5),
  torso: 3,
  head: 4,
  shrug: 3,
  twist: -0.2,
  nearFoot: { x: 6, y: 9, angle: -10 },
  farFoot: planted(-12, -30),
  nearFist: at(18, 71),
  farFist: at(5, 55),
  bends: { nearElbow: 'down', farElbow: 'down' },
};

// 5 - Landing: both feet back on their guard marks, the knees soaking up the drop.
const LAND: Pose = {
  hip: at(-3.5, 31),
  torso: 10,
  head: 6,
  shrug: 2.4,
  twist: 0,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5, -10),
  nearFist: at(13, 52.5),
  farFist: at(6, 55),
};

// 6 - Rising out of the landing, hands finding the shell.
const RISE: Pose = {
  hip: at(-3.5, 35.5),
  torso: 3,
  head: 9,
  shrug: 3,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5, -4),
  nearFist: at(10, 45.5),
  farFist: at(7.5, 60),
};

// 7 - A hair past the guard: up on the bounce, the lead shoulder rolling back up to the chin.
const ROLL: Pose = {
  ...GUARD,
  hip: at(-3.4, 37.6),
  torso: -3,
  head: 11,
  shrug: 4.2,
  nearFist: at(8, 43.5),
  farFist: at(7.4, 62.4),
};

export const POSES: readonly Pose[] = [
  { ...DIP, effects: [floorRing(0.1), dust(6, 3.6, 0.15), dust(-13, 3.2, 0.2)] },
  {
    ...LAUNCH,
    effects: [
      // The fist's path from the hip up the front of the body (behind the body, so only what
      // sticks out of the silhouette shows).
      smear(5, [-3, 31], [6, 44], [13.5, 62], [16.5, 79], [16, 89]),
      column(0, 82, 10, 0.2),
      floorRing(0.45),
      dust(7, 3.6, 0.5),
      dust(-14, 3.2, 0.55),
      { kind: 'flash', center: at(15.5, 97), radius: 4, tone: 'strike' },
    ],
  },
  {
    ...PEAK,
    effects: [
      smear(6, [1, 37], [9.5, 52], [15.5, 70], [15.5, 85], [12.5, 94]),
      column(0, 98, 11, 0.45),
      floorRing(0.75),
      dust(8, 3.6, 0.85),
      dust(-15, 3.2, 0.9),
      { kind: 'flash', center: at(13.5, 100.5), radius: 6, tone: 'strike' },
    ],
  },
  { ...HANG, effects: [column(0, 100, 9, 0.7), floorRing(0.95)] },
  // The column falls back and thins out like an equalizer bar after the drop.
  { ...FALL, effects: [column(0, 70, 7, 0.85)] },
  { ...LAND, effects: [column(0, 30, 4, 0.95), dust(8, 3.6, 0.2), dust(-14, 3.2, 0.25)] },
  { ...RISE, effects: [dust(9, 3.6, 0.6), dust(-15, 3.2, 0.65)] },
  ROLL,
  // 8-9 - Settling into the shell; the last frame is the guard itself.
  tween(ROLL, GUARD, 0.6, ease.inOut),
  GUARD,
];
