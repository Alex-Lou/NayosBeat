import { at, type Pose } from './common.ts';
import { BRACED, figure } from './knockdown.ts';

export const ANIMATED: boolean = true;

/**
 * airHit (docs/combat-v2.md §9.4, §11.1): 4 frames, 3, 5, 6 ticks, the last held until she lands
 * (the knockdown then takes over, seat first). Hit in the air or launched: a launch from the
 * ground lasts about 10 ticks, so she lands during frame 2; on a jump-in she falls through the
 * held frame 3. The height comes from the engine: the poses stay anchored to her feet, sinking
 * toward the floor as she turns over, so the landing reads as an impact, never as a teleport.
 *
 * - 0, through the hitstop: the jolt. The head whipped back (past 20 degrees: the face turns,
 *   hurt), the body bowed back after it, the chest thrown open; the loaded rear fist ripped off
 *   her ear and flung back, the lead hand flung forward, both open; the knees buckle forward
 *   with the shins trailing under her.
 * - 1: launched, tipping back: the arms windmill on (the rear one comes over the top and trails
 *   up in front of her, the lead one is flung straight up, clear of the head), the lead knee
 *   tucks, the rear leg trails below.
 * - 2: turning over: the legs swing up in front of her, the rear hand already reaching down for
 *   the floor along her side, the lead arm still up.
 * - 3, held: BRACED (knockdown.ts): falling back seat first, the legs up, the rear arm braced
 *   for the floor, the lead one thrown forward, the chin tucked.
 *
 * Every limb is written by its silhouette (`figure`): the arms flail on one continuous arc,
 * never popping from side to side, and the legs swing up, never out into the attacker. The lead
 * arm, drawn behind the body and the head, never goes back over the head: a hand peeking out
 * by the skull reads as a growth.
 *
 * This is the violent jolt of her reactions (the chest blown open, the arms flung wide); her KO
 * goes limp from its first frame instead (ko.ts).
 */

/** 0: the jolt: the head whipped back, the guard blown open. */
const JOLT: Pose = figure({
  hip: at(-5, 36),
  torso: -24,
  head: -18,
  shrug: -1,
  twist: 0.75,
  nearArm: { upper: 172, lower: 222 },
  farArm: { upper: 28, lower: 358 },
  nearLeg: { upper: 300, lower: 240, toes: 270 },
  farLeg: { upper: 328, lower: 272, toes: 310 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
});

/** 1: launched, tipping back, the arms windmilling up, the lead knee tucked. */
const LAUNCHED: Pose = figure({
  hip: at(-8, 27),
  torso: -42,
  head: -10,
  shrug: 0,
  twist: 0.6,
  nearArm: { upper: 60, lower: 30 },
  farArm: { upper: 100, lower: 115 },
  nearLeg: { upper: 340, lower: 315, toes: 340 },
  farLeg: { upper: 20, lower: 290, toes: 320 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
});

/** 2: turning over, the legs swinging up, the rear hand reaching for the floor. */
const TURNING: Pose = figure({
  hip: at(-9, 16),
  torso: -52,
  head: 0,
  shrug: 0,
  twist: 0.45,
  nearArm: { upper: 330, lower: 300 },
  farArm: { upper: 76, lower: 98 },
  nearLeg: { upper: 48, lower: 355, toes: 15 },
  farLeg: { upper: 64, lower: 10, toes: 30 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
});

export const POSES: readonly Pose[] = [JOLT, LAUNCHED, TURNING, BRACED];
