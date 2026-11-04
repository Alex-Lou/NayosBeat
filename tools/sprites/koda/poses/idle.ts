import { at, GUARD, type Pose } from './common.ts';

/**
 * idle: 10 frames of 6 ticks, looping (one second). The guard bouncing on the beat: a deep dip
 * on the knees (frames 1 to 4, sitting a pixel back into the hips at the bottom), a lighter one
 * (6 and 7), then a short hang where the lead shoulder rolls up on the breath (8 and 9).
 * Overlapping action: the hips lead, the far glove follows them a frame late, the near forearm
 * trails the bounce, turning about its elbow.
 *
 * Pixel-locked: the upper body only moves by whole sprite pixels (0.5 world px) and never
 * turns, and the near upper arm keeps its angle (the shoulder roll of 0.68 is exactly one
 * sprite pixel), so the jacket, the neon emblem, the headphone ring and the head are the same
 * pixels in every frame, only shifted: nothing boils. The head stays at 17 degrees (drawn
 * upright, see head.ts) and the hair settled. Frame 0 is exactly GUARD: every move that ends in
 * the guard flows into it.
 */
export const POSES: readonly Pose[] = [
  GUARD,
  // Into the strong dip: hips down, the near glove trailing up.
  { ...GUARD, hip: at(-6.6, 36), nearFist: at(8.35, 53.89), farFist: at(10.3, 62.3) },
  { ...GUARD, hip: at(-7.1, 35.5), nearFist: at(7.68, 53.52), farFist: at(10.3, 61.8) },
  { ...GUARD, hip: at(-7.1, 35.5), nearFist: at(7.93, 53.33), farFist: at(9.8, 61.3) },
  // Springing back up, the gloves a beat behind.
  { ...GUARD, hip: at(-6.6, 36), nearFist: at(8.84, 53.5), farFist: at(9.8, 61.3) },
  { ...GUARD, hip: at(-6.6, 36.5), nearFist: at(9, 53.87), farFist: at(10.3, 61.8) },
  // The weak dip.
  { ...GUARD, hip: at(-6.6, 36), nearFist: at(8.52, 53.76), farFist: at(10.3, 62.3) },
  { ...GUARD, hip: at(-6.6, 36), nearFist: at(8.43, 53.83), farFist: at(10.3, 61.8) },
  // The hang: the lead shoulder rolls up on the breath, the near glove riding it.
  {
    ...GUARD,
    hip: at(-6.6, 36.5),
    shrug: 1.68,
    nearFist: at(8.74, 55.03),
    farFist: at(10.3, 61.8),
  },
  {
    ...GUARD,
    hip: at(-6.6, 36.5),
    shrug: 1.68,
    nearFist: at(8.82, 54.97),
    farFist: at(10.3, 62.3),
  },
];
