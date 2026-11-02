import { armOut, at, behindBack, GUARD, onBall, planted, raised, type Pose } from './common.ts';

/**
 * Her grab and what she does with it: the one place her hands truly leave her back.
 *
 * - grab (Prise, 6 frames, 2, 3, 3, 6, 7, 7 ticks): the lead hand opens and shoots to the collar
 *   on frame 2 (ticks 5-7), hitbox 6..30 / 20..58; then it comes back, shaken out, to her back.
 * - hold (2 frames of 6, looping): the lead hand fast in the collar, the rear one still at her
 *   back, the mask level.
 * - held (2 frames of 4, looping): taken by the collar, she leans back from the grip, the hands
 *   up to it.
 * - pummel (Paume, 4 frames, 2, 3, 1, 8): the rear hand leaves her back and the palm lands on
 *   the plexus on frame 2.
 * - throwForward (Croc-en-jambe, 7 frames, 3, 3, 4, 1, 7, 7, 8): a foot behind the ankle, the
 *   push of the lead hand; the release on frame 3.
 * - throwBack (Valse, 8 frames, 3, 3, 4, 4, 1, 8, 9, 9): a waltz turn, her back to the opponent,
 *   and over her shoulder; the release on frame 4, then round to face again.
 * - thrownBack (4 frames, 3, 3, 4, 4): thrown backward by the opponent, pulled off her feet and
 *   flung over, up to the release.
 */

/** The lead hand open at the collar, `x` px out. */
const atCollar = (pose: Pose, x = 27, y = 50): Pose => ({
  ...pose,
  nearFist: at(x, y),
  nearHand: 'open',
  bends: { ...pose.bends, nearElbow: 'down' },
});

export const GRAB: readonly Pose[] = [
  armOut(behindBack({ ...GUARD, hip: at(-2, 33.5), torso: 6 }), 'near', -20, 12),
  { ...atCollar(behindBack({ ...GUARD, hip: at(0, 34), torso: 10 }), 20, 46), face: 'effort' },
  {
    ...atCollar(
      behindBack({ ...GUARD, hip: at(4, 34), torso: 13, nearFoot: onBall(15, -30) }),
      29,
      50,
    ),
    face: 'effort',
  },
  atCollar(behindBack({ ...GUARD, hip: at(1, 34), torso: 10, nearFoot: onBall(12, -30) }), 24, 47),
  armOut(behindBack({ ...GUARD, hip: at(-1, 34), torso: 5 }), 'near', -40, 14),
  behindBack({ ...GUARD, hip: at(-2, 34), torso: 2 }),
];

const HOLDING: Pose = atCollar(
  behindBack({ ...GUARD, hip: at(0, 34), torso: 8, nearFoot: onBall(11, -30) }),
  24,
  49,
);

export const HOLD: readonly Pose[] = [
  HOLDING,
  atCollar(behindBack({ ...HOLDING, hip: at(0, 33.5) }), 24, 48.5),
];

/** Held by the collar: leaning back from the grip, both hands up at it. */
const grabbed = (lean: number, y: number): Pose =>
  armOut(
    armOut(
      behindBack({
        ...GUARD,
        hip: at(-2, y),
        torso: lean,
        head: -8,
        farFoot: planted(-14, -14),
        face: 'hurt',
      }),
      'near',
      20,
      15,
    ),
    'far',
    30,
    14,
  );

export const HELD: readonly Pose[] = [grabbed(-6, 34), grabbed(-9, 33.5)];

export const PUMMEL: readonly Pose[] = [
  armOut(HOLDING, 'far', -60, 12),
  { ...armOut(HOLDING, 'far', -10, 14), face: 'effort' },
  { ...armOut(HOLDING, 'far', 5, 19), farHand: 'open', face: 'kiai' },
  armOut(HOLDING, 'far', -40, 13),
];

