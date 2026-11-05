import { at, GUARD, type Pose } from './common.ts';

/**
 * idle: 8 frames ([7, 6, 6, 7, 7, 6, 6, 7] = 52 ticks), looping.
 * Feline's agile cat-fighter boxer-kickboxer guard (`poing_01_garde.png`) breathes with a springy
 * rhythm: her knees dip and rise while her gloved fists weave lightly in front of her chin, her
 * long C-hook white tail and high ponytail swaying with each beat. Frame 0 is GUARD.
 */
export const POSES: readonly Pose[] = [
  GUARD,
  { ...GUARD, hip: at(-6.8, 35.8), torso: 13.5, nearFist: at(8.2, 51.6), farFist: at(8.6, 58.0) },
  { ...GUARD, hip: at(-7.1, 35.0), torso: 14.0, nearFist: at(7.8, 50.8), farFist: at(8.4, 58.4) },
  { ...GUARD, hip: at(-7.0, 35.2), torso: 13.8, nearFist: at(8.0, 51.2), farFist: at(8.5, 58.1) },
  { ...GUARD, hip: at(-6.6, 36.0), torso: 13.0, nearFist: at(8.5, 52.1), farFist: at(8.7, 57.6) },
  { ...GUARD, hip: at(-6.4, 36.8), torso: 12.5, nearFist: at(8.8, 53.0), farFist: at(8.9, 57.2) },
  {
    ...GUARD,
    hip: at(-6.4, 36.8),
    torso: 12.5,
    shrug: 1.5,
    nearFist: at(8.9, 53.2),
    farFist: at(9.0, 57.3),
  },
  {
    ...GUARD,
    hip: at(-6.5, 36.6),
    torso: 13.0,
    shrug: 1.2,
    nearFist: at(8.7, 52.8),
    farFist: at(8.9, 57.4),
  },
];
