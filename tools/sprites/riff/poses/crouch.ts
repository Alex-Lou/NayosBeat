import { RIFF_SHEETS } from '../../../../src/art/riff/sheets.ts';
import { GUARD, hold, type Pose } from './common.ts';

/** crouch: not animated yet, her GUARD on each of its 6 frames. */
export const ANIMATED: boolean = false;

export const POSES: readonly Pose[] = hold(GUARD, RIFF_SHEETS.crouch.frames);
