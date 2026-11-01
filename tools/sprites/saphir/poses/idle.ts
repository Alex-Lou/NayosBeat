import { at, GUARD, type Pose } from './common.ts';

/**
 * idle: 8 frames, 48 ticks looping, on a slow swing: a long beat (8 ticks), then a short one (4),
 * twice. She settles half a pixel into her rear leg on the short beat and rises on the long
 * one, the fists riding the breath a frame late. Pixel-locked: everything moves by whole sprite
 * pixels (0.5 world px), so the outfit and the mask are the same pixels shifted, nothing boils.
 * Frame 0 is exactly GUARD: every move that ends in the guard flows into it.
 */
export const POSES: readonly Pose[] = [
  GUARD,
  { ...GUARD, hip: at(-3, 35), nearFist: at(12, 54), farFist: at(7, 56.5) },
  { ...GUARD, hip: at(-3, 35), nearFist: at(12, 53.5), farFist: at(7, 56) },
  { ...GUARD, hip: at(-3, 35.5), nearFist: at(12, 53.5), farFist: at(7, 56) },
  GUARD,
  { ...GUARD, hip: at(-3, 35), nearFist: at(12, 54), farFist: at(7, 56.5) },
  { ...GUARD, hip: at(-3, 35), nearFist: at(12, 53.5), farFist: at(7, 56) },
  { ...GUARD, hip: at(-3, 35.5), nearFist: at(12, 53.5), farFist: at(7, 56) },
];
