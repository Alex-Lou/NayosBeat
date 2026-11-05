import { at, GUARD, type Pose } from './common.ts';

/**
 * idle: 8 frames ([7, 6, 6, 7, 7, 6, 6, 7] = 52 ticks), looping. Koda's martial-arts open-hand
 * guard weaves in a visible circular tai-chi / tuning wave: his knees sink and rise while his low
 * lead knife-hand and high rear palm trace opposing arcs, his long split frock-coat tails and
 * headband ribbons swaying with the breath. Frame 0 is exactly GUARD.
 */
export const POSES: readonly Pose[] = [
  GUARD,
  // Sinking into the stance as the lead knife-hand sweeps down-in and the rear palm rises.
  { ...GUARD, hip: at(-6.8, 35.8), torso: 14.5, nearFist: at(8.2, 46.5), farFist: at(9.4, 62.2) },
  { ...GUARD, hip: at(-7.1, 35.2), torso: 15, nearFist: at(7.5, 45.4), farFist: at(9.0, 62.6) },
  // Bottom of the breath: the palms poise at the ends of their arc.
  { ...GUARD, hip: at(-7.0, 35.4), torso: 14.8, nearFist: at(7.8, 45.8), farFist: at(9.2, 62.2) },
  // Rising out of the knees: the lead gauntlet glides up-out while the rear hand lowers.
  { ...GUARD, hip: at(-6.6, 36.0), torso: 14, nearFist: at(8.6, 47.2), farFist: at(9.6, 61.4) },
  { ...GUARD, hip: at(-6.5, 36.6), torso: 13.5, nearFist: at(9.2, 48.8), farFist: at(10.0, 60.8) },
  // Crest of the breath: the lead silver pauldron rolls up, the tuning blade gleaming.
  {
    ...GUARD,
    hip: at(-6.5, 36.6),
    torso: 13.5,
    shrug: 1.8,
    nearFist: at(9.3, 49.2),
    farFist: at(9.9, 61.2),
  },
  {
    ...GUARD,
    hip: at(-6.6, 36.5),
    torso: 14,
    shrug: 1.5,
    nearFist: at(9.1, 48.5),
    farFist: at(9.8, 61.5),
  },
];
