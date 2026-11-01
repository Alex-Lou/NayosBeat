/**
 * Which of Nayo's strips get in-betweens, and how (tools/sprites/inbetweens.ts): the pilot
 * strips of F2 (docs/art/animation-plan.md §3.3), where the eye spends its time. The flights,
 * falls, getups and knockouts (`ko`, so `koLanding` too), the reactions and the dashes; the
 * heavy punch as a control, its in-betweens hardly visible at full size. Left out on purpose:
 * the hold pairs and the Finisher's clips (UNSMOOTHED_CLIPS), the round poses, the idle.
 */

import type { NayoSheet } from '../../../src/art/nayo/sheets.ts';
import type { Smoothing } from '../inbetweens.ts';

/** A drawing every 1.5 ticks in each hold that may be cut: about 40 a second. */
const PILOT: Smoothing = { every: 1.5 };

export const NAYO_SMOOTHING: Readonly<Partial<Record<NayoSheet, Smoothing>>> = {
  airHit: PILOT,
  knockdown: PILOT,
  getup: PILOT,
  ko: PILOT,
  trip: PILOT,
  hitHigh: PILOT,
  hitMid: PILOT,
  hitLow: PILOT,
  hitCrouch: PILOT,
  dashForward: PILOT,
  dashBack: PILOT,
  standHeavy: PILOT,
};
