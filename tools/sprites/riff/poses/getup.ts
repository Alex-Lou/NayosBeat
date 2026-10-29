import { at, GUARD, onBall, planted, toeOf, type Effect, type Pose } from './common.ts';
import { dust } from './knockdown.ts';

export const ANIMATED: boolean = true;

/**
 * getup (docs/combat-v2.md §3.8, §11.1): 5 frames, 2 ticks each (10), the last 10 ticks of the
 * 40-tick knockdown, from the knockdown's last frame (the prowl: low on the guard's footprint,
 * the rear palm on the floor) up to the guard. The predator springs out of her crouch, a sixth
 * of a second, every frame a key:
 *
 * - 0: the drive: the palm shoves the floor, the hips rise and come forward, the rear arm swung
 *   back straight from the push, the lead leg pressing on its flat foot; a spark of hers and a
 *   puff kicked up where the palm left the floor.
 * - 1: the step: the lead boot swings out for its mark, low over the floor, the rear fist on its
 *   way back up to load, the chest coming up.
 * - 2: the lead boot lands on its mark, low and wide right in the guard's footprint, a deep
 *   plié, the chest over the lead knee, the fists coming up (the rear one swinging back to its
 *   place, the lead one out low); a puff under the lead boot.
 * - 3: she springs up a touch past the guard: the hips higher, the chest pushed out at the
 *   opponent, the rear shoulder rolled up into the popped collar, the cocked fist overshooting
 *   above her ear. The swagger is in the body, the face stays focused.
 * - 4: the guard exactly: idle takes over without a pop.
 *
 * The feet never slide: the rear foot stays on its ball on the guard's mark from the prowl on,
 * only its heel coming down (35, 28, 20 then the guard's 12 degrees), its knee turned out in the
 * plié up to the spring (3), where it comes forward as the leg straightens; the lead foot pushes where the roll
 * set it down, then steps onto its mark. The head stays under 20 degrees on screen in every
 * frame: the source face.
 */

/** The ball of the guard's rear foot: it stays on that mark from the prowl to the guard. */
const REAR_TOE = toeOf(GUARD.nearFoot);

/** A small spark of hers (a diamond-sparkled star) where the palm drives off the floor. */
const spark = (radius: number): Effect => ({
  kind: 'flash',
  center: at(9, 2),
  radius,
  tone: 'sound',
});

/** 0: she drives off the palm, the hips rising forward, the rear hand thrown back off the floor. */
const DRIVE: Pose = {
  hip: at(-12.5, 18),
  torso: 50,
  head: -34,
  shrug: 1.5,
  twist: 0.45,
  nearFoot: onBall(REAR_TOE, -28),
  farFoot: planted(-2),
  nearFist: at(-11, 17),
  farFist: at(3, 27),
  bends: { nearKnee: 'back', farKnee: 'front', nearElbow: 'back', farElbow: 'down' },
  nearHand: 'open',
  face: 'focus',
  effects: [dust(9, 4, 0.4), spark(3)],
};

/** 1: the lead boot swings out for its mark, the rear fist coming back up to load. */
const STEP: Pose = {
  hip: at(-9.5, 22),
  torso: 38,
  head: -24,
  shrug: 1.5,
  twist: 0.45,
  nearFoot: onBall(REAR_TOE, -20),
  farFoot: { x: 4, y: 8, angle: 12 },
  nearFist: at(-15, 32),
  farFist: at(6, 33),
  bends: { nearKnee: 'back', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
  face: 'focus',
  effects: [dust(9, 4, 0.8)],
};

/** 2: the lead boot lands on its mark, low and wide in the guard's footprint, the fists rising. */
const LAND: Pose = {
  hip: at(-7.5, 21.5),
  torso: 30,
  head: -12,
  shrug: 1.5,
  twist: 0.4,
  nearFoot: GUARD.nearFoot,
  farFoot: GUARD.farFoot,
  nearFist: at(-17, 44),
  farFist: at(8, 37),
  bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'back' },
  face: 'focus',
  effects: [dust(10, 4, 0.15)],
};

/** 3: sprung up past the guard, the chest out, the cocked fist overshooting. */
const RISE: Pose = {
  ...GUARD,
  hip: at(-6.4, 33.5),
  torso: 13,
  head: -4,
  shrug: 3.5,
  twist: 0.6,
  nearFist: at(-13, 62),
  farFist: at(9, 49),
  effects: [dust(10, 4, 0.6)],
};

export const POSES: readonly Pose[] = [DRIVE, STEP, LAND, RISE, GUARD];
