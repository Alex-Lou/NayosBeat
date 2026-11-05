import { at, GUARD, type Pose } from './common.ts';

/**
 * idle: 8 frames ([7, 6, 6, 7, 7, 6, 6, 7] = 52 ticks), looping. Koda's open-palm martial guard
 * breathes in a smooth acoustic wave: his knees dip and rise while his open palms trace a slow
 * circular figure-eight, the lead silver vambrace gliding down and forward as the rear palm rises,
 * then trading places on the inhale. Frame 0 is exactly GUARD.
 */
export const POSES: readonly Pose[] = [
  GUARD,
  // Dipping into the knees, lead open palm gliding down, rear palm rising.
  { ...GUARD, hip: at(-6.6, 36.0), nearFist: at(8.2, 50.8), farFist: at(9.6, 62.0) },
  { ...GUARD, hip: at(-7.1, 35.5), nearFist: at(7.6, 50.0), farFist: at(9.2, 62.4) },
  // Bottom of the breath: the open palms poise before reversing the circle.
  { ...GUARD, hip: at(-7.1, 35.5), nearFist: at(7.9, 50.4), farFist: at(9.0, 61.8) },
  // Rising back up, the lead palm lifting toward the chin as the rear hand settles.
  { ...GUARD, hip: at(-6.6, 36.0), nearFist: at(8.5, 51.4), farFist: at(9.4, 61.2) },
  { ...GUARD, hip: at(-6.6, 36.5), nearFist: at(8.9, 52.4), farFist: at(9.8, 61.0) },
  // Crest of the breath: the lead shoulder rolls slightly with the silver pauldron.
  {
    ...GUARD,
    hip: at(-6.6, 36.5),
    shrug: 1.68,
    nearFist: at(8.8, 52.8),
    farFist: at(10.0, 61.4),
  },
  {
    ...GUARD,
    hip: at(-6.6, 36.5),
    shrug: 1.68,
    nearFist: at(8.7, 52.4),
    farFist: at(9.9, 61.5),
  },
];
