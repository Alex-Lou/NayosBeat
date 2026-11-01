/** Riff for the shared sprite pipeline (see ../fighter.ts). */

import { RIFF_CLIPS } from '../../../src/art/riff/clips.ts';
import { RIFF_SHEETS, type RiffSheet } from '../../../src/art/riff/sheets.ts';
import { RIFF as RIFF_TEMPLATE } from '../../../src/data/fighters/riff.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import { smoothFighter } from '../inbetweens.ts';
import type { Pose } from '../skeleton.ts';
import { RIFF_BODY } from './body.ts';
import { drawRiff } from './look.ts';
import { EFFECTS, paletteOf } from './palette.ts';
import { RIFF_POSES } from './poses/index.ts';
import { RIFF_SMOOTHING } from './smoothing.ts';

const isSheet = (sheet: string): sheet is RiffSheet => sheet in RIFF_SHEETS;
const keys = (sheet: string): readonly Pose[] | undefined =>
  isSheet(sheet) ? RIFF_POSES[sheet] : undefined;

/** Her strips planned once: the keys, then the in-betweens of the strips her table smooths. */
const SMOOTHED = smoothFighter({
  name: 'riff',
  sheets: RIFF_SHEETS,
  keys,
  body: RIFF_BODY,
  clips: RIFF_CLIPS,
  template: RIFF_TEMPLATE,
  table: RIFF_SMOOTHING,
});

export const RIFF: Fighter = {
  name: 'riff',
  sheets: SMOOTHED.sheets,
  body: RIFF_BODY,
  keys,
  poses: (sheet) => {
    const poses = keys(sheet);
    const plan = SMOOTHED.plans.get(sheet);
    return poses && plan ? [...poses, ...plan.inbetweens.map(({ pose }) => pose)] : poses;
  },
  inbetweens: (sheet) => SMOOTHED.plans.get(sheet)?.inbetweens ?? [],
  played: SMOOTHED.played,
  // Ticks per key, from the clips that play each strip: the game's timing.
  timing: (sheet) =>
    isSheet(sheet)
      ? timingOf(RIFF_CLIPS, sheet, RIFF_SHEETS[sheet].frames)
      : { ticks: [], loops: false },
  // Her hanging parts (look.ts): the magenta fringe rides the first, soft, so its tips trail the
  // neck by about a frame; the belt's chain rides the second, softer still, a frame behind.
  springs: [
    { stiffness: 0.02, damping: 0.12 },
    { stiffness: 0.014, damping: 0.12 },
  ],
  draw: drawRiff,
  fx: EFFECTS,
  platine: namedEffects(RIFF_CLIPS),
  paletteOf,
};