export const THROW_FORWARD: readonly Pose[] = [
  HOLDING,
  atCollar(
    behindBack({ ...GUARD, hip: at(3, 34), torso: 10, nearFoot: raised(22, 8, -20) }),
    25,
    49,
  ),
  {
    ...atCollar(
      behindBack({ ...GUARD, hip: at(4, 33), torso: 16, nearFoot: raised(26, 6, 10) }),
      27,
      46,
    ),
    face: 'effort',
  },
  {
    ...armOut(
      behindBack({ ...GUARD, hip: at(5, 33), torso: 18, nearFoot: onBall(22, -30) }),
      'near',
      5,
      20,
    ),
    nearHand: 'open',
    face: 'kiai',
  },
  armOut(
    behindBack({ ...GUARD, hip: at(2, 34), torso: 8, nearFoot: onBall(16, -30) }),
    'near',
    -20,
    15,
  ),
  behindBack({ ...GUARD, hip: at(0, 34), torso: 4, nearFoot: onBall(12, -30) }),
  behindBack({ ...GUARD, hip: at(-2, 34), torso: 2 }),
];

export const THROW_BACK: readonly Pose[] = [
  HOLDING,
  atCollar(behindBack({ ...GUARD, hip: at(1, 34), torso: 4, farFoot: onBall(-6, -30) }), 22, 50),
  {
    ...armOut(
      behindBack({
        ...GUARD,
        turned: true,
        hip: at(2, 33),
        torso: 20,
        nearFoot: onBall(4, -30),
        farFoot: planted(-10, -14),
      }),
      'near',
      55,
      19,
    ),
    face: 'effort',
  },
  {
    ...armOut(
      behindBack({
        ...GUARD,
        turned: true,
        hip: at(3, 31),
        torso: 34,
        nearFoot: onBall(6, -32),
        farFoot: planted(-8, -18),
      }),
      'near',
      50,
      19,
    ),
    face: 'kiai',
  },
  {
    ...armOut(
      behindBack({
        ...GUARD,
        turned: true,
        hip: at(3, 30),
        torso: 44,
        nearFoot: onBall(6, -34),
        farFoot: planted(-8, -20),
      }),
      'near',
      -30,
      19,
    ),
    nearHand: 'open',
    face: 'kiai',
  },
  armOut(
    behindBack({
      ...GUARD,
      turned: true,
      hip: at(2, 32),
      torso: 20,
      nearFoot: onBall(5, -30),
      farFoot: planted(-12, -14),
    }),
    'near',
    -50,
    15,
  ),
  behindBack({ ...GUARD, hip: at(0, 33.5), torso: 6, farFoot: planted(-13, -12) }),
  behindBack({ ...GUARD, hip: at(-2, 34), torso: 2 }),
];

export const THROWN_BACK: readonly Pose[] = [
  grabbed(14, 33),
  {
    ...armOut(
      armOut(
        behindBack({
          ...GUARD,
          hip: at(2, 40),
          torso: 0,
          spin: 40,
          nearFoot: raised(6, 12, -40),
          farFoot: raised(-4, 10, -45),
          face: 'hurt',
        }),
        'near',
        60,
        16,
      ),
      'far',
      30,
      16,
    ),
  },
  armOut(
    armOut(
      behindBack({
        ...GUARD,
        hip: at(0, 50),
        torso: 0,
        spin: 120,
        nearFoot: raised(6, 22, -40),
        farFoot: raised(-2, 20, -60),
        bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'down' },
        face: 'hurt',
      }),
      'near',
      70,
      17,
    ),
    'far',
    40,
    17,
  ),
  armOut(
    armOut(
      behindBack({
        ...GUARD,
        hip: at(-4, 52),
        torso: 0,
        spin: 190,
        nearFoot: raised(2, 24, -40),
        farFoot: raised(-6, 22, -60),
        bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'down' },
        face: 'hurt',
      }),
      'near',
      70,
      17,
    ),
    'far',
    40,
    17,
  ),
];
