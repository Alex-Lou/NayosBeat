/** Riff for the shared sprite pipeline (see ../fighter.ts). */

import { RIFF_CLIPS } from '../../../src/art/riff/clips.ts';
import { RIFF_SHEETS, type RiffSheet } from '../../../src/art/riff/sheets.ts';
import { ANCHOR } from '../../../src/art/types.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import type { Lighting, Material } from '../raster.ts';
import { FLOOR_OCCLUSION, STREET_SIGN } from '../street-light.ts';
import { RIFF_BODY } from './body.ts';
import { drawRiff } from './look.ts';
import { EFFECTS, MATERIAL, paletteOf } from './palette.ts';
import { RIFF_POSES } from './poses/index.ts';

/**
 * The tones of a stamped head's exact pixels (head.ts) under the back light, found by their
 * slot: the hair's spikes, the shaved side's stubble, the fringe. The skin of the face never
 * takes it: it is turned to the lamps, away from the sign.
 */
function exactRims(materials: readonly Material[]): Lighting['rim']['exact'] {
  return Object.fromEntries(
    materials.flatMap((material) => {
      const { outline, deep, shadow, base, light, gloss = light, rim = light } = material;
      return [outline, deep, shadow, base, light, gloss].map((slot) => [slot, { rim, light }]);
    }),
  );
}

/**
 * The street's light beyond the key light (docs/art/riff-lumiere.md), the same as Nayo's
 * (../street-light.ts) on her body: the club's violet sign behind her and up high, on the top of
 * her back, her shoulders, the back of her head and arms, fading out by the hips; the lower body
 * darkening toward the floor. She has no LED: nothing glows. Her effects light nothing yet.
 * Heights in art pixels above the feet, scaled to her body: her guard's neck stands at about
 * 107 (Nayo's 122), her hips at 64 (his 73).
 */
export const RIFF_LIGHTING: Lighting = {
  ground: ANCHOR.y,
  rim: {
    direction: STREET_SIGN.direction,
    facing: STREET_SIGN.facing,
    fade: { full: 96, none: 74 },
    exact: exactRims([MATERIAL.hair, MATERIAL.stubble, MATERIAL.magenta]),
  },
  occlusion: { height: 56, depth: FLOOR_OCCLUSION },
  glow: {},
};

const isSheet = (sheet: string): sheet is RiffSheet => sheet in RIFF_SHEETS;

export const RIFF: Fighter = {
  name: 'riff',
  sheets: RIFF_SHEETS,
  body: RIFF_BODY,
  poses: (sheet) => (isSheet(sheet) ? RIFF_POSES[sheet] : undefined),
  // Ticks per frame, from the clips that play each strip: the game's timing.
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
  lighting: RIFF_LIGHTING,
  draw: drawRiff,
  fx: EFFECTS,
  platine: namedEffects(RIFF_CLIPS),
  paletteOf,
};
