import {
  at,
  GUARD,
  onBall,
  onHeel,
  toeOf,
  tween,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';

export const ANIMATED: boolean = true;

/**
 * hitHigh (docs/combat-v2.md §9.4, §11.1; with hitMid and hitLow, her standing hit): 5 frames,
 * 3, 3, 4, 4 ticks, the last held. A blow above 60 % of her height: the head thrown back. Heavy
 * hits (hitstun 18 and more) play frames 0-4, light ones 0, 1 and 4; the last frame holds to the
 * end of the stun and leads back to the guard.
 *
 * Not a boxer rocked on his heels: a b-girl's elastic body that takes the whole whip, from the
 * crown to the knees, and a punk who shrugs it off.
 *
 * - 0, held through the hitstop: the back-bend. The head flung back (37 degrees on screen: the
 *   head turns) and the shoulders after it, the hips thrust forward and down under them, the
 *   lead knee buckling forward: one bow from the lead knee to the crown, the lead toes popping
 *   up. The loaded rear fist is whipped off her ear, up and back, the arm near straight, the
 *   hand open; the lead hand left out in front, open. The strongest read of the strip.
 * - 1: the rebound: the hips swing back past the feet's middle and the chest comes back in over
 *   them while the head still lags back (22 degrees, turned); the rear arm falls and drags low
 *   behind her hip, the lead one hangs in front; the feet scrape back under the pushback. She
 *   glares through it (`effort`: the eye open, the jaw set). A light hit flows from here into
 *   the held frame 4.
 * - 2 (heavy): the sag: the head overshoots, the chin on the chest (turned the other way), the
 *   hips drop low into the plié, the knees opening wide, the arms loose: the whole body rocked.
 * - 3 (heavy): the punk beat, halfway up to frame 4: the back of the rear glove wipes her chin
 *   (under the lips, the face stays readable), the jaw set: that all you got?
 * - 4, held: still rocked back, not her guard yet: the chest up (10 degrees of lean against the
 *   guard's 19), the chin up with it, the hips back over her rear leg, the lead toes still up;
 *   the rear fist down from the ear to under the chin, the lead fist low and loose, the rear
 *   shoulder shrugged into the collar. One step out of the guard, so the hand-off at the end of
 *   the stun reads as her taking her stance back.
 *
 * The head never sits at a tilt that RotSprite would only half turn: 37 and 22 degrees back, 26
 * forward, otherwise the source drawing (under 20). The `hurt` face (the lid shut) is kept for
 * the snap and for the sag, the chin on her chest; on the rebound, the head still thrown back,
 * it would read as a swoon, so there she glares (`effort`). Every beat moves away from the
 * opponent, never into her: only the back-bend thrusts the hips and the lead knee forward (the
 * knee reaches x = 16, at knee height), while the chest and the head go back.
 */

/** Dust kicked up by a foot scraping back under the blow (the pushback slides her). */
export function skid(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** `foot` turned to `angle` on its ball: the toe stays on its floor pixel, the heel swings. */
export function onToes(foot: Foot, angle: number): Foot {
  return onBall(toeOf(foot), angle);
}

/** The guard's rear heel (degrees up, negative): the ball she springs on. */
export const REAR_HEEL = GUARD.nearFoot.angle ?? 0;

/** The guard's bends, in every frame: her rear knee bent forward. */
export const BENDS = GUARD.bends ?? {};

/** Where the lead and rear toes scrape on the floor. */
export const LEAD_TOE = toeOf(GUARD.farFoot);
export const REAR_TOE = toeOf(GUARD.nearFoot);

/** 0, through the hitstop: the back-bend, the hips thrust forward, the rear arm whipped up. */
const SNAP: Pose = {
  hip: at(-3, 29.5),
  torso: -19,
  head: -18,
  shrug: -1,
  twist: 0.75,
  nearFoot: onToes(GUARD.nearFoot, -1),
  farFoot: onHeel(GUARD.farFoot, 14),
  nearFist: at(-27, 64),
  farFist: at(6.5, 48.5),
  bends: BENDS,
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/** 1: the hips swing back, the chest comes in, the head still back, the rear arm dragging. */
const REBOUND: Pose = {
  hip: at(-9, 28.6),
  torso: 8,
  head: -30,
  shrug: 0.4,
  twist: 0.55,
  nearFoot: onToes(GUARD.nearFoot, REAR_HEEL + 5),
  farFoot: onHeel(GUARD.farFoot, 4),
  nearFist: at(-24, 35),
  farFist: at(4, 35),
  bends: BENDS,
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
  effects: [skid(LEAD_TOE, 2.6, 0.45), skid(REAR_TOE, 1.8, 0.4)],
};

/** 2, heavy hits: the sag, the chin on the chest, the hips low in the plié, the arms loose. */
const SAG: Pose = {
  hip: at(-9.2, 27),
  torso: 22,
  head: 4,
  shrug: 1.6,
  twist: 0.3,
  nearFoot: onToes(GUARD.nearFoot, REAR_HEEL - 2),
  farFoot: GUARD.farFoot,
  nearFist: at(-15, 31),
  farFist: at(4, 30),
  bends: { ...BENDS, farElbow: 'back' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(LEAD_TOE + 0.5, 2.4, 0.8), skid(REAR_TOE - 0.5, 1.7, 0.75)],
};

/** 4, held to the end of the stun: rocked back, the chin up, the rear fist under the chin. */
const SHAKEN: Pose = {
  hip: at(-8.4, 30.6),
  torso: 10,
  head: -10,
  shrug: 3.4,
  twist: 0.4,
  nearFoot: onToes(GUARD.nearFoot, REAR_HEEL - 2),
  farFoot: onHeel(GUARD.farFoot, 6),
  nearFist: at(0, 52),
  farFist: at(5, 40),
  bends: BENDS,
  face: 'effort',
};

/** 3, heavy hits: halfway up, the back of the rear glove wiping her chin. */
const WIPE: Pose = {
  ...tween(SAG, SHAKEN, 0.5),
  nearFist: at(3, 52.5),
  nearHand: 'open',
  farHand: 'fist',
  face: 'effort',
  effects: [],
};

export const POSES: readonly Pose[] = [SNAP, REBOUND, SAG, WIPE, SHAKEN];
