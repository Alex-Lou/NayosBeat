/**
 * Saphir's poses, frame by frame. At porte 2 (docs/art/perso-3.md §5) her guard, its idle and
 * her three signature moves were drawn (the Syncope, the Chassé, the Contre-ut); porte 3 draws
 * the rest in lots, the most seen first (lot 1: the walks, the crouch, the block, the hit
 * reactions; lot 2: L, L, L and the Chassé arrière of her basic combo; lot 3: the Rubato and the
 * Coda; lot 4a: the rest of her strikes). Every strip not drawn yet holds the guard for each of its frames, a placeholder
 * with the right number of frames: it plays to its exact timing in the game, only the drawing
 * waits.
 */

import { SAPHIR_SHEETS, type SaphirSheet } from '../../../../src/art/saphir/sheets.ts';
import { GUARD, type Pose } from './common.ts';
import { POSES as backHeavyPoses } from './backHeavy.ts';
import { POSES as blockPoses } from './block.ts';
import { POSES as chainHeavyPoses } from './chainHeavy.ts';
import { POSES as chainLightPoses } from './chainLight.ts';
import { POSES as crouchPoses } from './crouch.ts';
import { POSES as crouchHeavyPoses } from './crouchHeavy.ts';
import { POSES as crouchLightPoses } from './crouchLight.ts';
import { POSES as forwardHeavyPoses } from './forwardHeavy.ts';
import { POSES as forwardLightPoses } from './forwardLight.ts';
import { HIT_CROUCH, HIT_HIGH, HIT_LOW, HIT_MID } from './hits.ts';
import { POSES as idlePoses } from './idle.ts';
import { JUMP_HEAVY, JUMP_LIGHT } from './jumpAttacks.ts';
import { POSES as lightFinisherPoses } from './lightFinisher.ts';
import { POSES as specialPoses } from './special.ts';
import { POSES as specialAntiAirPoses } from './specialAntiAir.ts';
import { POSES as specialForwardPoses } from './specialForward.ts';
import { POSES as standHeavyPoses } from './standHeavy.ts';
import { POSES as standLightPoses } from './standLight.ts';
import { POSES as superPoses } from './super.ts';
import { POSES as walkBackPoses } from './walkBack.ts';
import { POSES as walkForwardPoses } from './walkForward.ts';

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
  specialForward: specialForwardPoses,
  super: superPoses,
  forwardLight: forwardLightPoses,
  forwardHeavy: forwardHeavyPoses,
  backHeavy: backHeavyPoses,
  chainLaunch: backHeavyPoses,
  crouchLight: crouchLightPoses,
  crouchHeavy: crouchHeavyPoses,
  jumpLight: JUMP_LIGHT,
  jumpHeavy: JUMP_HEAVY,
  specialAntiAir: specialAntiAirPoses,
};

export const SAPHIR_POSES = Object.fromEntries(
  (Object.keys(SAPHIR_SHEETS) as SaphirSheet[]).map((sheet) => [
    sheet,
    DRAWN[sheet] ?? Array.from({ length: SAPHIR_SHEETS[sheet].frames }, () => GUARD),
  ]),
) as Readonly<Record<SaphirSheet, readonly Pose[]>>;
