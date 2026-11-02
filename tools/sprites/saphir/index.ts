/** Saphir for the shared sprite pipeline (see ../fighter.ts). */

import { SAPHIR_CLIPS } from '../../../src/art/saphir/clips.ts';
import { SAPHIR_SHEETS, type SaphirSheet } from '../../../src/art/saphir/sheets.ts';
import { ANCHOR } from '../../../src/art/types.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import type { Lighting, Material } from '../raster.ts';
import { FLOOR_OCCLUSION, STREET_SIGN } from '../street-light.ts';
import { SAPHIR_BODY } from './body.ts';
import { drawSaphir } from './look.ts';
import { EFFECT_TINTS, EFFECTS, MATERIAL, paletteOf } from './palette.ts';
import { SAPHIR_POSES } from './poses/index.ts';

/** The tones of a material's stamped pixels (the mask, the ponytail: head.ts), by slot. */
function tonesOf(material: Material): number[] {
  const { outline, deep, shadow, base, light, gloss = light } = material;
  return [outline, deep, shadow, base, light, gloss];
}

/**
 * The street's light beyond the key light (porte 4; as Nayo's and Riff's, ../street-light.ts):
 * the club's violet sign behind her and up high, on the top of her back, her shoulders, the back
 * of her mask and her ponytail, fading out by the hips, nothing under them; the lower body
 * darkening toward the floor. Her effects light her (docs/art/nayo-essence.md): the sapphire of
 * her kicks, the cream of her strikes, the Boost's white. Heights in art pixels above the feet,
 * scaled to her body: her guard's neck at about 114 (Nayo's 122), her hips at 68 (his 73).
 */
export const SAPHIR_LIGHTING: Lighting = {
  ground: ANCHOR.y,
  rim: {
    direction: STREET_SIGN.direction,
    facing: STREET_SIGN.facing,
    fade: { full: 102, none: 79 },
    exact: Object.fromEntries(
      [MATERIAL.hair, MATERIAL.mask].flatMap((material) =>
        tonesOf(material).map((slot) => [
          slot,
          { rim: material.rim ?? material.light, light: material.light },
        ]),
      ),
    ),
  },
  occlusion: { height: 60, depth: FLOOR_OCCLUSION },
  glow: {},
  fx: {
    tints: EFFECT_TINTS,
    exact: Object.fromEntries(
      [MATERIAL.skin, MATERIAL.hair, MATERIAL.mask].flatMap((material) => {
        const tones = tonesOf(material);
        return tones.map((slot, i) => [
          slot,
          { material: material.outline, darker: tones[Math.max(1, i - 1)] ?? slot },
        ]);
      }),
    ),
    levels: { kiss: 0.3, lit: 0.58 },
    drama: 0.22,
    shadow: 0.55,
    floor: 4,
  },
};

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
  lighting: SAPHIR_LIGHTING,
  draw: drawSaphir,
  fx: EFFECTS,
  platine: namedEffects(SAPHIR_CLIPS),
  paletteOf,
};
