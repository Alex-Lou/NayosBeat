import { RIFF_SHEETS } from '../../../../src/art/riff/sheets.ts';
import { GUARD, hold, type Pose } from './common.ts';

/** jumpLight: not animated yet, her GUARD on each of its 5 frames. */
export const ANIMATED: boolean = false;

export const POSES: readonly Pose[] = hold(GUARD, RIFF_SHEETS.jumpLight.frames);
