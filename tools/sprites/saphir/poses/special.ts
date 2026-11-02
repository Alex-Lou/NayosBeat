import { at, behindBack, GUARD, planted, raised, smear, type Pose } from './common.ts';

/**
 * special (Syncope, docs/saphir.md §4): 8 frames, 3, 3, 3, 3, 3, 6, 8, 8 ticks (37), the heel
 * lands on frame 4 (ticks 12-14), hitbox 14..58 / 34..48. The game carries her 28 px in over
 * ticks 2-10 and 28 px back out over ticks 16-30: the swing step and the step out are the game's,
 * the poses dance them in place.
 *
 * Her S, nothing like the Chassé's straight thrust: a crescent. On the long beat she switches her
 * feet; the rear leg sweeps up from behind, straight, over the top, and comes down on the short
 * beat like a needle on the record, at hip height; then it sinks on through and she is gone. Its
 * trail writes an S in sapphire: up the front on frame 3, over and down on frame 4, round under
 * on frame 5. The hands never leave her back.
 *
 * - 0: the long beat: the weight dips, the lead foot on its toes.
 * - 1: the switch: the near foot steps behind, the far one plants in front.
 * - 2: the knee comes up in front, folded, the torso starting back.
 * - 3: the leg straight up over her, the toes pointed at the ceiling; the trail up its path.
 * - 4: impact, kiai: the leg straight at hip height, the toes pointed on the far edge of the
 *   hitbox, the trail arcing down from the top; her energy bursts off the instep (the Remix
 *   redraws it in platine).
 * - 5: the leg sinks on through, the trail curling under it.
 * - 6: she steps out, the near foot back down behind.
 * - 7: back in her guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-2, 34.5),
    torso: 3,
    nearFoot: planted(10, -24),
    farFoot: planted(-13, -8),
  },
  {
    ...GUARD,
    hip: at(2, 35.5),
    torso: 0,
    nearFoot: planted(-10, -14),
    farFoot: planted(8),
  },
  {
    ...GUARD,
    hip: at(8, 37),
    torso: -12,
    farFoot: planted(8),
    nearFoot: raised(15.3, 34, -50),
    bends: { ...GUARD.bends, nearKnee: 'front' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(12, 37.5),
    torso: -24,
    farFoot: planted(10),
    nearFoot: raised(23.5, 69.1, 100),
    bends: { ...GUARD.bends, nearKnee: 'back' },
    face: 'effort',
    effects: [smear(3, [2, 22], [14, 45], [22, 66])],
  },
  {
    ...GUARD,
    hip: at(17, 37.5),
    torso: -28,
    farFoot: planted(14),
    nearFoot: raised(50.5, 42, 38),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'kiai',
    effects: [
      smear(3.5, [24, 69], [40, 65], [50, 54], [53, 44]),
      { kind: 'energy', center: at(55, 42), radius: 3.5 },
    ],
  },
  {
    ...GUARD,
    hip: at(12, 37.5),
    torso: -16,
    farFoot: planted(10),
    nearFoot: raised(39.4, 18.1, -5),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    effects: [smear(3, [53, 42], [49, 28], [41, 19])],
  },
  {
    ...GUARD,
    hip: at(2, 35.5),
    torso: 0,
    farFoot: planted(9),
    nearFoot: planted(-8, -10),
  },
  {
    ...GUARD,
    hip: at(-2, 35.5),
    nearFoot: planted(9, -22),
    farFoot: planted(-13),
  },
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
