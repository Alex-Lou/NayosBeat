import { armOut, at, behindBack, GUARD, onBall, planted, raised, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';

/**
 * Her jumps and dashes, a dancer's acrobatics. The hands leave her back in the air: open for
 * balance, or round the shins in a somersault (docs/saphir.md §9).
 * Poses in the air are drawn in the cell from her feet's origin: the game lifts the sprite.
 *
 * - jump (6 frames: 0 the take-off crouch, 1-4 in the air on 6, 7, 8, 8 ticks, 5 the landing):
 *   straight up, the knees tucked at the top, the legs reaching for the floor on the way down.
 * - jumpForward (7 frames: 0 the take-off, 1-6 in the air on 4, 4, 5, 5, 5, 6 ticks): a front
 *   somersault, tucked, round once, the legs out for the landing.
 * - dashForward (Fente, 6 frames, 1, 3, 3, 4, 4, 3 ticks, 48 px): a long low bound, the lead leg
 *   reaching, the rear one trailing, landing on the lead ball. The Reprise (boostCancel) plays
 *   frames 0, 1, 2, 4 and 5.
 * - dashBack (Esquive, 6 frames, 1, 3, 3, 4, 4, 3 ticks, 52 px): a back somersault without the
 *   hands, tucked, landing low.
 */

/** The take-off and landing crouch. */
const LOAD = behindBack({
  ...GUARD,
  hip: at(-3, 28),
  torso: 8,
  nearFoot: onBall(9, -36),
  farFoot: planted(-13, -30),
});

/** The arms open in the air, for balance. */
const open = (pose: Pose): Pose => armOut(armOut(pose, 'near', 70, 15), 'far', -115, 19.5);

/** The hands round the shins, in a tuck. */
const hug = (pose: Pose): Pose => armOut(armOut(pose, 'near', -40, 14), 'far', -60, 14);

/** Tucked in the air, upright: both knees up. */
const TUCK_BACK = behindBack({
  ...GUARD,
  hip: at(-2, 38),
  torso: 0,
  nearFoot: raised(6, 22, -30),
  farFoot: raised(-4, 21, -45),
  bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'down' },
});
const TUCK = hug(TUCK_BACK);

/** The legs long under her in the air, the toes pointed. */
const STRETCHED_BACK = behindBack({
  ...GUARD,
  hip: at(-2, 38),
  torso: 2,
  nearFoot: raised(4, 7, -50),
  farFoot: raised(-8, 8, -55),
});
const STRETCHED = open(STRETCHED_BACK);

export const JUMP: readonly Pose[] = [
  LOAD,
  STRETCHED,
  TUCK,
  hug(behindBack({ ...TUCK_BACK, hip: at(-2, 39) })),
  open(behindBack({ ...STRETCHED_BACK, torso: 4, nearFoot: raised(6, 8, -40) })),
  LOAD,
];

export const JUMP_FORWARD: readonly Pose[] = [
  LOAD,
  open(behindBack({ ...STRETCHED_BACK, torso: 10 })),
  somersault(-2, 40, 80),
  somersault(-2, 42, 170),
  somersault(-2, 42, 260),
  somersault(-2, 40, 340),
  open(behindBack({ ...STRETCHED_BACK, torso: 6, nearFoot: raised(8, 8, -40) })),
];

/** The lunge's arms: the lead hand swung back, the rear one forward, against the legs. */
const lunging = (pose: Pose): Pose => armOut(armOut(pose, 'near', -115, 19.5), 'far', 20, 13);

export const DASH_FORWARD: readonly Pose[] = [
  behindBack({ ...LOAD, torso: 16 }),
  lunging(
    behindBack({
      ...GUARD,
      hip: at(2, 31),
      torso: 22,
      nearFoot: raised(22, 8, -20),
      farFoot: onBall(-14, -50),
    }),
  ),
  lunging(
    behindBack({
      ...GUARD,
      hip: at(4, 32),
      torso: 18,
      nearFoot: raised(26, 6, -10),
      farFoot: raised(-22, 14, -60),
    }),
  ),
  behindBack({
    ...GUARD,
    hip: at(6, 30),
    torso: 14,
    nearFoot: onBall(24, -24),
    farFoot: raised(-14, 10, -50),
  }),
  behindBack({
    ...GUARD,
    hip: at(2, 32.5),
    torso: 8,
    nearFoot: onBall(16, -28),
    farFoot: planted(-10, -14),
  }),
  behindBack({ ...GUARD, hip: at(-2, 33.5), torso: 3 }),
];

/** Tucked tight, the knees to the chest, the hips at (`x`, `y`), turned `spin` degrees. */
function somersault(x: number, y: number, spin: number): Pose {
  return hug(
    behindBack({
      ...GUARD,
      hip: at(x, y),
      torso: 0,
      spin,
      nearFoot: raised(x + 8, y - 16, -30),
      farFoot: raised(x + 4, y - 17, -45),
      bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'up' },
    }),
  );
}

export const DASH_BACK: readonly Pose[] = [
  behindBack({ ...LOAD, torso: -6 }),
  somersault(-4, 40, -80),
  somersault(-4, 44, -180),
  somersault(-4, 40, -280),
  behindBack({ ...CROUCH, hip: at(-4, 22), torso: 18 }),
  behindBack({ ...GUARD, hip: at(-3, 33), torso: 4, farFoot: planted(-14, -14) }),
];
