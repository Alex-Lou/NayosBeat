import { at, GUARD, onBall, toeOf, type Effect, type Pose } from './common.ts';
import { atChin } from './crouch.ts';
import { dust } from './knockdown.ts';

export const ANIMATED: boolean = true;

/**
 * getup (docs/combat-v2.md §3.8, §11.1): 5 frames, 2 ticks each (10), the last 10 ticks of the
 * 40-tick knockdown, from the knockdown's last frame (the prowl: her crouch gone lower, on the
 * guard's footprint, the lead palm on the floor) up to the guard. The predator springs out of
 * her crouch, a sixth of a second, every frame a key:
 *
 * - 0: the drive: the lead palm shoves off the floor, the hand coming up off it, the hips rise
 *   and come forward; a spark of hers and a puff kicked up where the palm left the floor.
 * - 1: the rise: the chest comes up off the lead knee, the hips climb, the lead fist swings up
 *   to its place in front of the belly.
 * - 2: nearly up, still low and wide in the guard's footprint, the chest over the lead knee,
 *   both fists in the guard; a puff settling under the lead boot.
 * - 3: she springs up a touch past the guard: the hips higher, the chest pushed out at the
 *   opponent, the rear shoulder rolled up into the popped collar, the rear fist riding a hair
 *   high and forward under the chin, the elbow down. The swagger is in the body, the face stays
 *   focused (and in view: the fist stays under the jaw, never over the mouth).
 * - 4: the guard exactly: idle takes over without a pop.
 *
 * The feet never slide: both stand on the guard's marks from the prowl on, the lead one flat,
 * the rear one on its ball, only its heel coming down (70, 60, 48, 40, then the guard's 32
 * degrees) as the knee rises from under the hips; both knees bend toward the toes throughout,
 * as in her crouch. The rear arm stays as in the guard and the crouch (atChin, crouch.ts): the
 * elbow down on the ribs, the forearm up across the chest, the fist under the chin, riding with
 * the chest as it comes up. The head stays under 20 degrees on screen in every frame: the source
 * face.
 */

/** The ball of the guard's rear foot: it stays on that mark from the prowl to the guard. */
const REAR_TOE = toeOf(GUARD.nearFoot);

/** A small spark of hers (a diamond-sparkled star) where the palm drives off the floor. */
const spark = (radius: number): Effect => ({
  kind: 'flash',
  center: at(16, 2),
  radius,
  tone: 'sound',
});

/** 0: she drives off the lead palm, the hips rising forward, the hand coming off the floor. */
const DRIVE: Pose = atChin({
  hip: at(-11.5, 21),
  torso: 48,
  head: -36,
  shrug: 1.6,
  reach: { far: 1 },
  twist: 0.42,
  nearFoot: onBall(REAR_TOE, -60),
  farFoot: GUARD.farFoot,
  nearFist: at(0, 0),
  farFist: at(13.5, 11),
  bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
  farHand: 'open',
  face: 'focus',
  effects: [dust(17, 4, 0.4), spark(3)],
});

/** 1: the chest coming up off the lead knee, the lead fist swinging up to its place. */
const LIFT: Pose = atChin({
  hip: at(-9.6, 25.5),
  torso: 36,
  head: -25,
  shrug: 1.8,
  twist: 0.42,
  nearFoot: onBall(REAR_TOE, -48),
  farFoot: GUARD.farFoot,
  nearFist: at(0, 0),
  farFist: at(12, 28),
  bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
  face: 'focus',
  effects: [dust(17, 4, 0.8)],
});

/** 2: nearly up, low in the guard's footprint, the chest over the lead knee, the fists rising. */
const LOW: Pose = atChin(
  {
    hip: at(-7.8, 29.2),
    torso: 25,
    head: -14,
    shrug: 2,
    twist: 0.42,
    nearFoot: onBall(REAR_TOE, -40),
    farFoot: GUARD.farFoot,
    nearFist: at(0, 0),
    farFist: at(10, 39),
    bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
    face: 'focus',
    effects: [dust(10, 4, 0.15)],
  },
  0,
  -1.5,
);

/** 3: sprung up past the guard, the chest out, the rear fist a hair high under the chin. */
const RISE: Pose = atChin(
  {
    ...GUARD,
    hip: at(-6.4, 33.5),
    torso: 13,
    head: -4,
    shrug: 3.5,
    twist: 0.6,
    farFist: at(9, 49),
    effects: [dust(10, 4, 0.6)],
  },
  0.6,
  0.4,
);

export const POSES: readonly Pose[] = [DRIVE, LIFT, LOW, RISE, GUARD];
