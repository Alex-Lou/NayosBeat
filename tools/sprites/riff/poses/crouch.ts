import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * crouch: 6 frames. 0-2 drop from the guard into the crouch (2 ticks each), 3-5 loop (8 ticks
 * each): her « get-down », a b-girl's low crouch before she hits the floor. A sprinter's set,
 * not a kneel: the rear knee driven forward and down under her hips, floating a few pixels off
 * the floor (never on it: a kneel is Nayo's), the rear shin running back almost level to the
 * boot up on its ball, the heel high; the lead knee up over its flat foot, the shin upright. Both
 * knees bend the way knees bend, toward the toes: seen from the side, the rear thigh, shin and
 * foot make a Z, the lead leg an upturned V. The chest leans in over the lead knee, the rear
 * arm as in her guard (atChin): the elbow down on the ribs, the forearm up across the chest, the
 * fist tucked under the chin, the face clear above it; the lead fist up off the knee, a few
 * pixels over and in front of it, its knuckles against the background. Low and long, a
 * predator ready to pounce, never a duck. Her head tops out about 54 px up (the crouching
 * hurtbox is 57.5 tall: see the report on the boxes).
 *
 * The rear boot on its ball keeps its ankle open (MIN_ANKLE, common.ts): the lower the knee
 * drops, the flatter the shin and the higher the heel, about 70 degrees up at rest. Her feet
 * never move: the lead foot stays flat on its print, the rear one pivots on the ball the guard
 * stands on, so the drop out of the guard and the release back into it never slide a foot.
 *
 * The drop answers the stick: frame 0 already has most of the fall (the hips lead, the chest and
 * the fists a beat behind, the rear fist left high); frame 1 sinks past the crouch, the chest
 * folding after the hips and the fists landing low, the rear knee at its lowest, still clear of
 * the floor; frame 2 rises back a hair, the fists overshooting up. The clip also restarts on
 * frame 0 when she settles back into the crouch after a low move, a block or a hit: it is a
 * near-crouch, from which the crouch is only a breath.
 *
 * The loop (24 ticks) rocks like her idle, in small: the hips rise 1.5 px and sit back, the rear
 * heel easing down a few degrees as the knee comes up, the chest opens and the rear fist rides
 * up a frame late (4), then she drops back in over the lead knee, the rear shoulder rolling into
 * the collar, the heel up again (5), and settles (3). It moves by whole sprite pixels and a
 * degree or two of lean: nothing boils. Frame 3 is the crouch at rest, where the crouching moves
 * start and land.
 */

/** The rear foot's floor pixel, the guard's: it pivots on it, the heel rising as she sinks. */
const TOE = toeOf(GUARD.nearFoot);

/** Where the rear fist sits from the rear shoulder in the guard: under the chin. */
const CHIN = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/**
 * `pose` with its rear fist under the chin as in the guard, moved by (dx, dy) in world pixels.
 * The arm rides with the chest: the guard's place of the fist from the rear shoulder is turned
 * with the lean past the guard's, so the deeper she leans in, the lower and the further back the
 * fist tucks in under the chin, the elbow down on the ribs (carried unturned, at the crouch's
 * 35 degrees it sat on her mouth). The crouch, the moves that land in it, the prowl and the
 * getup share it.
 */
export function atChin(pose: Pose, dx = 0, dy = 0): Pose {
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  const turn = ((pose.torso - GUARD.torso) * Math.PI) / 180;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  return {
    ...pose,
    nearFist: at(
      shoulder.x + CHIN.x * c + CHIN.y * s + dx,
      shoulder.y - CHIN.x * s + CHIN.y * c + dy,
    ),
  };
}

/** The head on screen, a hair more chin-down than the guard's: she looks up from under it. */
const HEAD = 11;

/** The rear heel at rest (degrees up, negative): high, the shin nearly level. */
const HEEL = -70;

/**
 * The crouch at rest: the rear knee forward and low, floating over the floor, the rear heel
 * high; the lead knee up, the lead fist held up over it.
 */
export const CROUCH: Pose = atChin({
  ...GUARD,
  hip: at(-13, 17.5),
  torso: 35,
  head: HEAD - 35,
  shrug: 2.6,
  nearFoot: onBall(TOE, HEEL),
  farFoot: GUARD.farFoot,
  farFist: at(10, 29),
  twist: 0.4,
  // Both knees toward the toes, as in the guard.
  bends: { ...GUARD.bends, nearKnee: 'front' },
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
  return atChin(
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

// 0: most of the fall at once: the hips back and down, the chest still fairly upright, the rear
// fist left high, the lead fist trailing above its place, the rear heel on its way up.
const DROP = sunk(1, 3, -5, [0.4, 0.8], [-0.9, 4.4], {
  shrug: 2.4,
  twist: 0.44,
  nearFoot: onBall(TOE, -63),
});
// 1: past the crouch: the hips low, the chest folding in after them, the fists landing low; the
// rear knee at its lowest, the heel at its highest.
const LOW = sunk(-0.6, -1, 2, [-0.4, -1.2], [-0.6, -2], {
  shrug: 2.9,
  twist: 0.36,
  nearFoot: onBall(TOE, -74),
});
// 2: rising back a hair, the fists overshooting up.
const SETTLE = sunk(0, 0.5, 0.5, [0.2, 0.7], [0.2, 0.8], { nearFoot: onBall(TOE, -69) });

// The loop: 3 is CROUCH. 4: the hips rise and sit back a pixel, the chest opens, the rear fist
// rides up a frame late; the rear knee comes up and the heel eases down.
const RISE = sunk(-0.5, 1.5, -1.5, [0.1, 0.2], [-0.5, 0.5], {
  twist: 0.5,
  shrug: 2.3,
  nearFoot: onBall(TOE, -66),
});
// 5: she drops back in over the lead knee, the rear shoulder rolling into the collar, the
// rear fist trailing high from the rise, the heel back up.
const DROP_IN = sunk(0, -0.5, 1, [0.4, 0.6], [0.4, -0.8], {
  twist: 0.36,
  shrug: 3,
  reach: { near: 0.6 },
  nearFoot: onBall(TOE, -72),
});

export const POSES: readonly Pose[] = [DROP, LOW, SETTLE, CROUCH, RISE, DROP_IN];
