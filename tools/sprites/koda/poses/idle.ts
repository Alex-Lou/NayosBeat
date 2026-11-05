import { at, GUARD, type Pose } from './common.ts';

/**
 * idle: 8 frames ([7, 6, 6, 7, 7, 6, 6, 7] = 52 ticks), looping.
 * Open-chest Kung-Fu / Anime-Fighter stance (nothing like Nayo's two-gloves-at-the-chin boxing
 * guard): Koda's lead arm (`nearFist`) is chambered low at his waist/hip (`x = -7.5, y = 40`),
 * leaving his bare chest, sternum resonator core and open storm-teal frock coat completely
 * uncovered, while his rear arm (`farFist`) extends forward in a beckoning open knife-hand
 * (`x = 9.2, y = 56`) that traces a slow tai-chi figure-eight as his knees dip and rise.
 */
export const POSES: readonly Pose[] = [
  GUARD,
  // Sinking into the stance as the extended rear knife-hand glides down-out and the hip hand coils.
  { ...GUARD, hip: at(-6.8, 35.8), torso: 13, nearFist: at(-8.0, 39.4), farFist: at(9.5, 54.6) },
  { ...GUARD, hip: at(-7.1, 35.0), torso: 14, nearFist: at(-8.4, 38.8), farFist: at(9.6, 53.5) },
  // Bottom of the breath: the extended palm poises before rising back up.
  { ...GUARD, hip: at(-7.0, 35.2), torso: 13.5, nearFist: at(-8.2, 39.0), farFist: at(9.4, 54.0) },
  // Rising out of the knees: the beckoning rear palm lifts toward brow height.
  { ...GUARD, hip: at(-6.6, 36.0), torso: 12.5, nearFist: at(-7.6, 39.8), farFist: at(9.1, 55.6) },
  { ...GUARD, hip: at(-6.4, 36.8), torso: 11.5, nearFist: at(-7.0, 40.6), farFist: at(8.8, 57.2) },
  // Crest of the breath: chest open, silver pauldron gleaming.
  {
    ...GUARD,
    hip: at(-6.4, 36.8),
    torso: 11.5,
    shrug: 1.5,
    nearFist: at(-6.8, 40.8),
    farFist: at(9.0, 57.6),
  },
  {
    ...GUARD,
    hip: at(-6.5, 36.6),
    torso: 12,
    shrug: 1.2,
    nearFist: at(-7.2, 40.4),
    farFist: at(9.1, 56.8),
  },
];
