import type { Pose } from './common.ts';
import { AIR_HIT_POSES } from './floor.ts';

export const ANIMATED: boolean = true;

/** airHit: see floor.ts. */
export const POSES: readonly Pose[] = AIR_HIT_POSES;
