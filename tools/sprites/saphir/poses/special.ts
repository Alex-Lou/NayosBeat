import { at, GUARD, planted, raised, smear, type Pose } from './common.ts';

/**
 * special (Syncope, docs/saphir.md §4): 8 frames, 3, 3, 3, 3, 3, 6, 8, 8 ticks (37), the
 * fouetté cracks on frame 4 (ticks 12-14), hitbox 14..58 / 34..48. The game carries her 28 px
 * in over ticks 2-10 and 28 px back out over ticks 16-30: the swing step and the step out are
 * the game's, the poses dance them in place. On the long beat she switches her feet, on the
 * short one the rear leg whips round and the instep cracks at hip height, then she is gone.
 *
 * - 0: the long beat: the weight dips, the lead heel lifts.
 * - 1: the switch: the near foot steps behind, the far one plants in front.
 * - 2: the chamber: the near knee comes up from behind, the hips turning.
 * - 3: the whip: the shin unfolds, the torso leaning away, a trail behind the foot.
 * - 4: impact, kiai: the leg straight at hip height, the toes pointed on the far edge of the
 *   hitbox, the near arm thrown down the other way to whip the hips round (what tells it from
 *   the Chassé's sole and high fists), her energy bursting off the instep (the Remix redraws it
 *   in platine).
 * - 5: the knee folds back.
 * - 6: she steps out, the near foot back down behind.
 * - 7: back in her guard.
 */
export const POSES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-2, 34.5),
    torso: 3,
    nearFoot: planted(10, -18),
    farFoot: planted(-13, -8),
    nearFist: at(12, 53),
    farFist: at(7, 55.5),
  },
  {
    ...GUARD,
    hip: at(2, 35.5),
    torso: 0,
    nearFoot: planted(-10, -14),
    farFoot: planted(8),
    nearFist: at(14, 54),
    farFist: at(9, 56.5),
  },
  {
    ...GUARD,
    hip: at(8, 37),
    torso: -10,
    farFoot: planted(8),
    nearFoot: raised(4, 30, -170),
    nearFist: at(16, 55),
    farFist: at(10, 58),
    bends: { ...GUARD.bends, nearKnee: 'front' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(12, 38.5),
    torso: -20,
    farFoot: planted(10),
    nearFoot: raised(30, 44, -10),
    nearFist: at(17, 56),
    farFist: at(10, 59),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
    effects: [smear(3, [8, 30], [20, 40], [32, 45])],
  },
  {
    ...GUARD,
    hip: at(15, 39.5),
    torso: -28,
    farFoot: planted(12),
    nearFoot: raised(50.5, 42, 18),
    nearFist: at(17, 45),
    farFist: at(15, 64),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'kiai',
    effects: [
      smear(3.5, [18, 36], [34, 44], [50, 43]),
      { kind: 'energy', center: at(55, 42), radius: 3.5 },
    ],
  },
  {
    ...GUARD,
    hip: at(10, 37),
    torso: -12,
    farFoot: planted(10),
    nearFoot: raised(18, 28, -20),
    nearFist: at(16, 55),
    farFist: at(10, 58),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(2, 35.5),
    torso: 0,
    farFoot: planted(9),
    nearFoot: planted(-8, -10),
    nearFist: at(14, 54),
    farFist: at(9, 56.5),
  },
  {
    ...GUARD,
    hip: at(-2, 35.5),
    nearFoot: planted(9, -12),
    farFoot: planted(-13),
  },
];
