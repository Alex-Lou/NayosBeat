/**
 * Saphir's poses, frame by frame. At porte 2 (docs/art/perso-3.md §5) her guard, its idle and
 * her three signature moves were drawn (the Syncope, the Chassé, the Contre-ut); porte 3 draws
 * the rest in lots, the most seen first (lot 1: the walks, the crouch, the block, the hit
 * reactions; lot 2: L, L, L and the Chassé arrière of her basic combo). Every strip not drawn yet holds the guard for each of its frames, a placeholder
 * with the right number of frames: it plays to its exact timing in the game, only the drawing
 * waits.
 */

import { SAPHIR_SHEETS, type SaphirSheet } from '../../../../src/art/saphir/sheets.ts';
import { at, GUARD, type Pose } from './common.ts';
import { POSES as blockPoses } from './block.ts';
import { POSES as chainHeavyPoses } from './chainHeavy.ts';
import { POSES as chainLightPoses } from './chainLight.ts';
import { POSES as crouchPoses } from './crouch.ts';
import { HIT_CROUCH, HIT_HIGH, HIT_LOW, HIT_MID } from './hits.ts';
import { POSES as idlePoses } from './idle.ts';
import { POSES as lightFinisherPoses } from './lightFinisher.ts';
import { POSES as specialPoses } from './special.ts';
import { POSES as specialAntiAirPoses } from './specialAntiAir.ts';
import { POSES as standHeavyPoses } from './standHeavy.ts';
import { POSES as standLightPoses } from './standLight.ts';
import { POSES as walkBackPoses } from './walkBack.ts';
import { POSES as walkForwardPoses } from './walkForward.ts';

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
  walkForward: walkForwardPoses,
  walkBack: walkBackPoses,
  crouch: crouchPoses,
  block: blockPoses,
  hitHigh: HIT_HIGH,
  hitMid: HIT_MID,
  hitLow: HIT_LOW,
  hitCrouch: HIT_CROUCH,
  standLight: standLightPoses,
  chainLight: chainLightPoses,
  lightFinisher: lightFinisherPoses,
  chainHeavy: chainHeavyPoses,
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
