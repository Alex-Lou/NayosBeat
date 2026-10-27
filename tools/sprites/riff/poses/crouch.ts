import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * crouch: 6 frames. 0-2 drop from the guard into the crouch (2 ticks each), 3-5 loop (8 ticks
 * each): her « get-down », a b-girl's deep squat before she hits the floor. The knees open wide
 * out of the guard's plié (the rear one turned out toward the camera, its thigh flat), the rear
 * heel up on the ball, ready to spin into a sweep; the chest leaning in over the lead knee, the
 * loaded rear fist still cocked by the ear, the lead fist up off the knee, a few pixels over and
 * in front of it, its knuckles against the background (on the knee, the black glove melted into
 * the black jeans). Low and wide, a predator on her haunches, never a duck. Her head tops out
 * about 52 px up (the crouching hurtbox is 50 tall: see the report on the boxes).
 *
 * The drop answers the stick: frame 0 already has most of the fall (the hips lead, the chest and
 * the fists a beat behind, the cocked fist left high); frame 1 sinks past the crouch, the chest
 * folding after the hips and the fists landing low; frame 2 rises back a hair, the fists
 * overshooting up. The clip also restarts on frame 0 when she settles back into the crouch after
 * a low move, a block or a hit: it is a near-crouch, from which the crouch is only a breath. Her
 * feet never move: the lead foot stays flat, the rear one pivots on its ball.
 *
 * The loop (24 ticks) rocks like her idle, in small: the hips rise 1.5 px and sit back, the rear
 * heel pumping up on its ball, the chest opens and the cocked fist rides up a frame late (4),
 * then she drops back in over the lead knee, the rear shoulder rolling into the collar (5), and
 * settles (3). It moves by whole sprite pixels and a degree or two of lean: nothing boils.
 * Frame 3 is the crouch at rest, where the crouching moves start and land.
 */

/** The rear foot's floor pixel: it pivots on it, the heel rising as she sinks. */
const TOE = toeOf(GUARD.nearFoot);

/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The rear fist cocked by the ear of `pose` as in the guard, moved by (dx, dy). */
function cocked(pose: Pose, dx = 0, dy = 0): Pose {
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  return { ...pose, nearFist: at(shoulder.x + COCKED.x + dx, shoulder.y + COCKED.y + dy) };
}

/** The head on screen, a hair more chin-down than the guard's: she looks up from under it. */
const HEAD = 11;

/**
 * The crouch at rest: the deep squat, the knees opened wide, the rear heel high, the lead fist
 * held up over the lead knee.
 */
export const CROUCH: Pose = cocked({
  ...GUARD,
  hip: at(-9, 13.4),
  torso: 27,
  head: HEAD - 27,
  shrug: 2.6,
  nearFoot: onBall(TOE, -20),
  farFoot: GUARD.farFoot,
  farFist: at(10, 28),
  twist: 0.4,
});

/** The crouch moved: hips by (dx, dy), the lean by `lean`, the fists by their own offsets. */
function sunk(
  dx: number,
  dy: number,
  lean: number,
  near: readonly [number, number],
  far: readonly [number, number],
  more: Partial<Pose> = {},
): Pose {
  const torso = CROUCH.torso + lean;
  return cocked(
    {
      ...CROUCH,
      hip: at(CROUCH.hip.x + dx, CROUCH.hip.y + dy),
      torso,
      head: HEAD - torso,
      farFist: at(CROUCH.farFist.x + dx + far[0], CROUCH.farFist.y + dy + far[1]),
      ...more,
    },
    near[0],
    near[1],
  );
}

// 0: most of the fall at once: the hips back and down, the chest still fairly upright, the cocked
// fist left high, the lead fist trailing above its place.
const DROP = sunk(0.4, 3, -4, [0.4, 1.6], [-0.9, 4.4], {
  shrug: 2.4,
  twist: 0.44,
  nearFoot: onBall(TOE, -17),
});
// 1: past the crouch: the hips low, the chest folding in after them, the fists landing low.
const LOW = sunk(-0.2, -1.2, 2, [-0.4, -1.2], [-0.6, -2], {
  shrug: 2.9,
  twist: 0.36,
  nearFoot: onBall(TOE, -23),
});
// 2: rising back a hair, the fists overshooting up.
const SETTLE = sunk(0, 0.5, 0.5, [0.2, 0.7], [0.2, 0.8]);

// The loop: 3 is CROUCH. 4: the hips rise and sit back a pixel, the chest opens, the cocked fist
// rides up a frame late.
const RISE = sunk(-0.5, 1.5, -1.5, [0.1, 0.2], [-0.5, 0.5], {
  twist: 0.5,
  shrug: 2.3,
  nearFoot: onBall(TOE, -26),
});
// 5: she drops back in over the lead knee, the rear shoulder rolling into the collar, the
// cocked fist trailing high from the rise.
const DROP_IN = sunk(0, -0.5, 1, [0.4, 0.6], [0.4, -0.8], {
  twist: 0.36,
  shrug: 3,
  reach: { near: 0.6 },
  nearFoot: onBall(TOE, -21),
});

export const POSES: readonly Pose[] = [DROP, LOW, SETTLE, CROUCH, RISE, DROP_IN];
