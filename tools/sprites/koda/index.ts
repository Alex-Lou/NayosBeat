/** Koda for the shared sprite pipeline (see ../fighter.ts). */

import { KODA_CLIPS } from '../../../src/art/koda/clips.ts';
import { KODA_SHEETS } from '../../../src/art/koda/sheets.ts';
import { ANCHOR } from '../../../src/art/types.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import type { Lighting } from '../raster.ts';
import { BODY, type Pose } from '../skeleton.ts';
import { FLOOR_OCCLUSION, STREET_SIGN } from '../street-light.ts';
import { drawKoda } from './look.ts';
import { DETAIL, EFFECT_TINTS, EFFECTS, MATERIAL, paletteOf } from './palette.ts';
import { KODA_POSES, KODA_PROJECTILE, KODA_PROJECTILE_BOOST } from './poses/index.ts';

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
 * The street's light beyond the key light: the club's violet sign behind him and up high, on the
 * top of his back, his silver pauldrons, the back of his spiky green hair and arms, fading out by
 * the hips; the lower body darkening toward the floor; his resonator slits glowing faintly on the
 * metal and cloth around them.
 */
export const KODA_LIGHTING: Lighting = {
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

const SHEETS: Readonly<Record<string, { frames: number }>> = KODA_SHEETS;

export const KODA: Fighter = {
  name: 'koda',
  sheets: KODA_SHEETS,
  body: BODY,
  poses: (sheet) => (KODA_POSES as Readonly<Record<string, readonly Pose[]>>)[sheet],
  effectsOnly: (sheet) =>
    sheet === 'projectile'
      ? KODA_PROJECTILE
      : sheet === 'projectileBoost'
        ? KODA_PROJECTILE_BOOST
        : undefined,
  timing: (sheet) => timingOf(KODA_CLIPS, sheet, SHEETS[sheet]?.frames ?? 0),
  lighting: KODA_LIGHTING,
  draw: drawKoda,
  fx: EFFECTS,
  platine: namedEffects(KODA_CLIPS),
  paletteOf,
};
