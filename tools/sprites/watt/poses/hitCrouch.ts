import type { Pose } from './common.ts';
import { HIT_CROUCH } from './hits.ts';

export const ANIMATED: boolean = true;

/** hitCrouch: see hits.ts. */
export const POSES: readonly Pose[] = HIT_CROUCH;
