/** Nayo for the shared sprite pipeline (see ../fighter.ts). */

import { NAYO_CLIPS } from '../../../src/art/nayo/clips.ts';
import { NAYO_SHEETS } from '../../../src/art/nayo/sheets.ts';
import type { Fighter } from '../fighter.ts';
import { BODY, type Pose } from '../skeleton.ts';
import { drawNayo } from './look.ts';
import { EFFECTS, paletteOf } from './palette.ts';
import { NAYO_POSES, NAYO_PROJECTILE } from './poses/index.ts';

/** Ticks per frame of a strip, from the clips that play it (3 for a frame no clip plays). */
function timing(sheet: string): { ticks: number[]; loops: boolean } {
  const frames = (NAYO_SHEETS as Readonly<Record<string, { frames: number }>>)[sheet]?.frames ?? 0;
  const ticks = Array.from({ length: frames }, () => 3);
  let loops = false;
  for (const clip of Object.values(NAYO_CLIPS)) {
    if (clip.sheet !== sheet) continue;
    clip.frames.forEach((frame, index) => {
      ticks[frame] = clip.ticks[index] ?? 3;
    });
    if (clip.loopFrom !== undefined) loops = true;
  }
  return { ticks, loops };
}

export const NAYO: Fighter = {
  name: 'nayo',
  sheets: NAYO_SHEETS,
  body: BODY,
  poses: (sheet) => (NAYO_POSES as Readonly<Record<string, readonly Pose[]>>)[sheet],
  effectsOnly: (sheet) => (sheet === 'projectile' ? NAYO_PROJECTILE : undefined),
  timing,
  draw: drawNayo,
  fx: EFFECTS,
  paletteOf,
};
