import { armOut, at, behindBack, GUARD, raised, smear, type Pose } from './common.ts';

/**
 * Her two kicks in the air, overheads both, the arms out of her back to balance the kick.
 *
 * jumpLight (Pointe sautée): 5 frames, 2, 2, 6, 3, 3 ticks (16), the toe out on frame 2 (ticks
 * 4-9), hitbox 4..32 / 8..24: tucked, the lead leg stabs down and forward, the toes pointed.
 *
 * jumpHeavy (Chassé sauté): 6 frames, 3, 4, 5, 3, 3, 4 ticks (22), the sole out on frame 2
 * (ticks 7-11), hitbox 4..40 / -2..18: the lead knee chambered, then the leg driven down and
 * forward sole first, the body leaning far back.
 */

/** Tucked in the air: both knees up, the torso upright. */
export const TUCK: Pose = behindBack({
  ...GUARD,
  hip: at(-2, 38),
  torso: 0,
  nearFoot: raised(6, 22, -30),
  farFoot: raised(-4, 21, -45),
  bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'down' },
});

const LIGHT: readonly Pose[] = [
  TUCK,
  { ...TUCK, torso: -6, nearFoot: raised(14, 18, -20) },
  {
    ...TUCK,
    torso: -14,
    nearFoot: raised(22, 16, -12),
    face: 'effort',
    effects: [smear(2.5, [8, 22], [16, 18], [24, 15])],
  },
  { ...TUCK, torso: -6, nearFoot: raised(12, 20, -24) },
  TUCK,
];

/** The arms open behind and above her, against the kicking leg. */
const open = (pose: Pose): Pose =>
  armOut(armOut(behindBack(pose), 'near', 85, 15), 'far', -90, 19.5);

export const JUMP_LIGHT: readonly Pose[] = LIGHT.map(open);

const HEAVY: readonly Pose[] = [
  TUCK,
  { ...TUCK, torso: -10, nearFoot: raised(16, 30, -20) },
  {
    ...TUCK,
    hip: at(10, 34),
    torso: -30,
    nearFoot: raised(35, 12, 50),
    farFoot: raised(-2, 18, -52),
    bends: { ...TUCK.bends, nearKnee: 'up' },
    face: 'kiai',
    effects: [smear(3, [16, 26], [26, 18], [35, 13])],
  },
  {
    ...TUCK,
    hip: at(6, 35),
    torso: -20,
    nearFoot: raised(26, 16, 40),
    farFoot: raised(-2, 19, -45),
  },
  { ...TUCK, torso: -8, nearFoot: raised(14, 24, -20) },
  TUCK,
];

export const JUMP_HEAVY: readonly Pose[] = HEAVY.map(open);
