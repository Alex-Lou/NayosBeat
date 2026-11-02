import type { Pose } from './common.ts';
import { KNOCKDOWN_POSES } from './floor.ts';

export const ANIMATED: boolean = true;

/** knockdown: see floor.ts. */
export const POSES: readonly Pose[] = KNOCKDOWN_POSES;
