import { at, GUARD, lifted, planted, tween, type Pose } from './common.ts';
import { BENDS, LEAD_TOE, onToes, REAR_HEEL, REAR_TOE, skid } from './hitHigh.ts';

export const ANIMATED: boolean = true;

/**
 * hitLow (docs/combat-v2.md §9.4, §11.1; with hitHigh and hitMid, her standing hit): 5 frames,
 * 3, 3, 4, 4 ticks, the last held. A low blow (guarded low, or landing in the lower third of her
 * hurtbox): the struck leg buckles, a hop on the other foot. Heavy hits (hitstun 18 and more)
 * play frames 0-4, light ones 0, 1 and 4; the last frame holds to the end of the stun and leads
 * back to the guard.
 *
 * The kick takes her lead shin (her lead leg is the far one, behind the body), and she answers
 * it like a punk: she stands on one leg, then stamps the pain out.
 *
 * - 0, held through the hitstop: the lead foot knocked back under her onto its toes (planted,
 *   the heel 30 degrees up), the knee buckling forward and down as the hips drop 5.6 px, her
 *   weight dumped onto the rear leg (its heel slammed down, the turned-out knee folding); the
 *   chest pitches over the hurt leg and the head drops to look at it (23 degrees on screen: the
 *   head turns); the lead hand grabs at the knee, the rear arm thrown out low and back for
 *   balance, near straight, the hand open.
 * - 1: on one leg: the hurt foot tucked up off the floor (the ankle 12.5 px up, the knee drawn
 *   up in front), the rear foot planted, its heel sunk under the weight; the rear arm
 *   straight out behind for balance, the lead hand at the knee. Stable on the ground, whichever
 *   frame the clip holds. A light hit flows from here into the held frame 4.
 * - 2 (heavy): the big hop off the rear foot (3 px up, dust), a toprock's skip gone sour: the
 *   hurt knee drawn up high, the lead hand clutching it, the rear arm flung up high behind,
 *   straight.
 * - 3 (heavy): halfway down to frame 4, she lands and stomps the hurt foot flat on its spot
 *   (dust under both feet): shake it off. The hips drop into the stamp, the fists clenched.
 * - 4, held: she favors the leg and still dares you: the weight kept back on the rear leg (its
 *   heel sunk, the chest more upright than the guard's), the hurt foot up on its toes on the
 *   guard's ball (the heel 28 degrees up), the lead hand low and open by the thigh, the rear
 *   fist still cocked by the ear; the eyes open, the jaw set. One step out of the guard: the
 *   hand-off at the end of the stun sets the heel down.
 *
 * The hurt leg folds back under her, never kicks forward; the rear foot only pivots on its ball
 * (and leaves it for the big hop). Above the knees the drawing stays behind the guard's front;
 * the hand on the knee reaches 16, at knee height.
 */

/** 0, through the hitstop: the lead foot knocked back onto its toes, the knee buckling. */
const IMPACT: Pose = {
  hip: at(-9.2, 26.4),
  torso: 28,
  head: -5,
  shrug: 1.6,
  twist: 0.3,
  nearFoot: onToes(GUARD.nearFoot, -2),
  farFoot: lifted(planted(-1.5, -30), 0.25),
  nearFist: at(-26, 40),
  farFist: at(9.5, 24),
  bends: BENDS,
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/** 1: on one leg: the hurt foot tucked up off the floor, the rear arm out for balance. */
const HOP: Pose = {
  hip: at(-9, 31),
  torso: 22,
  head: -12,
  shrug: 2,
  twist: 0.35,
  nearFoot: onToes(GUARD.nearFoot, -6),
  farFoot: { x: 3, y: 12.5, angle: -30 },
  nearFist: at(-24, 46),
  farFist: at(9, 29),
  bends: BENDS,
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(REAR_TOE - 1, 1.8, 0.35)],
};

/** 2, heavy hits: the big hop, the hurt knee drawn up and clutched, the rear arm up behind. */
const HIGH_HOP: Pose = {
  hip: at(-9.4, 34),
  torso: 24,
  head: -14,
  shrug: 1.6,
  twist: 0.4,
  nearFoot: lifted(onToes(GUARD.nearFoot, REAR_HEEL - 8), 3),
  farFoot: { x: 1, y: 15, angle: -38 },
  nearFist: at(-24, 66),
  farFist: at(10, 31.5),
  bends: BENDS,
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(REAR_TOE - 1.5, 2.2, 0.7)],
};

/** 4, held to the end of the stun: the weight on the rear leg, the hurt foot on its toes. */
const SHAKEN: Pose = {
  hip: at(-9.6, 30.4),
  torso: 14,
  head: -6,
  shrug: 2.6,
  twist: 0.42,
  nearFoot: onToes(GUARD.nearFoot, -4),
  farFoot: onToes(GUARD.farFoot, -28),
  nearFist: at(-16, 56),
  farFist: at(7, 33),
  bends: BENDS,
  farHand: 'open',
  face: 'effort',
};

/** 3, heavy hits: halfway down, the hurt foot stomped flat: shake it off. */
const STOMP: Pose = {
  ...tween(HIGH_HOP, SHAKEN, 0.5),
  hip: at(-9.4, 29.6),
  torso: 23,
  nearFoot: onToes(GUARD.nearFoot, -4),
  farFoot: GUARD.farFoot,
  nearFist: at(-15, 51),
  farFist: at(6, 34),
  farHand: 'fist',
  face: 'effort',
  effects: [skid(LEAD_TOE - 3, 4.4, 0.15), skid(REAR_TOE - 1, 2, 0.2)],
};

export const POSES: readonly Pose[] = [IMPACT, HOP, HIGH_HOP, STOMP, SHAKEN];
