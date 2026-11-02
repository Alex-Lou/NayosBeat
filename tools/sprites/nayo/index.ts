/** Nayo for the shared sprite pipeline (see ../fighter.ts). */

import { NAYO_CLIPS } from '../../../src/art/nayo/clips.ts';
import { NAYO_SHEETS } from '../../../src/art/nayo/sheets.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import type { Lighting } from '../raster.ts';
import { BODY, type Pose } from '../skeleton.ts';
import { drawNayo } from './look.ts';
import { DETAIL, EFFECTS, MATERIAL, paletteOf } from './palette.ts';
import { NAYO_POSES, NAYO_PROJECTILE, NAYO_PROJECTILE_BOOST } from './poses/index.ts';

const HAIR = MATERIAL.hair;
/** The hair's tones in the head's stamp (head.ts): exact pixels, found by their slot. */
const HAIR_TONES = [
  HAIR.outline,
  HAIR.deep,
  HAIR.shadow,
  HAIR.base,
  HAIR.light,
  HAIR.gloss ?? HAIR.light,
];

/**
 * His light beyond the key light (docs/art/nayo-lumiere.md): the neon behind him and above, on
 * his back, the back of his arms and legs, his hair; his neons glow on the cloth around them.
 */
export const NAYO_LIGHTING: Lighting = {
  rim: {
    direction: { x: -0.7, y: -0.7 },
    facing: { rim: 0.72, light: 0.3 },
    exact: Object.fromEntries(
      HAIR_TONES.map((slot) => [slot, { rim: HAIR.rim ?? HAIR.light, light: HAIR.light }]),
    ),
  },
  glow: { [DETAIL.neonCore]: DETAIL.neonHalo },
};

const SHEETS: Readonly<Record<string, { frames: number }>> = NAYO_SHEETS;

export const NAYO: Fighter = {
  name: 'nayo',
  sheets: NAYO_SHEETS,
  body: BODY,
  poses: (sheet) => (NAYO_POSES as Readonly<Record<string, readonly Pose[]>>)[sheet],
  // The Vinyle in flight, and the platine one.
  effectsOnly: (sheet) =>
    sheet === 'projectile'
      ? NAYO_PROJECTILE
      : sheet === 'projectileBoost'
        ? NAYO_PROJECTILE_BOOST
        : undefined,
  // Ticks per frame, from the clips that play each strip.
  timing: (sheet) => timingOf(NAYO_CLIPS, sheet, SHEETS[sheet]?.frames ?? 0),
  lighting: NAYO_LIGHTING,
  draw: drawNayo,
  fx: EFFECTS,
  platine: namedEffects(NAYO_CLIPS),
  paletteOf,
};
