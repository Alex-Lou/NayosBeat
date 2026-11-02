import { at, behindBack, GUARD, type Pose } from './common.ts';

/**
 * idle: 8 frames, 48 ticks looping, on a slow swing: a long beat (8 ticks), then a short one (4),
 * twice. She settles half a pixel into her rear leg on the short beat and rises on the long one,
 * the hands still at her back, the lead foot tapping the time on its toes (a hair higher on the
 * short beat). Pixel-locked: everything moves by whole sprite pixels (0.5 world px), so the
 * outfit and the mask are the same pixels shifted, nothing boils. Frame 0 is exactly GUARD:
 * every move that ends in the guard flows into it.
 */
const SETTLED = behindBack({ ...GUARD, hip: at(-3, 33.5) });

export const POSES: readonly Pose[] = [
  GUARD,
  SETTLED,
  SETTLED,
  GUARD,
  GUARD,
  SETTLED,
  SETTLED,
  GUARD,
];
