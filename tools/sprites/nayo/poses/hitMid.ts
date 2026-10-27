import { at, GUARD, type Pose } from './common.ts';
import { onHeel, onToes, skid } from './hitHigh.ts';

/**
 * hitMid (docs/combat-v2.md §9.4, §11.1; with hitHigh and hitLow, replaces the standing hit):
 * 5 frames. A hit to the body: doubled over at the belly. Heavy hits (hitstun 18 and more) play
 * frames 0-4, light ones 0, 1 and 4; the last frame holds to the end of the stun, then the
 * guard takes over: it leads back to the guard.
 *
 * The blow lands in the belly and folds him: frame 0, held through the hitstop, is the fold at
 * its deepest, the strongest read of the strip: the hips punched back over the rear foot, the
 * chest doubled over the blow, the chin down, the forearms clutched over the belly, the lead
 * leg braced straight. Frame 1 bridges halfway back to the guard, the chest coming up and the
 * gloves climbing, so a light hit flows on into the held frame 4. Heavy hits get two more
 * beats: winded, he sags again, smaller, a hand back on the belly while the head comes up to
 * find the opponent, jaw set (2), then the chest unfolds and the gloves climb (3). Frame 4,
 * held, is the shaken guard of a body shot: hunched, the elbows pinched in over the ribs, the
 * gloves a little low, eyes squeezed shut. The fold always goes back into the hips, never
 * toward the opponent: above the belly the drawing stays behind the guard's front.
 */

/** Held through the hitstop: doubled over at its deepest, the forearms clutched on the belly. */
const FOLD: Pose = {
  hip: at(-17.5, 32.4),
  torso: 39,
  head: -10,
  shrug: 2.6,
  twist: -0.25,
  nearFoot: onHeel(GUARD.nearFoot, 4),
  farFoot: onToes(GUARD.farFoot, -3),
  nearFist: at(-2, 36),
  farFist: at(-4.5, 38.5),
  bends: { nearElbow: 'back', farElbow: 'back' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/** Halfway back up: the chest rising off the fold, the gloves climbing toward the guard. */
const BRIDGE: Pose = {
  hip: at(-12.3, 33.8),
  torso: 31,
  head: -12,
  shrug: 2.6,
  twist: -0.1,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -8),
  nearFist: at(4, 44.5),
  farFist: at(5, 51.5),
  face: 'hurt',
  effects: [skid(14.5, 2.4, 0.45), skid(-17, 1.8, 0.4)],
};

/**
 * Heavy hits: winded, he sags again (less than the fold), a hand back on the belly, while the
 * head comes up first, jaw set, looking for the opponent.
 */
const WINDED: Pose = {
  hip: at(-14, 33.2),
  torso: 33,
  head: -15,
  shrug: 2.8,
  twist: -0.2,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -5),
  nearFist: at(-0.5, 38.5),
  farFist: at(3, 49),
  bends: { nearElbow: 'back', farElbow: 'down' },
  nearHand: 'open',
  face: 'effort',
  effects: [skid(15, 2.2, 0.8), skid(-17.5, 1.6, 0.75)],
};

/** Unfolding: the chest comes up, the gloves climb, the near elbow still over the ribs. */
const UNFOLD: Pose = {
  hip: at(-9.4, 34.7),
  torso: 23,
  head: -5,
  shrug: 2.5,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -10),
  nearFist: at(6.5, 49),
  farFist: at(7.8, 57),
  face: 'hurt',
};

/**
 * The shaken guard of a body shot, held while the hitstun lasts: hunched over the belly, the
 * elbows pinched in over the ribs, the gloves a little low, eyes squeezed shut.
 */
const SHAKEN: Pose = {
  hip: at(-7.9, 35.2),
  torso: 19,
  head: -1,
  shrug: 2.2,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -13),
  nearFist: at(8.2, 53.2),
  farFist: at(9, 60.2),
  face: 'hurt',
};

export const POSES: readonly Pose[] = [FOLD, BRIDGE, WINDED, UNFOLD, SHAKEN];
