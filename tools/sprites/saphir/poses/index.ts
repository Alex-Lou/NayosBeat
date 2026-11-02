/**
 * Saphir's poses, frame by frame, every strip drawn by its own file: her guard, idle and three
 * signature moves at porte 2 (docs/art/perso-3.md §5), then the rest at porte 3, in lots, the
 * most seen first (the walks, the crouch, the block, the hit reactions; L, L, L and her basic
 * combo; the Rubato and the Coda; her other strikes; her jumps, dashes, falls and get-ups; her
 * grab and throws, her entrance, victory and time over). A strip without its poses does not
 * compile.
 */

import type { SaphirSheet } from '../../../../src/art/saphir/sheets.ts';
import type { Pose } from './common.ts';
import { DASH_BACK, DASH_FORWARD, JUMP, JUMP_FORWARD } from './airborne.ts';
import { POSES as backHeavyPoses } from './backHeavy.ts';
import { POSES as blockPoses } from './block.ts';
import { POSES as chainHeavyPoses } from './chainHeavy.ts';
import { POSES as chainLightPoses } from './chainLight.ts';
import { POSES as crouchPoses } from './crouch.ts';
import { POSES as crouchHeavyPoses } from './crouchHeavy.ts';
import { POSES as crouchLightPoses } from './crouchLight.ts';
import { AIR_HIT, GETUP, KNOCKDOWN, KO, TECH, TRIP } from './falls.ts';
import { GRAB, HELD, HOLD, PUMMEL, THROW_BACK, THROW_FORWARD, THROWN_BACK } from './grappling.ts';
import { POSES as forwardHeavyPoses } from './forwardHeavy.ts';
import { POSES as forwardLightPoses } from './forwardLight.ts';
import { HIT_CROUCH, HIT_HIGH, HIT_LOW, HIT_MID } from './hits.ts';
import { POSES as idlePoses } from './idle.ts';
import { JUMP_HEAVY, JUMP_LIGHT } from './jumpAttacks.ts';
import { POSES as lightFinisherPoses } from './lightFinisher.ts';
import { INTRO, TIME_OVER, VICTORY } from './rounds.ts';
import { POSES as specialPoses } from './special.ts';
import { POSES as specialAntiAirPoses } from './specialAntiAir.ts';
import { POSES as specialForwardPoses } from './specialForward.ts';
import { POSES as standHeavyPoses } from './standHeavy.ts';
import { POSES as standLightPoses } from './standLight.ts';
import { POSES as superPoses } from './super.ts';
import { POSES as walkBackPoses } from './walkBack.ts';
import { POSES as walkForwardPoses } from './walkForward.ts';

/** Every strip, by its own file. */
export const SAPHIR_POSES: Readonly<Record<SaphirSheet, readonly Pose[]>> = {
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
  jump: JUMP,
  jumpForward: JUMP_FORWARD,
  dashForward: DASH_FORWARD,
  dashBack: DASH_BACK,
  trip: TRIP,
  airHit: AIR_HIT,
  knockdown: KNOCKDOWN,
  getup: GETUP,
  ko: KO,
  tech: TECH,
  grab: GRAB,
  hold: HOLD,
  held: HELD,
  pummel: PUMMEL,
  throwForward: THROW_FORWARD,
  throwBack: THROW_BACK,
  thrownBack: THROWN_BACK,
  intro: INTRO,
  victory: VICTORY,
  timeOver: TIME_OVER,
  specialAntiAir: specialAntiAirPoses,
};
