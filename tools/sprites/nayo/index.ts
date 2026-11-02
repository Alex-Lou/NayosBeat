/** Nayo for the shared sprite pipeline (see ../fighter.ts). */

import { NAYO_CLIPS } from '../../../src/art/nayo/clips.ts';
import { NAYO_SHEETS } from '../../../src/art/nayo/sheets.ts';
import { ANCHOR } from '../../../src/art/types.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import type { Lighting } from '../raster.ts';
import { BODY, type Pose } from '../skeleton.ts';
import { FLOOR_OCCLUSION, STREET_SIGN } from '../street-light.ts';
import { drawNayo } from './look.ts';
import { DETAIL, EFFECT_TINTS, EFFECTS, MATERIAL, paletteOf } from './palette.ts';
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
 * The street's light beyond the key light (docs/art/nayo-lumiere.md): the club's violet sign
 * behind him and up high, on the top of his back, his shoulders, the back of his head and arms,
 * fading out by the hips; the lower body darkening toward the floor; his LEDs glowing faintly on
 * the cloth around them. Heights in art pixels above the feet (he stands about 170 tall).
 */
export const NAYO_LIGHTING: Lighting = {
  ground: ANCHOR.y,
  rim: {
    direction: STREET_SIGN.direction,
    facing: STREET_SIGN.facing,
    fade: { full: 110, none: 84 },
    exact: Object.fromEntries(
      HAIR_TONES.map((slot) => [slot, { rim: HAIR.rim ?? HAIR.light, light: HAIR.light }]),
    ),
  },
  occlusion: { height: 64, depth: FLOOR_OCCLUSION },
  glow: { [DETAIL.neonCore]: DETAIL.neonHalo },
  // His effects light him (docs/art/nayo-essence.md): the record, the sparks, the column, the
  // Boost's white.
  fx: {
    tints: EFFECT_TINTS,
    exact: Object.fromEntries(
      [MATERIAL.skin, HAIR].flatMap((material) => {
        const ramp = [material.outline, material.deep, material.shadow, material.base];
        const tones = [...ramp, material.light, material.gloss ?? material.light];
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
