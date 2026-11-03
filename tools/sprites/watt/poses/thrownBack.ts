import type { Pose } from './common.ts';
import { THROWN_BACK_POSES } from './holds.ts';

export const ANIMATED: boolean = true;

/** thrownBack: see holds.ts. */
export const POSES: readonly Pose[] = THROWN_BACK_POSES;
