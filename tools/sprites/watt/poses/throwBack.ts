import type { Pose } from './common.ts';
import { THROW_BACK_POSES } from './holds.ts';

export const ANIMATED: boolean = true;

/** throwBack: see holds.ts. */
export const POSES: readonly Pose[] = THROW_BACK_POSES;
