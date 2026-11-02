/**
 * Watt's poses, frame by frame. At porte 2 (docs/art/perso-3.md §5) his guard, its idle and his
 * three signature moves are drawn (the Prise, the Surcharge, the Plafonnier); every other strip
 * holds the guard for each of its frames, a placeholder with the right number of frames, until
 * its own file draws it (porte 3). A strip's placeholder plays to its exact timing in the game:
 * only the drawing waits.
 */

import { WATT_SHEETS, type WattSheet } from '../../../../src/art/watt/sheets.ts';
import { at, GUARD, type Pose } from './common.ts';
import { POSES as grabPoses } from './grab.ts';
import { POSES as idlePoses } from './idle.ts';
import { POSES as specialAntiAirPoses } from './specialAntiAir.ts';
import { POSES as specialForwardPoses } from './specialForward.ts';
import { POSES as walkBackPoses } from './walkBack.ts';
import { POSES as walkForwardPoses } from './walkForward.ts';

/**
 * A special not drawn yet: the guard, with a touch of energy at the lead clamp on its active
 * frame, so its Remix has effects to redraw in platine (generate.ts).
 */
function heldSpecial(frames: number, active: number): readonly Pose[] {
  return Array.from({ length: frames }, (_, frame) =>
    frame === active
      ? { ...GUARD, effects: [{ kind: 'energy', center: at(12, 56), radius: 3 } as const] }
      : GUARD,
  );
}

/** The strips drawn so far, by their own files. */
const DRAWN: Partial<Record<WattSheet, readonly Pose[]>> = {
  idle: idlePoses,
  walkForward: walkForwardPoses,
  walkBack: walkBackPoses,
  grab: grabPoses,
  special: heldSpecial(WATT_SHEETS.special.frames, 4),
  specialForward: specialForwardPoses,
  specialAntiAir: specialAntiAirPoses,
};

export const WATT_POSES = Object.fromEntries(
  (Object.keys(WATT_SHEETS) as WattSheet[]).map((sheet) => [
    sheet,
    DRAWN[sheet] ?? Array.from({ length: WATT_SHEETS[sheet].frames }, () => GUARD),
  ]),
) as Readonly<Record<WattSheet, readonly Pose[]>>;
