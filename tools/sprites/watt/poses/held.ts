import type { Pose } from './common.ts';
import { HELD_POSES } from './holds.ts';

export const ANIMATED: boolean = true;

/** held: see holds.ts. */
export const POSES: readonly Pose[] = HELD_POSES;
