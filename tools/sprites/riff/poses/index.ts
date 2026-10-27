/**
 * Riff's poses, frame by frame, one file per strip (each strip's file is its own animation).
 * Attack poses are placed against her v2 hitboxes (../strips.ts): on the active frames the
 * striking limb reaches the far edge of the hitbox, so what you see is what hits.
 * tests/tools/riff-sprites.test.ts checks it for every animated strike.
 *
 * A strip not animated yet holds her GUARD on each of its frames, so the whole pipeline runs
 * end to end. Each file says whether it is animated (`ANIMATED`): animators work on their own
 * files only, never on this registry.
 */

import type { RiffSheet } from '../../../../src/art/riff/sheets.ts';
import type { Pose } from './common.ts';
import * as idle from './idle.ts';
import * as walkForward from './walkForward.ts';
import * as walkBack from './walkBack.ts';
import * as crouch from './crouch.ts';
import * as jump from './jump.ts';
import * as jumpForward from './jumpForward.ts';
import * as dashForward from './dashForward.ts';
import * as dashBack from './dashBack.ts';
import * as block from './block.ts';
import * as hitHigh from './hitHigh.ts';
import * as hitMid from './hitMid.ts';
import * as hitLow from './hitLow.ts';
import * as hitCrouch from './hitCrouch.ts';
import * as trip from './trip.ts';
import * as airHit from './airHit.ts';
import * as knockdown from './knockdown.ts';
import * as getup from './getup.ts';
import * as ko from './ko.ts';
import * as held from './held.ts';
import * as thrownBack from './thrownBack.ts';
import * as tech from './tech.ts';
import * as standLight from './standLight.ts';
import * as chainLight from './chainLight.ts';
import * as lightFinisher from './lightFinisher.ts';
import * as forwardLight from './forwardLight.ts';
import * as standHeavy from './standHeavy.ts';
import * as forwardHeavy from './forwardHeavy.ts';
import * as backHeavy from './backHeavy.ts';
import * as crouchLight from './crouchLight.ts';
import * as crouchHeavy from './crouchHeavy.ts';
import * as jumpLight from './jumpLight.ts';
import * as jumpHeavy from './jumpHeavy.ts';
import * as special from './special.ts';
import * as specialForward from './specialForward.ts';
import * as specialAntiAir from './specialAntiAir.ts';
import * as grab from './grab.ts';
import * as hold from './hold.ts';
import * as pummel from './pummel.ts';
import * as throwForward from './throwForward.ts';
import * as throwBack from './throwBack.ts';
import * as intro from './intro.ts';
import * as victory from './victory.ts';
import * as timeOver from './timeOver.ts';

interface Strip {
  readonly POSES: readonly Pose[];
  readonly ANIMATED: boolean;
}

const STRIPS: Readonly<Record<RiffSheet, Strip>> = {
  idle,
  walkForward,
  walkBack,
  crouch,
  jump,
  jumpForward,
  dashForward,
  dashBack,
  block,
  hitHigh,
  hitMid,
  hitLow,
  hitCrouch,
  trip,
  airHit,
  knockdown,
  getup,
  ko,
  held,
  thrownBack,
  tech,
  standLight,
  chainLight,
  lightFinisher,
  forwardLight,
  standHeavy,
  forwardHeavy,
  backHeavy,
  crouchLight,
  crouchHeavy,
  jumpLight,
  jumpHeavy,
  special,
  specialForward,
  specialAntiAir,
  grab,
  hold,
  pummel,
  throwForward,
  throwBack,
  intro,
  victory,
  timeOver,
};

/** Poses of every strip; each list has exactly the strip's number of frames. */
export const RIFF_POSES = Object.fromEntries(
  (Object.keys(STRIPS) as RiffSheet[]).map((sheet) => [sheet, STRIPS[sheet].POSES]),
) as Readonly<Record<RiffSheet, readonly Pose[]>>;

/** Whether a strip is drawn from its own poses, not the GUARD placeholder. */
export function isAnimated(sheet: RiffSheet): boolean {
  return STRIPS[sheet].ANIMATED;
}
