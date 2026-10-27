import { RIFF_SHEETS } from '../../../../src/art/riff/sheets.ts';
import { GUARD, hold, type Pose } from './common.ts';

/** specialForward: not animated yet, her GUARD on each of its 9 frames. */
export const ANIMATED: boolean = false;

export const POSES: readonly Pose[] = hold(GUARD, RIFF_SHEETS.specialForward.frames);
