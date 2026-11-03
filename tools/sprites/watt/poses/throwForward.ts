import type { Pose } from './common.ts';
import { THROW_FORWARD_POSES } from './holds.ts';

export const ANIMATED: boolean = true;

/** throwForward: see holds.ts. */
export const POSES: readonly Pose[] = THROW_FORWARD_POSES;
