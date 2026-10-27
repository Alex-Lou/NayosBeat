/**
 * Nayo's poses, frame by frame, one file per strip (each strip's file is its own animation).
 * Attack poses are placed against Nayo's hitboxes (src/data/fighters/nayo.ts): on the active
 * frames the striking fist or foot reaches the far edge of the hitbox, so what you see is what
 * hits. tests/tools/sprites.test.ts checks it for every move; the combat v2 strips, drawn to the
 * animation brief's stricter rules, are checked by tests/tools/nayo-v2-sprites.test.ts.
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
import { POSES as hitCrouchPoses } from './hitCrouch.ts';
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
import { POSES as introPoses } from './intro.ts';
import { POSES as victoryPoses } from './victory.ts';
import { POSES as timeOverPoses } from './timeOver.ts';
// Combat v2 (docs/combat-v2.md §11.1, §11.2).
import { POSES as dashForwardPoses } from './dashForward.ts';
import { POSES as dashBackPoses } from './dashBack.ts';
import { POSES as chainLightPoses } from './chainLight.ts';
import { POSES as lightFinisherPoses } from './lightFinisher.ts';
import { POSES as forwardLightPoses } from './forwardLight.ts';
import { POSES as forwardHeavyPoses } from './forwardHeavy.ts';
import { POSES as backHeavyPoses } from './backHeavy.ts';
import { POSES as grabPoses } from './grab.ts';
import { POSES as holdPoses } from './hold.ts';
import { POSES as pummelPoses } from './pummel.ts';
import { POSES as throwForwardPoses } from './throwForward.ts';
import { POSES as throwBackPoses } from './throwBack.ts';
import { POSES as heldPoses } from './held.ts';
import { POSES as thrownBackPoses } from './thrownBack.ts';
import { POSES as techPoses } from './tech.ts';
import { POSES as hitHighPoses } from './hitHigh.ts';
import { POSES as hitMidPoses } from './hitMid.ts';
import { POSES as hitLowPoses } from './hitLow.ts';
import { POSES as tripPoses } from './trip.ts';
import { POSES as getupPoses } from './getup.ts';

export { PROJECTILE as NAYO_PROJECTILE } from './projectile.ts';

/** Strips of Nayo himself: all but the projectile. */
export type PosedSheet = Exclude<NayoSheet, 'projectile'>;

/** The combat v2 strips (docs/combat-v2.md §11.1, §11.2): the animation brief's rules apply. */
export const V2_SHEETS = [
  'dashForward',
  'dashBack',
  'chainLight',
  'lightFinisher',
  'forwardLight',
  'forwardHeavy',
  'backHeavy',
  'grab',
  'hold',
  'pummel',
  'throwForward',
  'throwBack',
  'held',
  'thrownBack',
  'tech',
  'hitHigh',
  'hitMid',
  'hitLow',
  'trip',
  'getup',
] as const satisfies readonly PosedSheet[];

export type V2Sheet = (typeof V2_SHEETS)[number];

export function isV2Sheet(sheet: string): sheet is V2Sheet {
  return (V2_SHEETS as readonly string[]).includes(sheet);
}

/** Poses of every strip; each list has exactly the strip's number of frames. */
export const NAYO_POSES: Readonly<Record<PosedSheet, readonly Pose[]>> = {
  idle: idlePoses,
  walkForward: walkForwardPoses,
  walkBack: walkBackPoses,
  crouch: crouchPoses,
  jump: jumpPoses,
  jumpForward: jumpForwardPoses,
  block: blockPoses,
  hitCrouch: hitCrouchPoses,
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
  intro: introPoses,
  victory: victoryPoses,
  timeOver: timeOverPoses,
  dashForward: dashForwardPoses,
  dashBack: dashBackPoses,
  chainLight: chainLightPoses,
  lightFinisher: lightFinisherPoses,
  forwardLight: forwardLightPoses,
  forwardHeavy: forwardHeavyPoses,
  backHeavy: backHeavyPoses,
  grab: grabPoses,
  hold: holdPoses,
  pummel: pummelPoses,
  throwForward: throwForwardPoses,
  throwBack: throwBackPoses,
  held: heldPoses,
  thrownBack: thrownBackPoses,
  tech: techPoses,
  hitHigh: hitHighPoses,
  hitMid: hitMidPoses,
  hitLow: hitLowPoses,
  trip: tripPoses,
  getup: getupPoses,
};
