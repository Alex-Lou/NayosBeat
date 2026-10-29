import { at, GUARD, onBall, onHeel, planted, toeOf, type Pose } from './common.ts';
import { dust, figure } from './knockdown.ts';

export const ANIMATED: boolean = true;

/**
 * ko: 8 frames, 4, 4, 4, 4, 4, 4, 6 ticks, the last held. Lights out on her feet, then the legs
 * go: a slow collapse and a heavy fall, the most weight of any of her strips. Limp from the
 * first frame: nothing is flung open (that is airHit's jolt), the body simply stops holding
 * itself up and sways back, folds forward, tips back and drops.
 *
 * - 0: lights out: the head snaps aside, the chin dropping (past 20 degrees: the eyes already
 *   shut, `out`), the fringe whipping over the face; the knees unlock (the hips 3 px down), the
 *   cocked rear fist falls off her ear and the lead hand drops, both arms hanging open.
 * - 1: out on her feet: she sways back on her heels, the chest falling back, the head lolling
 *   back after it, the arms hanging dead from the shoulders, the lead hand still drifting down
 *   in front of her, the lead toes up on the heel.
 * - 2: the legs give: the hips drop and back, and she folds forward over them, the chest 35
 *   degrees down, the shoulders sagging, the head hanging, both arms dangling straight down in
 *   front of the knees.
 * - 3: she sinks: the hips nearly to the floor, the body tipping back out of the fold, the head
 *   whipping back the other way, the limp rear arm flung up behind by the drop.
 * - 4: the seat hits (a puff), the legs sliding out along the floor, the torso falling back, the
 *   lead arm lagging up from the drop.
 * - 5: the back slams flat, the head bouncing off the floor, the legs thrown up, the rear arm
 *   on the floor at her side, the lead one flopping down across her.
 * - 6: the last rebound: the head and shoulders lift off the floor, the chin dropping, the
 *   boots flopping down.
 * - 7, held: out cold on her back, the head lolled, the rear knee up, the lead leg stretched
 *   out, the toes up, the lead arm across her belly, the rear one by her side.
 *
 * Lying poses stretch back (the head toward negative x), the boots off the opponent. The lead
 * arm, drawn behind the body and the head, never ends by the skull (a few pixels of skin at the
 * hair line read as a growth): it lags up in the air or lies across her. While she stands, the
 * feet never slide: the rear foot stays on its ball, the lead one pivots on its heel. The slow
 * drop also keeps the belt's chain off the floor in the held frame: its spring's tip still lags
 * above the belt when the last frame comes (see knockdown.ts).
 *
 * Frames 0-3 stand on the floor. A KO from a launcher, a sweep, a throw or a hit in the air also
 * lifts her (src/core/combat.ts: vy = AIR_HIT_LIFT): the clip should play airHit until she lands,
 * then this strip from frame 4 (the seat), or she hovers upright for those frames (reported, the
 * routing is not in the poses).
 */

/** The ball of the guard's rear foot, where it stays while she buckles. */
const REAR_TOE = toeOf(GUARD.nearFoot);
const LIMP = { nearHand: 'open', farHand: 'open' } as const;

/** 0: lights out: the head snapped aside, the knees unlocking, both arms dropping. */
const SNAP: Pose = figure({
  hip: at(-8, 29),
  torso: 10,
  head: 22,
  shrug: -1,
  twist: 0.35,
  nearFoot: GUARD.nearFoot,
  farFoot: GUARD.farFoot,
  bends: { nearKnee: 'front' },
  nearArm: { upper: 232, lower: 262 },
  farArm: { upper: 300, lower: 282 },
  ...LIMP,
  face: 'out',
});

/** 1: out on her feet, swaying back on her heels, the arms hanging dead. */
const OUT_STANDING: Pose = figure({
  hip: at(-9.5, 28),
  torso: -16,
  head: -20,
  shrug: 0,
  twist: 0.6,
  nearFoot: onBall(REAR_TOE, -6),
  farFoot: onHeel(GUARD.farFoot, 22),
  bends: { nearKnee: 'front' },
  nearArm: { upper: 255, lower: 262 },
  farArm: { upper: 290, lower: 272 },
  ...LIMP,
  face: 'out',
});

