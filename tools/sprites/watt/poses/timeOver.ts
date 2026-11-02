import type { Pose } from './common.ts';
import { TIME_OVER_POSES } from './round.ts';

export const ANIMATED: boolean = true;

/** timeOver: see round.ts. */
export const POSES: readonly Pose[] = TIME_OVER_POSES;
