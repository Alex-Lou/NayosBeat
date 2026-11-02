/**
 * Watt's poses, frame by frame. At porte 2 (docs/art/perso-3.md §5) his guard, its idle and his
 * three signature moves are drawn (the Prise, the Surcharge, the Plafonnier); every other strip
 * holds the guard for each of its frames, a placeholder with the right number of frames, until
 * its own file draws it (porte 3). A strip's placeholder plays to its exact timing in the game:
 * only the drawing waits.
 */

import { WATT_SHEETS, type WattSheet } from '../../../../src/art/watt/sheets.ts';
import { GUARD, type Pose } from './common.ts';
import { POSES as blockPoses } from './block.ts';
import { POSES as crouchPoses } from './crouch.ts';
import { POSES as dashBackPoses } from './dashBack.ts';
import { POSES as dashForwardPoses } from './dashForward.ts';
import { POSES as grabPoses } from './grab.ts';
import { POSES as idlePoses } from './idle.ts';
import { POSES as holdPoses } from './hold.ts';
import { POSES as heldPoses } from './held.ts';
import { POSES as pummelPoses } from './pummel.ts';
import { POSES as throwForwardPoses } from './throwForward.ts';
import { POSES as throwBackPoses } from './throwBack.ts';
import { POSES as thrownBackPoses } from './thrownBack.ts';
import { POSES as introPoses } from './intro.ts';
import { POSES as victoryPoses } from './victory.ts';
import { POSES as timeOverPoses } from './timeOver.ts';
import { POSES as hitHighPoses } from './hitHigh.ts';
import { POSES as hitMidPoses } from './hitMid.ts';
import { POSES as hitLowPoses } from './hitLow.ts';
import { POSES as hitCrouchPoses } from './hitCrouch.ts';
import { POSES as airHitPoses } from './airHit.ts';
import { POSES as tripPoses } from './trip.ts';
import { POSES as knockdownPoses } from './knockdown.ts';
import { POSES as getupPoses } from './getup.ts';
import { POSES as koPoses } from './ko.ts';
import { POSES as techPoses } from './tech.ts';
import { POSES as jumpPoses } from './jump.ts';
import { POSES as jumpForwardPoses } from './jumpForward.ts';
import { POSES as specialPoses } from './special.ts';
import { POSES as specialAntiAirPoses } from './specialAntiAir.ts';
import { POSES as specialForwardPoses } from './specialForward.ts';
import { POSES as standLightPoses } from './standLight.ts';
import { POSES as superPoses } from './super.ts';
import { POSES as chainLightPoses } from './chainLight.ts';
import { POSES as lightFinisherPoses } from './lightFinisher.ts';
import { POSES as forwardLightPoses } from './forwardLight.ts';
import { POSES as standHeavyPoses } from './standHeavy.ts';
import { POSES as chainHeavyPoses } from './chainHeavy.ts';
import { POSES as forwardHeavyPoses } from './forwardHeavy.ts';
import { POSES as backHeavyPoses } from './backHeavy.ts';
import { POSES as chainLaunchPoses } from './chainLaunch.ts';
import { POSES as crouchLightPoses } from './crouchLight.ts';
import { POSES as crouchHeavyPoses } from './crouchHeavy.ts';
import { POSES as jumpLightPoses } from './jumpLight.ts';
import { POSES as jumpHeavyPoses } from './jumpHeavy.ts';
import { POSES as walkBackPoses } from './walkBack.ts';
import { POSES as walkForwardPoses } from './walkForward.ts';

/** The strips drawn so far, by their own files. */
const DRAWN: Partial<Record<WattSheet, readonly Pose[]>> = {
  idle: idlePoses,
  walkForward: walkForwardPoses,
  walkBack: walkBackPoses,
  crouch: crouchPoses,
  block: blockPoses,
  jump: jumpPoses,
  jumpForward: jumpForwardPoses,
  dashForward: dashForwardPoses,
  dashBack: dashBackPoses,
  grab: grabPoses,
  standLight: standLightPoses,
  chainLight: chainLightPoses,
  lightFinisher: lightFinisherPoses,
  forwardLight: forwardLightPoses,
  standHeavy: standHeavyPoses,
  chainHeavy: chainHeavyPoses,
  forwardHeavy: forwardHeavyPoses,
  backHeavy: backHeavyPoses,
  chainLaunch: chainLaunchPoses,
  crouchLight: crouchLightPoses,
  crouchHeavy: crouchHeavyPoses,
  jumpLight: jumpLightPoses,
  jumpHeavy: jumpHeavyPoses,
  hitHigh: hitHighPoses,
  hitMid: hitMidPoses,
  hitLow: hitLowPoses,
  hitCrouch: hitCrouchPoses,
  airHit: airHitPoses,
  trip: tripPoses,
  knockdown: knockdownPoses,
  getup: getupPoses,
  ko: koPoses,
  tech: techPoses,
  special: specialPoses,
  super: superPoses,
  hold: holdPoses,
  held: heldPoses,
  pummel: pummelPoses,
  throwForward: throwForwardPoses,
  throwBack: throwBackPoses,
  thrownBack: thrownBackPoses,
  intro: introPoses,
  victory: victoryPoses,
  timeOver: timeOverPoses,
  specialForward: specialForwardPoses,
  specialAntiAir: specialAntiAirPoses,
};

export const WATT_POSES = Object.fromEntries(
  (Object.keys(WATT_SHEETS) as WattSheet[]).map((sheet) => [
    sheet,
    DRAWN[sheet] ?? Array.from({ length: WATT_SHEETS[sheet].frames }, () => GUARD),
  ]),
) as Readonly<Record<WattSheet, readonly Pose[]>>;
