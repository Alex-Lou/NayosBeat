/**
 * Nayo's poses, frame by frame, one file per strip (each strip's file is its own animation).
 * Attack poses are placed against Nayo's hitboxes (src/data/fighters/nayo.ts): on the active
 * frames the striking fist or foot reaches the far edge of the hitbox, so what you see is what
 * hits. tests/tools/sprites.test.ts checks it for every move.
 */

import type { NayoSheet } from '../../../../src/art/nayo/sheets.ts';
import type { Pose } from '../../skeleton.ts';
import { POSES as idlePoses } from './idle.ts';
import { POSES as walkForwardPoses } from './walkForward.ts';
import { POSES as walkBackPoses } from './walkBack.ts';
import { POSES as crouchPoses } from './crouch.ts';
import { POSES as jumpPoses } from './jump.ts';
import { POSES as jumpForwardPoses } from './jumpForward.ts';
import { POSES as blockPoses } from './block.ts';
import { POSES as hitPoses } from './hit.ts';
import { POSES as airHitPoses } from './airHit.ts';
import { POSES as knockdownPoses } from './knockdown.ts';
import { POSES as koPoses } from './ko.ts';
import { POSES as standLightPoses } from './standLight.ts';
import { POSES as standHeavyPoses } from './standHeavy.ts';
import { POSES as crouchLightPoses } from './crouchLight.ts';
import { POSES as crouchHeavyPoses } from './crouchHeavy.ts';
import { POSES as jumpLightPoses } from './jumpLight.ts';
import { POSES as jumpHeavyPoses } from './jumpHeavy.ts';
import { POSES as specialPoses } from './special.ts';
import { POSES as specialForwardPoses } from './specialForward.ts';
import { POSES as specialAntiAirPoses } from './specialAntiAir.ts';
import { POSES as throwPoses } from './throw.ts';
import { POSES as introPoses } from './intro.ts';
import { POSES as victoryPoses } from './victory.ts';
import { POSES as timeOverPoses } from './timeOver.ts';

export { PROJECTILE as NAYO_PROJECTILE } from './projectile.ts';

/** Strips of Nayo himself: all but the projectile. */
export type PosedSheet = Exclude<NayoSheet, 'projectile'>;

/** Poses of every strip; each list has exactly the strip's number of frames. */
export const NAYO_POSES: Readonly<Record<PosedSheet, readonly Pose[]>> = {
  idle: idlePoses,
  walkForward: walkForwardPoses,
  walkBack: walkBackPoses,
  crouch: crouchPoses,
  jump: jumpPoses,
  jumpForward: jumpForwardPoses,
  block: blockPoses,
  hit: hitPoses,
  airHit: airHitPoses,
  knockdown: knockdownPoses,
  ko: koPoses,
  standLight: standLightPoses,
  standHeavy: standHeavyPoses,
  crouchLight: crouchLightPoses,
  crouchHeavy: crouchHeavyPoses,
  jumpLight: jumpLightPoses,
  jumpHeavy: jumpHeavyPoses,
  special: specialPoses,
  specialForward: specialForwardPoses,
  specialAntiAir: specialAntiAirPoses,
  throw: throwPoses,
  intro: introPoses,
  victory: victoryPoses,
  timeOver: timeOverPoses,
};
