import { armOut, at, behindBack, GUARD, onBall, planted, raised, type Pose } from './common.ts';
import type { Point } from '../../raster.ts';

/**
 * Her grab and what she does with it: the one place her hands truly leave her back.
 *
 * - grab (Prise, 6 frames, 2, 3, 3, 6, 7, 7 ticks): the lead hand opens and shoots to the collar
 *   on frame 2 (ticks 5-7), hitbox 6..30 / 20..58; then it comes back, shaken out, to her back.
 * - hold (2 frames of 6, looping): the savate clinch, both hands fast in the collar, the mask
 *   level: the one time both her hands leave her back (tests/tools/hold-pairs.test.ts).
 * - held (2 frames of 4, looping): taken by the collar, she leans back from the grip, the hands
 *   up to it.
 * - pummel (Genou, 4 frames, 2, 3, 1, 8): the hands still at the collar, the lead knee rises
 *   into the plexus on frame 2.
 * - throwForward (Croc-en-jambe, 7 frames, 3, 3, 4, 1, 7, 7, 8): a foot behind the ankle, the
 *   push of the lead hand; the release on frame 3.
 * - throwBack (Valse, 8 frames, 3, 3, 4, 4, 1, 8, 9, 9): a waltz turn by the collar, both hands
 *   lifting the opponent up and over her shoulder, then her back turned, down behind her:
 *   the hands carry the collar along the path every victim's thrownBack strip is drawn for
 *   (Nayo's throw); the release on frame 4, then round to face again.
 * - thrownBack (4 frames, 3, 3, 4, 4): thrown backward by the opponent, pulled off her feet and
 *   flung over, up to the release, her neck where Nayo's and Riff's ride (bent over at the
 *   collar, lifted, upside down over the thrower's shoulder, flat on the floor behind).
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

/** Both hands at the collar: the lead wrist at `near`, the rear one at `far`. */
const clinch = (pose: Pose, near: Point, far: Point): Pose => ({
  ...pose,
  nearFist: near,
  farFist: far,
  nearHand: 'open',
  farHand: 'open',
  bends: { ...pose.bends, nearElbow: 'down', farElbow: 'down' },
});

const CLINCH: Pose = { ...GUARD, hip: at(1, 34), torso: 10, nearFoot: onBall(11, -30) };

const HOLDING: Pose = clinch(CLINCH, at(24, 49), at(22.5, 55.5));

export const HOLD: readonly Pose[] = [
  HOLDING,
  clinch({ ...CLINCH, hip: at(1, 33.5) }, at(24, 48.5), at(22.5, 55)),
];

/** Held by the collar: leaning back from the grip, both hands up at it. */
const grabbed = (lean: number, y: number): Pose =>
  armOut(
    armOut(
      behindBack({
        ...GUARD,
        hip: at(0, y),
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

export const HELD: readonly Pose[] = [grabbed(-3, 34), grabbed(-5, 33.5)];

/** The clinch, the lead knee up: its foot at (`x`, `y`), turned `angle` degrees. */
const kneeing = (x: number, y: number, angle: number): Pose => ({
  ...HOLDING,
  nearFoot: raised(x, y, angle),
  bends: { ...HOLDING.bends, nearKnee: 'up' },
});

export const PUMMEL: readonly Pose[] = [
  kneeing(6, 12, -50),
  { ...kneeing(9, 18, -65), face: 'effort' },
  { ...kneeing(12, 24, -75), hip: at(2, 34.5), face: 'kiai' },
  kneeing(9, 8, -40),
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

/** Her wrist at `x`, `y` on screen, on a pose turned around its hip (Pose.turned). */
const mirrored = (pose: Pose, x: number, y: number): Point => at(2 * pose.hip.x - x, y);

const LIFT: Pose = {
  ...GUARD,
  hip: at(0, 33),
  torso: -8,
  head: -10,
  nearFoot: onBall(8, -30),
  farFoot: onBall(-8, -40),
};
const OVER: Pose = {
  ...GUARD,
  hip: at(-6, 33),
  torso: -10,
  head: 6,
  nearFoot: onBall(4, -30),
  farFoot: planted(-14, -14),
};
const DOWN: Pose = {
  ...GUARD,
  turned: true,
  hip: at(3, 30),
  torso: 50,
  nearFoot: onBall(6, -34),
  farFoot: planted(-8, -20),
};

export const THROW_BACK: readonly Pose[] = [
  clinch(CLINCH, at(22, 48.5), at(21, 54)),
  { ...clinch(LIFT, at(8, 62), at(5.5, 64.5)), face: 'effort' },
  {
    ...clinch(OVER, at(-0.5, 59), at(-4.5, 61)),
    face: 'effort',
  },
  {
    ...clinch(DOWN, mirrored(DOWN, -21.5, 28), mirrored(DOWN, -24.5, 27)),
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

/**
 * Thrown backward, flung over: the hip at `hip`, the body spun `spin` degrees, the legs and
 * arms trailing as they hang from it (in the body's own space, before the spin).
 */
const flung = (hip: Point, spin: number): Pose =>
  armOut(
    armOut(
      behindBack({
        ...GUARD,
        hip,
        torso: 0,
        spin,
        nearFoot: raised(hip.x + 6, hip.y - 28, -40),
        farFoot: raised(hip.x - 4, hip.y - 30, -60),
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
  );

export const THROWN_BACK: readonly Pose[] = [
  armOut(
    armOut(
      behindBack({
        ...GUARD,
        hip: at(-11, 33),
        torso: 40,
        head: -20,
        nearFoot: onBall(0, -40),
        farFoot: planted(-16, -10),
        face: 'hurt',
      }),
      'near',
      10,
      15,
    ),
    'far',
    -10,
    14,
  ),
  flung(at(-3, 58), 72),
  flung(at(-33.5, 84), 155),
  flung(at(20.5, 33), 250),
];
