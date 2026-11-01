/**
 * Which of Riff's strips get in-betweens, and how (tools/sprites/inbetweens.ts): the pilot
 * strips of F2 (docs/art/animation-plan.md §3.3), where the eye spends its time. The flights,
 * falls, getups and knockouts (`ko`, so `koLanding` too), the reactions and the dashes; the
 * heavy punch as a control, its in-betweens hardly visible at full size. Left out on purpose:
 * the hold pairs and the Finisher's clips (UNSMOOTHED_CLIPS), the round poses, the idle.
 */

import type { RiffSheet } from '../../../src/art/riff/sheets.ts';
import type { Smoothing } from '../inbetweens.ts';

/** A drawing every 1.5 ticks in each hold that may be cut: about 40 a second. */
const PILOT: Smoothing = { every: 1.5 };

export const RIFF_SMOOTHING: Readonly<Partial<Record<RiffSheet, Smoothing>>> = {
  airHit: PILOT,
  // Her backward roll up from the floor (4 to 5): the tween flips the body through the air
  // instead of rolling it over a shoulder. A clean cut until a passing key is drawn (§11, 2).
  knockdown: { ...PILOT, counts: { '4>5': 0 } },
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
