/** Riff for the shared sprite pipeline (see ../fighter.ts). */

import { RIFF_SHEETS, type RiffSheet } from '../../../src/art/riff/sheets.ts';
import type { Fighter } from '../fighter.ts';
import { RIFF_BODY } from './body.ts';
import { drawRiff } from './look.ts';
import { EFFECTS, paletteOf } from './palette.ts';
import { RIFF_POSES } from './poses/index.ts';
import { RIFF_TIMING } from './strips.ts';

const isSheet = (sheet: string): sheet is RiffSheet => sheet in RIFF_SHEETS;

export const RIFF: Fighter = {
  name: 'riff',
  sheets: RIFF_SHEETS,
  body: RIFF_BODY,
  poses: (sheet) => (isSheet(sheet) ? RIFF_POSES[sheet] : undefined),
  timing: (sheet) => (isSheet(sheet) ? RIFF_TIMING[sheet] : { ticks: [], loops: false }),
  // Her braids: soft, so their tips trail the head by about a frame; the far one softer still,
  // a frame behind the near one (look.ts amplifies the swing, see BRAID_GAIN).
  springs: [
    { stiffness: 0.02, damping: 0.12 },
    { stiffness: 0.014, damping: 0.12 },
  ],
  draw: drawRiff,
  fx: EFFECTS,
  paletteOf,
};
