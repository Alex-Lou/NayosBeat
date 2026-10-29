/** Nayo for the shared sprite pipeline (see ../fighter.ts). */

import { NAYO_CLIPS } from '../../../src/art/nayo/clips.ts';
import { NAYO_SHEETS } from '../../../src/art/nayo/sheets.ts';
import { timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import { BODY, type Pose } from '../skeleton.ts';
import { drawNayo } from './look.ts';
import { EFFECTS, paletteOf } from './palette.ts';
import { NAYO_PENDING } from './pending-timing.ts';
import { NAYO_POSES, NAYO_PROJECTILE } from './poses/index.ts';

const SHEETS: Readonly<Record<string, { frames: number }>> = NAYO_SHEETS;

export const NAYO: Fighter = {
  name: 'nayo',
  sheets: NAYO_SHEETS,
  body: BODY,
  poses: (sheet) => (NAYO_POSES as Readonly<Record<string, readonly Pose[]>>)[sheet],
  effectsOnly: (sheet) => (sheet === 'projectile' ? NAYO_PROJECTILE : undefined),
  // Ticks per frame, from the clips that play each strip (the pending ones for a strip drawn
  // ahead of its gameplay).
  timing: (sheet) => timingOf(NAYO_CLIPS, sheet, SHEETS[sheet]?.frames ?? 0, NAYO_PENDING),
  draw: drawNayo,
  fx: EFFECTS,
  paletteOf,
};
