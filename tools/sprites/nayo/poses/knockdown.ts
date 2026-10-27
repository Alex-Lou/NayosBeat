import { at, GUARD, planted, smear, type Effect, type Pose } from './common.ts';

/**
 * knockdown: 9 frames, 3,3,4,10,4,4,4,4,4 ticks (40, the knockdown time). He slams onto his
 * back (slapping the floor like a trained fighter), bounces, lies there a beat with his head
 * up, then kips up: rocks back onto his shoulders, whips the legs over and down (a cyan trail
 * along the swing), springs up and lands low and wide right in the guard's footprint on a sound
 * ring (the beat drops), springs up a touch past the guard and settles into it: the last frame
 * is exactly GUARD, so idle takes over without a pop, and the feet never slide once down.
 * Lying poses stretch backward (head toward negative x) so his feet stay off the opponent; the
 * head turns past 20 degrees (RotSprite) only while he is on the floor.
 */

/** Flat on his back, head raised toward the opponent, knees up: ready to kip up. */
const LYING: Pose = {
  hip: at(-9, 6),
  torso: -80,
  head: 30,
  shrug: 0,
  nearFoot: planted(6, 0),
  farFoot: planted(13, 8),
  nearFist: at(-9, 11.5),
  farFist: at(-50, 5.2),
  bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/**
 * Rolled back onto the shoulders, hips up, legs swung up over him, the palms planted flat on
 * the floor beside and behind the head, the elbows bent up toward the sky: loaded to push. The
 * near palm goes just past the head, so its sleeve crosses above the face instead of over it.
 */
const CHAMBER: Pose = {
  hip: at(-17, 15),
  torso: -105,
  head: 5,
  shrug: 0,
  nearFoot: { x: -26, y: 44, angle: 90 },
  farFoot: { x: -30, y: 42, angle: 85 },
  nearFist: at(-56.5, 4),
  farFist: at(-52, 3.5),
  bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'back', farKnee: 'back' },
  nearHand: 'open',
  farHand: 'open',
  face: 'focus',
};

/** Where the floor ring of the landing spreads from (the beat drops as his feet hit). */
const landingRing = (progress: number): Effect => ({
  kind: 'ring',
  center: at(-7, 1),
  radius: 24,
  progress,
  tone: 'sound',
  squash: 0.3,
});

export const POSES: readonly Pose[] = [
  // 0 · Impact: the back slams the floor, legs fly up, the lead arm slaps the floor.
  {
    hip: at(-10, 6),
    torso: -80,
    head: -8,
    shrug: 0,
    nearFoot: { x: 2, y: 31, angle: 20 },
    farFoot: { x: 10, y: 26, angle: 30 },
    nearFist: at(-7, 3),
    farFist: at(-48, 5),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [
      { kind: 'dust', x: -34, size: 5, progress: 0.05 },
      { kind: 'dust', x: -6, size: 5.5, progress: 0.05 },
    ],
  },
  // 1 · Bounce: the whole body pops off the floor, limbs lagging.
  {
    hip: at(-10.5, 12.4),
    torso: -76,
    head: 24,
    shrug: 0,
    nearFoot: { x: 7, y: 32, angle: 10 },
    farFoot: { x: 14, y: 27, angle: 25 },
    nearFist: at(-8, 4),
    farFist: at(-46, 14),
    bends: { nearElbow: 'up', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [
      { kind: 'dust', x: -34, size: 5, progress: 0.4 },
      { kind: 'dust', x: -6, size: 5.5, progress: 0.4 },
    ],
  },
  // 2 · Drops back: legs come down, a second small puff.
  {
    hip: at(-9.5, 6),
    torso: -80,
    head: 22,
    shrug: 0,
    nearFoot: { x: 8, y: 9, angle: 10 },
    farFoot: { x: 17, y: 6.5, angle: 50 },
    nearFist: at(-8, 9),
    farFist: at(-49, 8),
    bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [
      { kind: 'dust', x: -34, size: 5, progress: 0.75 },
      { kind: 'dust', x: -6, size: 5.5, progress: 0.75 },
      { kind: 'dust', x: 17, size: 3.5, progress: 0.15 },
    ],
  },
  // 3 · Lying (held 10 ticks).
  LYING,
  // 4 · Chamber: rocks back onto the shoulders.
  CHAMBER,
  // 5 · The kip: the legs whip over and down under him, the back arches into a bridge, the
  // palms shove off the floor behind the shoulders and the chin tucks: he is airborne, halfway
  // up the arc from the floor to the landing.
  {
    hip: at(-10, 27),
    torso: -45,
    head: 25,
    shrug: 0,
    nearFoot: { x: 0, y: 9, angle: -10 },
    farFoot: { x: -12, y: 11, angle: -25 },
    // The arms straighten back down toward the floor they just shoved off.
    nearFist: at(-34, 21),
    farFist: at(-37, 21),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front', farKnee: 'front' },
    nearHand: 'open',
    farHand: 'open',
    face: 'focus',
    effects: [
      // The feet's whip: up off the chamber, over in front of him and down under the hips.
      smear(4, [-22, 46], [-12, 49], [-2, 43], [4, 31], [3, 18], [0, 9]),
      { kind: 'speed', center: at(-22, 22), length: 10, spread: 5, direction: 65, tone: 'sound' },
    ],
  },
  // 6 · Lands low and wide, in the guard's footprint, the gloves coming up, eyes on the opponent.
  {
    hip: at(-7.4, 25.5),
    torso: 24,
    head: -6,
    shrug: 1.5,
    nearFoot: GUARD.nearFoot,
    farFoot: planted(GUARD.farFoot.x, -22),
    nearFist: at(9, 45),
    farFist: at(10.5, 52),
    bends: { nearElbow: 'down', farElbow: 'down' },
    face: 'focus',
    effects: [
      { kind: 'dust', x: 9, size: 4, progress: 0.15 },
      { kind: 'dust', x: -21, size: 4, progress: 0.15 },
      landingRing(0.15),
    ],
  },
  // 7 · Springs up a touch past the guard, the lead shoulder rolling in to the chin.
  {
    ...GUARD,
    hip: at(-6.4, 37.5),
    torso: 13,
    head: 3,
    shrug: 1.9,
    nearFist: at(8.8, 55.6),
    farFist: at(10.4, 63.4),
    effects: [
      { kind: 'dust', x: 9, size: 4, progress: 0.6 },
      { kind: 'dust', x: -21, size: 4, progress: 0.6 },
      landingRing(0.75),
    ],
  },
  // 8 · Settled in the guard, the ring gone: idle takes over without a pop.
  GUARD,
];
