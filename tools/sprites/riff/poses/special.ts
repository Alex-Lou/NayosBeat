import type { Point } from '../../raster.ts';
import { solve, type Effect } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * special (Glissade, docs/combat-v2.md §5.5, §10.2, §11.3): 8 frames, 3, 3, 4, 4, 4, 5, 5, 6
 * ticks (34), active on frames 3-4 (ticks 10-17), hitbox 6..36 / 2..14, a low that trips. The
 * game slides her 64 px over ticks 1-17 (fast, then easing out) and gives her a hurtbox 26 px
 * high from tick 2 to tick 20: from frame 1 (tick 3) to frame 4 the drawing stays 28.5 px high
 * at most (the crest of the hair a pixel or two over the box), and frame 5 (ticks 18-22) stays
 * at 30: sitting up any more would lift the head over the box (the top of her hair is about 42
 * px from the hip along the spine), so she stays laid back until the box ends and the stand-up
 * happens over frames 6 and 7.
 *
 * Her answer to the vinyl: a power slide, flat and feet first, a long low arrow. She explodes
 * out of the guard into a dive, the lead leg shooting out low, the rear leg kicking through over
 * it, and lands on her hip with both legs long in front of her: the lead boot skimming the floor
 * with its sole to the opponent, the rear boot just behind and over it (two boots, stepped, not
 * one block); her weight on the rear forearm, the elbow on the floor, the lead hand behind her
 * head: she lounges under the projectile and gives it a half-lidded look along her boots
 * (`cool`). A magenta streak runs along the floor behind her, silver sparks fan back along the
 * floor from her heels. Then she draws her legs in, sits up and springs back into the guard.
 * Nothing like her Windmill (on her back, propped on a straight arm, a leg wheeling up, the arcs
 * of its trail): this one is a straight line on the floor, every limb along it, the effects
 * flat on the floor.
 *
 * - 0 (3 ticks): the launch: the hips sink and pitch in over the lead leg, the rear heel pops
 *   hard off the floor, the lead fist drops toward the knee; dust off the rear ball and a short
 *   magenta streak behind the heels (the game already moves her on these ticks). As far from the
 *   guard as its first frame may go (3.5 px).
 * - 1 (3 ticks): the dive: she drops flat in one beat, the lead leg already long and low, the
 *   rear leg kicking through over it (its knee up, its trail along the floor), the rear forearm
 *   reaching back for the floor, the lead arm flung back over her head; dust where she pushed.
 * - 2 (4 ticks): the hip and the elbow hit the floor: the arrow, the boots not all the way out;
 *   dust under the hip, the first sparks off the heel, the magenta streak; the cool look.
 * - 3 (4 ticks, active): the arrow at full length, the lead heel on the far edge of the hitbox;
 *   the sparks fan off the heel along the floor, the streak at its longest.
 * - 4 (4 ticks, active): still gliding, slower: the rear leg starts to draw in, the lead boot
 *   still out at the edge of the box; the streak and the sparks thin out.
 * - 5 (5 ticks): she stops and folds: sitting on the folded rear leg (its foot tucked under the
 *   hips on its toes, its knee folded back under her), the lead knee up over its foot, already
 *   on its guard mark, the rear hand pushing off the floor behind her, the lead hand coming
 *   down off her head; still laid back.
 * - 6 (5 ticks): up off the floor into a low b-girl squat, the chest upright, the rear leg
 *   swung out from under her onto its guard mark (its knee turned out over it, as in the guard),
 *   the cocked fist rising back to the ear a beat late.
 * - 7 (6 ticks): into the guard, a hair low (the settle), the idle takes over.
 *
 * The head stays the source drawing (under stamp.ts's 20 degrees on screen) whatever the lean:
 * lying back, she holds it up and looks along her boots at the opponent. Once she stops (frame
 * 5), the feet never slide: the lead foot stays on its mark, the rear one lands on its own and
 * its heel pivots on the ball; the rear knee folds the guard's way (back) from frame 5 on, so it
 * never flips.
 */

const TOE = toeOf(GUARD.nearFoot);
/** The guard's head angle on screen. */
const LOOK = GUARD.torso + GUARD.head;

/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The loaded rear fist carried by its shoulder, nudged by (dx, dy). */
function cocked(pose: Pose, dx = 0, dy = 0): Pose {
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  return { ...pose, nearFist: at(shoulder.x + COCKED.x + dx, shoulder.y + COCKED.y + dy) };
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** Streaks left behind something going forward along the floor: magenta, or silver sparks. */
const streak = (
  center: Point,
  length: number,
  spread: number,
  tone: 'sound' | 'strike',
): Effect => ({
  kind: 'speed',
  center,
  length,
  spread,
  direction: 0,
  tone,
});

const spark = (center: Point, radius: number): Effect => ({
  kind: 'flash',
  center,
  radius,
  tone: 'strike',
});

/** The silver sparks thrown forward off the heels, at floor level. */
const sparks = (x: number, radius: number, progress: number): Effect => ({
  kind: 'shards',
  center: at(x, 2.5),
  radius,
  progress,
  tone: 'strike',
});

// 0 · The launch (3 ticks).
const LAUNCH: Pose = cocked(
  {
    ...GUARD,
    hip: at(-5.9, 29.6),
    torso: 20.5,
    head: LOOK - 20.5,
    shrug: 2.6,
    nearFoot: onBall(TOE, -28),
    farFist: at(10, 43.4),
    effects: [dust(-18, 3, 0.1), streak(at(-14, 1.5), 9, 1.2, 'sound')],
  },
  0.3,
  0.2,
);

// 1 · The dive (3 ticks).
const DIVE: Pose = {
  ...GUARD,
  hip: at(-1.5, 5.6),
  torso: -67,
  head: LOOK - 8 + 67,
  shrug: 2.4,
  twist: 0.55,
  nearFoot: { x: 16, y: 9.5, angle: 20 },
  farFoot: { x: 24, y: 6, angle: 30 },
  nearFist: at(-40, 3.5),
  nearHand: 'open',
  farFist: at(-33, 17),
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'up', nearElbow: 'up', farElbow: 'up' },
  effects: [smear(3, [-14, 5], [-2, 3], [8, 4], [16, 8]), dust(-16, 3.5, 0.2)],
};

/** The arrow: on the hip and the rear elbow, both legs long, the lead hand behind the head. */
const ARROW: Pose = {
  ...GUARD,
  hip: at(-3, 5),
  torso: -69,
  head: LOOK - 14 + 69,
  shrug: 2.6,
  twist: 0.6,
  nearFoot: { x: 22.5, y: 11, angle: 45 },
  farFoot: { x: 29, y: 5.4, angle: 50 },
  nearFist: at(-24, 2.8),
  nearHand: 'open',
  farFist: at(-35.5, 18.5),
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'up', nearElbow: 'back', farElbow: 'up' },
  face: 'cool',
};

