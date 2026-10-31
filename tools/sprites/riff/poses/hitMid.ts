import { at, GUARD, onHeel, tween, type Pose } from './common.ts';
import { BENDS, LEAD_TOE, onToes, REAR_HEEL, REAR_TOE, skid } from './hitHigh.ts';

export const ANIMATED: boolean = true;

/**
 * hitMid (docs/combat-v2.md §9.4, §11.1; with hitHigh and hitLow, her standing hit): 5 frames,
 * 3, 3, 4, 4 ticks, the last held. A blow to the body, right in the bare midriff: doubled over
 * at the belly. Heavy hits (hitstun 18 and more) play frames 0-4, light ones 0, 1 and 4; the
 * last frame holds to the end of the stun and leads back to the guard.
 *
 * The blow folds her in two, a dancer's fold, deeper than a boxer's:
 *
 * - 0, held through the hitstop: the fold at its deepest, the strongest read of the strip. The
 *   hips punched back and down over the rear foot (it takes her weight on its ball, the rear
 *   knee driven forward over it), the lead leg braced nearly straight, its toes
 *   lifting; the chest doubled over the blow, the head dropped with it (the chin down, 36
 *   degrees on screen: the head turns), both forearms clutched over the belly, hands open (the
 *   lead one folded under it, its elbow down at the waist).
 * - 1: the bridge: the chest comes halfway back up, the head first (upright again, eyes on the
 *   opponent), both forearms still across the stomach; the feet scrape back under the pushback.
 *   A light hit flows from here into the held frame 4: the rear fist goes up to the jaw, the
 *   lead forearm stays on the belly.
 * - 2 (heavy): winded, she sags again, smaller: the chest dips back over the blow while the hips
 *   barely move, the head drops (turned), both hands back on the belly, the rear elbow tucked
 *   behind the ribs, the lead one down at the waist (never jutting at the opponent like an elbow
 *   strike).
 * - 3 (heavy): halfway to frame 4, she shakes it off: the chest straightens up on a roll of the
 *   rear shoulder (shrugged up, the chest turned open), the jaw set, the rear fist climbing up
 *   the chest toward the jaw.
 * - 4, held: still hunched over the blow (31 degrees of lean against the guard's 19), the hips
 *   back over the rear foot, the lead forearm folded across in front of the belly (the hand
 *   open, the elbow down at the waist), the rear fist pulled in under the chin to cover the jaw, the forearm
 *   up across the chest, the elbow bent the way an elbow bends (left behind the collar with its
 *   elbow dropped under it, the forearm folded back up like a broken wing); the eyes open, the
 *   jaw set: she glares through it. One step out of the guard, so the hand-off at the end of
 *   the stun reads as her straightening up into it.
 *
 * The fold always goes back into the hips, never toward the opponent: above the belly the
 * drawing stays about behind the guard's front (x = 14; the fringe of the dropped head reaches
 * 15 on the fold, the winded dip and the hunch). The feet never slide: the rear foot pivots on
 * its ball, the lead one rocks on its heel.
 *
 * The lead arm, behind the body, folds in front of the belly, never behind the back: its upper
 * arm hangs from the shoulder, the elbow down at the waist, the forearm folded forward and up
 * under the belly. Pulled back with the elbow out of her back (the upper arm 30 to 50 degrees
 * behind the chest), it read as a broken arm (the owner's call).
 */

/** 0, through the hitstop: doubled over at its deepest, the forearms clutched on the belly. */
const FOLD: Pose = {
  hip: at(-18.6, 26),
  torso: 46,
  head: -10,
  shrug: 2.4,
  twist: 0.1,
  nearFoot: onToes(GUARD.nearFoot, -3),
  farFoot: onHeel(GUARD.farFoot, 4),
  nearFist: at(-7, 33),
  farFist: at(2.5, 26),
  bends: { ...BENDS, nearElbow: 'back' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/** 1: halfway back up, the head first; both forearms still over the stomach. */
const BRIDGE: Pose = {
  hip: at(-10.8, 30.4),
  torso: 27,
  head: -11,
  shrug: 2.6,
  twist: 0.2,
  nearFoot: onToes(GUARD.nearFoot, REAR_HEEL + 4),
  farFoot: GUARD.farFoot,
  nearFist: at(-4, 41),
  farFist: at(8, 39.5),
  bends: { ...BENDS, nearElbow: 'back' },
  face: 'hurt',
  effects: [skid(LEAD_TOE, 2.4, 0.45), skid(REAR_TOE, 1.8, 0.4)],
};

/** 2, heavy hits: winded, the chest dips back over the blow, both hands back on the belly. */
const WINDED: Pose = {
  hip: at(-13.4, 29),
  torso: 35,
  head: -13,
  shrug: 2.8,
  twist: 0.1,
  nearFoot: onToes(GUARD.nearFoot, REAR_HEEL + 2),
  farFoot: GUARD.farFoot,
  nearFist: at(-5, 36),
  farFist: at(6.5, 35.4),
  bends: { ...BENDS, nearElbow: 'back' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(LEAD_TOE + 0.5, 2.2, 0.8), skid(REAR_TOE - 0.5, 1.6, 0.75)],
};

/** 4, held to the end of the stun: hunched, the lead forearm pinned over the belly. */
const SHAKEN: Pose = {
  hip: at(-11.4, 30),
  torso: 31,
  head: -17,
  shrug: 2.8,
  twist: 0.36,
  nearFoot: onToes(GUARD.nearFoot, REAR_HEEL - 2),
  farFoot: GUARD.farFoot,
  nearFist: at(4, 48.5),
  farFist: at(8, 37.7),
  bends: BENDS,
  farHand: 'open',
  face: 'effort',
};

/** 3, heavy hits: halfway there, the chest up, the rear shoulder rolled to shake it off. */
const ROLL: Pose = {
  ...tween(WINDED, SHAKEN, 0.5),
  torso: 28,
  head: -16,
  shrug: 4,
  twist: 0.6,
  reach: { near: 1.2 },
  nearFist: at(0.5, 45),
  bends: BENDS,
  effects: [],
};

export const POSES: readonly Pose[] = [FOLD, BRIDGE, WINDED, ROLL, SHAKEN];
