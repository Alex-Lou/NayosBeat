import { at, GUARD, lifted, planted, type Pose } from './common.ts';
import { onToes, skid } from './hitHigh.ts';

/**
 * hitLow (docs/combat-v2.md §9.4, §11.1; with hitHigh and hitMid, replaces the standing hit):
 * 5 frames. A low hit (blocked low, or landing in the lower third of his hurtbox): the struck
 * leg buckles, a hop on the other foot. Heavy hits (hitstun 18 and more) play frames 0-4, light
 * ones 0, 1 and 4; the last frame holds to the end of the stun, then the guard takes over: it
 * leads back to the guard.
 *
 * The kick takes the lead shin: frame 0, held through the hitstop, knocks the lead foot back
 * onto its toes, the knee buckling forward, the weight dumped onto the rear leg; the hips drop,
 * the chest pitches over the hurt leg, the lead hand reaches down for the knee, the rear arm
 * swings back for balance. Frame 1 is a small hop on the rear foot, on the way to the heavy
 * hit's big hop: the hurt foot drawn up off the floor, the hand still on the knee rising with
 * it, the rear arm still thrown back and starting to climb (every joint moving one way from 0
 * through 2: a frame 1 heading back to the guard pumped the whole figure in and out again in
 * the middle of the heavy hop). On a light hit it drops straight into the held frame 4, as
 * hitHigh's frame 1 does. Heavy hits get the big hop (2): the hurt knee drawn up high, the
 * hand clutching it, the rear arm flung up for balance; then he lands and sets the hurt foot
 * down gingerly on its toes as the gloves climb back (3). Frame 4, held, is the shaken guard
 * on a sore leg: the weight kept off it on the rear foot, the lead heel up, eyes squeezed
 * shut. The hurt leg folds back under him, never kicks forward.
 */

/** Held through the hitstop: the lead foot knocked back onto its toes, the knee buckling. */
const IMPACT: Pose = {
  hip: at(-9, 32),
  torso: 25,
  head: -6,
  shrug: 1.4,
  twist: -0.1,
  nearFoot: planted(-0.5, -42),
  // The rear knee sinks under the weight: its heel lifts with it (a flat foot under a knee this
  // far forward would fold the ankle past its stop).
  farFoot: onToes(GUARD.farFoot, -29),
  nearFist: at(10, 30.5),
  // The rear arm swung back for balance, the elbow soft, as far as a shoulder goes behind.
  farFist: at(-22.1, 39.5),
  bends: { nearElbow: 'down', farElbow: 'up' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/**
 * The small hop on the rear foot, between the impact and the big hop: the hurt foot drawn up
 * off the floor, the hand still on the knee as it rises, the rear arm still thrown back,
 * starting to climb; the chest straightening a little, the head coming back up.
 */
const HOP: Pose = {
  hip: at(-8.6, 35),
  torso: 23.5,
  head: -4,
  shrug: 1.5,
  nearFoot: { x: 0.5, y: 10.8, angle: -41 },
  farFoot: lifted(onToes(GUARD.farFoot, -24), 1.5),
  nearFist: at(9.5, 32.8),
  farFist: at(-23.2, 44.5),
  bends: { farElbow: 'up' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(-17, 1.8, 0.35)],
};

/**
 * Heavy hits, the big hop: the hurt knee drawn up high, the lead hand clutching it, the rear
 * arm flung up behind for balance.
 */
const HIGH_HOP: Pose = {
  hip: at(-8.8, 36.6),
  torso: 22,
  head: -3,
  shrug: 1.6,
  nearFoot: { x: 1.5, y: 13.8, angle: -40 },
  farFoot: lifted(planted(-22.8, -26), 2.8),
  // The lead hand on the raised knee, the elbow soft; the rear arm thrown back level with
  // the chest (the torso pitched forward lets it go that high behind him).
  nearFist: at(9.8, 34.6),
  farFist: at(-25.2, 48.6),
  bends: { farElbow: 'up' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(-17.5, 2.2, 0.7)],
};

/** Landed: the hurt foot set down gingerly on its toes, the gloves climbing back. */
const TEST: Pose = {
  hip: at(-8.2, 34.6),
  torso: 16,
  head: 2,
  shrug: 2.4,
  nearFoot: onToes(GUARD.nearFoot, -24),
  farFoot: onToes(GUARD.farFoot, -19),
  nearFist: at(7, 50.5),
  farFist: at(6.8, 55),
  face: 'hurt',
  effects: [{ kind: 'dust', x: -18, size: 2.4, progress: 0.2 }],
};

/**
 * The shaken guard on a sore leg, held while the hitstun lasts: the weight back on the rear
 * foot, the lead heel up off the floor, the gloves short of their place, eyes squeezed shut.
 */
const SHAKEN: Pose = {
  hip: at(-7.6, 35.5),
  torso: 16.5,
  head: 1.5,
  shrug: 2.2,
  nearFoot: onToes(GUARD.nearFoot, -9),
  farFoot: onToes(GUARD.farFoot, -13),
  nearFist: at(8.3, 53.6),
  farFist: at(9.4, 61),
  face: 'hurt',
};

export const POSES: readonly Pose[] = [IMPACT, HOP, HIGH_HOP, TEST, SHAKEN];