// 2 · The hip and the elbow hit the floor (4 ticks): squashed in, the boots not yet all out.
const TOUCH: Pose = {
  ...ARROW,
  hip: at(-3.5, 4.8),
  torso: -67,
  head: LOOK - 12 + 67,
  nearFoot: { x: 20, y: 10.5, angle: 35 },
  farFoot: { x: 26.5, y: 5.6, angle: 40 },
  farFist: at(-34, 18),
  effects: [
    smear(2, [-6, 2], [10, 2], [24, 3]),
    streak(at(-38, 2.5), 16, 1.6, 'sound'),
    streak(at(27, 1.5), 9, 1, 'strike'),
    dust(-8, 5, 0.15),
  ],
};

// 3 · The arrow at full length, the heel in the ankles (4 ticks, active).
const SLIDE: Pose = {
  ...ARROW,
  effects: [
    smear(2, [-4, 2], [12, 2], [28, 3]),
    streak(at(-40, 2.5), 18, 1.6, 'sound'),
    streak(at(30, 1.5), 16, 1.4, 'strike'),
    spark(at(31.5, 2), 3),
    sparks(32, 7, 0.25),
    dust(-8, 5, 0.45),
  ],
};

// 4 · Still gliding, slower (4 ticks, active): the rear leg starts to draw in, the lead boot
// still out at the edge of the hitbox.
const GLIDE: Pose = {
  ...ARROW,
  hip: at(-3, 5.2),
  torso: -67,
  head: LOOK - 12 + 67,
  nearFoot: { x: 13, y: 9, angle: 25 },
  farFoot: { x: 28.6, y: 5.6, angle: 45 },
  farFist: at(-35, 19),
  effects: [
    streak(at(-40, 2.5), 10, 1.6, 'sound'),
    streak(at(30, 1.5), 9, 1, 'strike'),
    sparks(32, 8, 0.65),
    dust(-8, 5, 0.75),
  ],
};

// 5 · She stops and folds (5 ticks): sitting on the folded rear leg, the lead knee up, the rear
// hand pushing.
const FOLD: Pose = {
  ...GUARD,
  hip: at(-2, 5.2),
  torso: -64,
  head: LOOK - 6 + 64,
  shrug: 2.4,
  twist: 0.5,
  nearFoot: onBall(-1, -40),
  farFoot: GUARD.farFoot,
  nearFist: at(-31, 2.6),
  nearHand: 'open',
  farFist: at(-14, 24),
  bends: { nearKnee: 'back', farKnee: 'up', nearElbow: 'back', farElbow: 'down' },
  effects: [dust(-8, 5, 0.95)],
};

// 6 · Up off the floor into a low squat, the rear foot back on its mark (5 ticks).
const SQUAT: Pose = cocked(
  {
    ...GUARD,
    hip: at(-5.5, 13),
    torso: -12,
    head: LOOK + 12,
    shrug: 2.8,
    twist: 0.45,
    nearFoot: onBall(TOE, -34),
    farFoot: GUARD.farFoot,
    farFist: at(6, 30),
    bends: { nearKnee: 'back', farKnee: 'front' },
  },
  -1,
  -8,
);

// 7 · The guard, a hair low (6 ticks).
const SETTLE: Pose = cocked(
  {
    ...GUARD,
    hip: at(-6.6, 30.6),
    torso: 21,
    head: LOOK - 21,
    nearFoot: onBall(TOE, -16),
  },
  0.4,
  0.8,
);

export const POSES: readonly Pose[] = [LAUNCH, DIVE, TOUCH, SLIDE, GLIDE, FOLD, SQUAT, SETTLE];
