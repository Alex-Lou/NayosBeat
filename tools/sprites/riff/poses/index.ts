/**
 * Riff's poses, frame by frame, one file per strip (each strip's file is its own animation).
 * Attack poses are placed against her v2 hitboxes (../strips.ts): on the active frames the
 * striking limb reaches the far edge of the hitbox, so what you see is what hits.
 * tests/tools/riff-sprites.test.ts checks it for every animated strike.
 *
 * A strip not animated yet holds her GUARD for each of its frames, so the whole pipeline runs
 * end to end; animating one is writing its file and listing it in ANIMATED.
 */

import { RIFF_SHEETS, type RiffSheet } from '../../../../src/art/riff/sheets.ts';
import { GUARD, hold, type Pose } from './common.ts';
import { POSES as idlePoses } from './idle.ts';

/** Strips drawn from their own poses (the others are placeholders). */
const ANIMATED: Readonly<Partial<Record<RiffSheet, readonly Pose[]>>> = {
  idle: idlePoses,
};

/** Poses of every strip; each list has exactly the strip's number of frames. */
export const RIFF_POSES = Object.fromEntries(
  (Object.keys(RIFF_SHEETS) as RiffSheet[]).map((sheet) => [
    sheet,
    ANIMATED[sheet] ?? hold(GUARD, RIFF_SHEETS[sheet].frames),
  ]),
) as Readonly<Record<RiffSheet, readonly Pose[]>>;

/** Whether a strip is drawn from its own poses, not the GUARD placeholder. */
export function isAnimated(sheet: RiffSheet): boolean {
  return ANIMATED[sheet] !== undefined;
}
