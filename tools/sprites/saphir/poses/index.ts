/**
 * Saphir's poses, frame by frame. At porte 2 (docs/art/perso-3.md §5) her guard, its idle and
 * her three signature moves are drawn (the Syncope, the Chassé, the Contre-ut); every other strip
 * holds the guard for each of its frames, a placeholder with the right number of frames, until
 * its own file draws it (porte 3). A strip's placeholder plays to its exact timing in the game:
 * only the drawing waits.
 */

import { SAPHIR_SHEETS, type SaphirSheet } from '../../../../src/art/saphir/sheets.ts';
import { at, GUARD, type Pose } from './common.ts';
import { POSES as idlePoses } from './idle.ts';
import { POSES as specialPoses } from './special.ts';
import { POSES as specialAntiAirPoses } from './specialAntiAir.ts';
import { POSES as standHeavyPoses } from './standHeavy.ts';

/**
 * A special not drawn yet: the guard, with a touch of energy at the lead fist on its active frame,
 * so its Remix has effects to redraw in platine (generate.ts).
 */
function heldSpecial(frames: number, active: number): readonly Pose[] {
  return Array.from({ length: frames }, (_, frame) =>
    frame === active
      ? { ...GUARD, effects: [{ kind: 'energy', center: at(12, 56), radius: 3 } as const] }
      : GUARD,
  );
}

/** The strips drawn so far, by their own files. */
const DRAWN: Partial<Record<SaphirSheet, readonly Pose[]>> = {
  idle: idlePoses,
  standHeavy: standHeavyPoses,
  special: specialPoses,
  specialForward: heldSpecial(SAPHIR_SHEETS.specialForward.frames, 4),
  specialAntiAir: specialAntiAirPoses,
};

export const SAPHIR_POSES = Object.fromEntries(
  (Object.keys(SAPHIR_SHEETS) as SaphirSheet[]).map((sheet) => [
    sheet,
    DRAWN[sheet] ?? Array.from({ length: SAPHIR_SHEETS[sheet].frames }, () => GUARD),
  ]),
) as Readonly<Record<SaphirSheet, readonly Pose[]>>;
