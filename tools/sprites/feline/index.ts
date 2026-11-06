/** Feline for the shared sprite pipeline (see ../fighter.ts). */

import { FELINE_CLIPS } from '../../../src/art/feline/clips.ts';
import { FELINE_SHEETS } from '../../../src/art/feline/sheets.ts';
import { ANCHOR } from '../../../src/art/types.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import type { Lighting } from '../raster.ts';
import { BODY, type Pose } from '../skeleton.ts';
import { FLOOR_OCCLUSION, STREET_SIGN } from '../street-light.ts';
import { drawFeline } from './look.ts';
import { DETAIL, EFFECT_TINTS, EFFECTS, MATERIAL, paletteOf } from './palette.ts';
import { FELINE_POSES } from './poses/index.ts';

const HAIR = MATERIAL.hair;
const HAIR_TONES = [
  HAIR.outline,
  HAIR.deep,
  HAIR.shadow,
  HAIR.base,
  HAIR.light,
  HAIR.gloss ?? HAIR.light,
];

export const FELINE_LIGHTING: Lighting = {
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

const SHEETS: Readonly<Record<string, { frames: number }>> = FELINE_SHEETS;

export const FELINE: Fighter = {
  name: 'feline',
  sheets: FELINE_SHEETS,
  body: BODY,
  poses: (sheet) => (FELINE_POSES as Readonly<Record<string, readonly Pose[]>>)[sheet],
  timing: (sheet) => timingOf(FELINE_CLIPS, sheet, SHEETS[sheet]?.frames ?? 0),
  springs: [
    { stiffness: 0.24, damping: 0.32 },
    { stiffness: 0.16, damping: 0.28 },
  ],
  lighting: FELINE_LIGHTING,
  draw: drawFeline,
  fx: EFFECTS,
  platine: namedEffects(FELINE_CLIPS),
  paletteOf,
};
