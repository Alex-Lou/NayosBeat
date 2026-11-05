import { at, GUARD, type Pose } from './common.ts';

/**
 * idle: 8 frames ([7, 6, 6, 7, 7, 6, 6, 7] = 52 ticks), looping.
 * Feline's agile cat-brawler stance breathes with a feline bounce: her knees dip and spring while
 * her lead claw-hand and rear fist weave in a light rhythm, her silver-white mane and S-curved tail
 * swaying with each beat. Frame 0 is exactly GUARD.
 */
export const POSES: readonly Pose[] = [
  GUARD,
  { ...GUARD, hip: at(-6.8, 35.8), torso: 14.5, nearFist: at(8.4, 51.4), farFist: at(9.3, 61.0) },
  { ...GUARD, hip: at(-7.1, 35.0), torso: 15, nearFist: at(7.8, 50.4), farFist: at(9.0, 61.4) },
  { ...GUARD, hip: at(-7.0, 35.2), torso: 14.8, nearFist: at(8.1, 50.8), farFist: at(9.1, 61.0) },
  { ...GUARD, hip: at(-6.6, 36.0), torso: 14, nearFist: at(8.8, 52.0), farFist: at(9.5, 60.4) },
  { ...GUARD, hip: at(-6.4, 36.8), torso: 13.5, nearFist: at(9.3, 53.2), farFist: at(9.8, 60.0) },
  {
    ...GUARD,
    hip: at(-6.4, 36.8),
    torso: 13.5,
    shrug: 1.7,
    nearFist: at(9.4, 53.5),
    farFist: at(9.8, 60.2),
  },
  {
    ...GUARD,
    hip: at(-6.5, 36.6),
    torso: 14,
    shrug: 1.4,
    nearFist: at(9.2, 52.9),
    farFist: at(9.7, 60.4),
  },
];