/** 2: the legs give: she folds forward over them, the arms dangling before the knees. */
const BUCKLE: Pose = figure({
  hip: at(-11.5, 20),
  torso: 35,
  head: 25,
  shrug: -1.5,
  twist: 0.35,
  nearFoot: onBall(REAR_TOE, -22),
  farFoot: GUARD.farFoot,
  bends: { nearKnee: 'front' },
  nearArm: { upper: 285, lower: 280 },
  farArm: { upper: 290, lower: 285 },
  ...LIMP,
  face: 'out',
});

/** 3: sinking to the floor, tipping back, the head whipping back. */
const SINK: Pose = figure({
  hip: at(-12, 12.5),
  torso: -28,
  head: -12,
  shrug: 0,
  twist: 0.45,
  nearFoot: onBall(REAR_TOE, -30),
  farFoot: onHeel(GUARD.farFoot, 10),
  bends: { nearKnee: 'back' },
  nearArm: { upper: 225, lower: 190 },
  farArm: { upper: 300, lower: 340 },
  ...LIMP,
  face: 'out',
});

/** 4: the seat hits, the legs sliding out, the torso falling back. */
const SEAT: Pose = figure({
  hip: at(-12.5, 6.5),
  torso: -46,
  head: 16,
  shrug: 0,
  twist: 0.45,
  nearArm: { upper: 315, lower: 350 },
  farArm: { upper: 55, lower: 80 },
  nearLeg: { upper: 40, lower: 350, toes: 10 },
  farLeg: { upper: 25, lower: 330, toes: 0 },
  ...LIMP,
  face: 'out',
  effects: [dust(-12, 5, 0.05)],
});

/** 5: the back slams flat, the head bouncing off the floor, the legs thrown up. */
const SLAM: Pose = figure({
  hip: at(-12.5, 6),
  torso: -84,
  head: -8,
  shrug: 0,
  twist: 0.35,
  nearFist: at(-14, 3.5),
  farArm: { upper: 25, lower: 0 },
  bends: { nearElbow: 'up' },
  nearLeg: { upper: 80, lower: 28, toes: 40 },
  farLeg: { upper: 64, lower: 12, toes: 30 },
  ...LIMP,
  face: 'out',
  effects: [dust(-36, 5, 0.05), dust(-12, 5, 0.45)],
});

/** 6: the last rebound, the head and shoulders lifting, the boots flopping down. */
const REBOUND: Pose = figure({
  hip: at(-12.5, 6.5),
  torso: -72,
  head: 28,
  shrug: 0,
  twist: 0.4,
  nearFoot: { x: 3, y: 9, angle: 15 },
  farFoot: { x: 15, y: 7, angle: 50 },
  nearFist: at(-15, 6),
  farArm: { upper: 18, lower: 355 },
  bends: { nearElbow: 'up', nearKnee: 'up', farKnee: 'up' },
  ...LIMP,
  face: 'out',
  effects: [dust(-36, 5, 0.5), dust(-12, 5, 0.85), dust(15, 3.5, 0.15)],
});

/** 7, held: out cold, the rear knee up, the lead leg stretched out. */
const OUT_COLD: Pose = figure({
  hip: at(-12.5, 6.5),
  torso: -82,
  head: 10,
  shrug: 0,
  twist: 0.35,
  nearFoot: planted(2),
  farFoot: { x: 18.5, y: 5.2, angle: 70 },
  nearFist: at(-14, 3.5),
  farArm: { upper: 12, lower: 345 },
  bends: { nearElbow: 'up', nearKnee: 'up', farKnee: 'up' },
  ...LIMP,
  face: 'out',
});

export const POSES: readonly Pose[] = [
  SNAP,
  OUT_STANDING,
  BUCKLE,
  SINK,
  SEAT,
  SLAM,
  REBOUND,
  OUT_COLD,
];
