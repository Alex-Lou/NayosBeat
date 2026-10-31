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
 *   rear fist drops from under her chin and the lead hand drops, both arms hanging open.
 * - 1: out on her feet: she sways back over her rear foot, the chest falling back, the head lolling
 *   back after it, the arms hanging dead from the shoulders, the lead hand still drifting down
 *   in front of her, the lead toes up on the heel.
 * - 2: the legs give: the hips drop and back, and she folds forward over them, the chest 35
 *   degrees down, the shoulders sagging, the head hanging, both arms dangling down in front of
 *   the knees; the rear knee dropped forward and low under her, as in her crouch, the heel
 *   high.
 * - 3: she sinks: the hips low over the rear heel, the rear knee floating just over the floor,
 *   the body tipping back out of the fold, the head whipping back the other way, the limp rear
 *   arm lagging forward over her lap.
 * - 4: the seat hits (a puff), the legs sliding out along the floor, the torso falling back, the
 *   lead arm left lying on her lap, the open hand dropped on the knee: the shoulder falls 14 px,
 *   the hand only 5 (it lags behind the drop, it never rises).
 * - 5: the back slams flat, the head bouncing off the floor, the legs thrown up, the rear arm
 *   lying flat on the floor at her side, the lead one flopping down across her.
 * - 6: the last rebound: the head and shoulders lift off the floor, the chin dropping, the
 *   boots flopping down.
 * - 7, held: out cold on her back, the head lolled, the rear knee up, the lead leg stretched
 *   out, the toes up, the lead arm across her belly, the rear one by her side.
 *
 * Lying poses stretch back (the head toward negative x), the boots off the opponent. The lead
 * arm, drawn behind the body and the head, never ends by the skull (a few pixels of skin at the
 * hair line read as a growth): it stays on her lap or lies across her, never raised (a fist up
 * in the air mid-collapse reads as a wave or a fist pump, the opposite of a body letting go).
 * From the sink to the slam its upper arm turns one way only, -60, -20 then 5 degrees, while
 * the body falls back under it, the elbow barely bent. On the floor the rear arm lies flat
 * along her side (its elbow raised off the floor, the hand down by the hip, it read as an
 * elbow bent backward), and the knees bend toward the toes even as she buckles (the rear one
 * forward and low, as in her crouch, never turned out behind her). While she stands,
 * the feet never slide: the rear foot stays on its ball, the lead one pivots on its heel. The slow
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
  hip: at(-8, 30.5),
  torso: 10,
  head: 22,
  shrug: -1,
  twist: 0.35,
  nearFoot: GUARD.nearFoot,
  farFoot: GUARD.farFoot,
  bends: { nearKnee: 'front' },
  nearArm: { upper: 232, lower: 262 },
  farArm: { upper: -82, lower: -65 },
  ...LIMP,
  face: 'out',
});

/** 1: out on her feet, swaying back over her rear foot, the arms hanging dead. */
const OUT_STANDING: Pose = figure({
  hip: at(-12, 32),
  torso: -16,
  head: -20,
  shrug: 0,
  twist: 0.6,
  nearFoot: onBall(REAR_TOE, -6),
  farFoot: onHeel(GUARD.farFoot, 22),
  bends: { nearKnee: 'front' },
  nearArm: { upper: 255, lower: 262 },
  farArm: { upper: -76, lower: -62 },
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
  nearFoot: onBall(REAR_TOE, -68),
  farFoot: GUARD.farFoot,
  bends: { nearKnee: 'front' },
  nearArm: { upper: -78, lower: -70 },
  farArm: { upper: -72, lower: -64 },
  ...LIMP,
  face: 'out',
});

/** 3: sinking to the floor, tipping back, the head whipping back. */
const SINK: Pose = figure({
  hip: at(-13, 18),
  torso: -28,
  head: -12,
  shrug: 0,
  twist: 0.45,
  nearFoot: onBall(REAR_TOE, -74),
  farFoot: onHeel(GUARD.farFoot, 10),
  bends: { nearKnee: 'front' },
  nearArm: { upper: -35, lower: -15 },
  farArm: { upper: 300, lower: 340 },
  ...LIMP,
  face: 'out',
});

/** 4: the seat hits, the legs sliding out, the torso falling back, the lead arm limp on her lap. */
const SEAT: Pose = figure({
  hip: at(-12.5, 6.5),
  torso: -46,
  head: 16,
  shrug: 0,
  twist: 0.45,
  nearArm: { upper: 315, lower: 350 },
  farArm: { upper: -20, lower: -5 },
  nearLeg: { upper: 40, lower: -10, toes: 55 },
  farLeg: { upper: 25, lower: -30, toes: 35 },
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
  nearArm: { upper: 0, lower: 6 },
  farArm: { upper: 5, lower: 12 },
  nearLeg: { upper: 80, lower: 28, toes: 93 },
  farLeg: { upper: 64, lower: 12, toes: 77 },
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
  nearArm: { upper: -15, lower: 0 },
  farArm: { upper: 2, lower: 14 },
  bends: { nearKnee: 'up', farKnee: 'up' },
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
  nearArm: { upper: 0, lower: 6 },
  farArm: { upper: -4, lower: 6 },
  bends: { nearKnee: 'up', farKnee: 'up' },
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
