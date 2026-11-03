import type { Pose } from './common.ts';
import { GETUP_POSES } from './floor.ts';

export const ANIMATED: boolean = true;

/** getup: see floor.ts. */
export const POSES: readonly Pose[] = GETUP_POSES;
