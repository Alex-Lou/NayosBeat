import { at, GUARD, planted, smear, type Effect, type Pose } from './common.ts';

/**
 * getup (docs/combat-v2.md §3.8, §11.1): 5 frames, 2 ticks each (10), the last 10 ticks of the
 * 40-tick knockdown: from lying on his back up to the guard. The knockdown strip shrinks to 6
 * frames (3, 3, 4, 6, 6, 8 ticks) of falling and lying; this strip is today's kip-up (the
 * knockdown's frames 4-8), retimed twice as fast and reworked for it.
 *
 * From flat on his back (the knockdown's lying pose: knees up, head raised), a kip-up in a
 * sixth of a second, every frame a key: he rocks back onto his shoulders, the legs swung up
 * over him and the palms planted by his ears (0, a cyan trail along the legs' swing sells the
 * speed); whips the legs over and down, shoving off the floor, airborne in a bridge (1); lands
 * low and wide right in the guard's footprint on a sound ring, the beat dropping (2); springs
 * up a touch past the guard, the lead shoulder rolling in to the chin (3); and settles exactly
 * in the guard (4), so idle takes over without a pop. Lying poses stretch backward (the head
 * toward negative x) so his feet stay off the opponent; once down, the feet never slide. The
 * head turns past 20 degrees (RotSprite) only while he is on the floor.
 */

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
  effects: [
    // The feet's swing from the floor (knees up, lying) up and over him.
    smear(4, [10, 9], [6, 24], [-6, 38], [-18, 45], [-26, 46]),
  ],
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
  // 0 · Rocked back onto the shoulders, loaded.
  CHAMBER,
  // 1 · The kip: the legs whip over and down under him, the back arches into a bridge, the
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
  // 2 · Lands low and wide, in the guard's footprint, the gloves coming up, eyes on the opponent.
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
  // 3 · Springs up a touch past the guard, the lead shoulder rolling in to the chin.
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
  // 4 · Settled in the guard, the ring gone: idle takes over without a pop.
  GUARD,
];
