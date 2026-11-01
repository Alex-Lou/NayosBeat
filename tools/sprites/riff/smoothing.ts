/**
 * Which of Riff's strips get in-betweens, and how (tools/sprites/inbetweens.ts): the pilot
 * strips of F2 (docs/art/animation-plan.md §3.3), where the eye spends its time. The flights,
 * falls, getups and knockouts (`ko`, so `koLanding` too), the reactions and the dashes; the
 * heavy punch as a control, its in-betweens hardly visible at full size. Left out on purpose:
 * the hold pairs and the Finisher's clips (UNSMOOTHED_CLIPS), the round poses, the idle.
 */

import type { RiffSheet } from '../../../src/art/riff/sheets.ts';
import type { Smoothing } from '../inbetweens.ts';

export const RIFF_SMOOTHING: Readonly<Partial<Record<RiffSheet, Smoothing>>> = {};
