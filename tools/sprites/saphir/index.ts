/** Saphir for the shared sprite pipeline (see ../fighter.ts). */

import { SAPHIR_CLIPS } from '../../../src/art/saphir/clips.ts';
import { SAPHIR_SHEETS, type SaphirSheet } from '../../../src/art/saphir/sheets.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import { SAPHIR_BODY } from './body.ts';
import { drawSaphir } from './look.ts';
import { EFFECTS, paletteOf } from './palette.ts';
import { SAPHIR_POSES } from './poses/index.ts';

const isSheet = (sheet: string): sheet is SaphirSheet => sheet in SAPHIR_SHEETS;

export const SAPHIR: Fighter = {
  name: 'saphir',
  sheets: SAPHIR_SHEETS,
  body: SAPHIR_BODY,
  poses: (sheet) => (isSheet(sheet) ? SAPHIR_POSES[sheet] : undefined),
  // Ticks per frame, from the clips that play each strip: the game's timing.
  timing: (sheet) =>
    isSheet(sheet)
      ? timingOf(SAPHIR_CLIPS, sheet, SAPHIR_SHEETS[sheet].frames)
      : { ticks: [], loops: false },
  draw: drawSaphir,
  fx: EFFECTS,
  platine: namedEffects(SAPHIR_CLIPS),
  paletteOf,
};
