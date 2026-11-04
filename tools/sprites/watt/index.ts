/** Watt for the shared sprite pipeline (see ../fighter.ts). */

import { WATT_CLIPS } from '../../../src/art/watt/clips.ts';
import { WATT_SHEETS, type WattSheet } from '../../../src/art/watt/sheets.ts';
import { ANCHOR } from '../../../src/art/types.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import type { Lighting, Material } from '../raster.ts';
import { FLOOR_OCCLUSION, STREET_SIGN } from '../street-light.ts';
import { WATT_BODY } from './body.ts';
import { drawWatt } from './look.ts';
import { DETAIL, EFFECT_TINTS, EFFECTS, MATERIAL, paletteOf } from './palette.ts';
import { WATT_POSES } from './poses/index.ts';

function tonesOf(material: Material): number[] {
  const { outline, deep, shadow, base, light, gloss = light } = material;
  return [outline, deep, shadow, base, light, gloss];
}

/**
 * The tones of a stamped head's exact pixels (head.ts) under the back light, found by their
 * slot: the bulb's glass and its brass cap.
 */
function exactRims(materials: readonly Material[]): Lighting['rim']['exact'] {
  return Object.fromEntries(
    materials.flatMap((material) =>
      tonesOf(material).map((slot) => [
        slot,
        { rim: material.rim ?? material.light, light: material.light },
      ]),
    ),
  );
}

/**
 * The street's light beyond the key light, the same as Nayo's and Riff's (../street-light.ts):
 * the club's violet sign behind him and up high, on the top of his back, his shoulders, the back
 * of the bulb and of his arms, fading out by the hips; the lower body darkening toward the floor.
 * His diodes and the bulb's filament glow: a 1 px halo of his energy around each. Heights in art
 * pixels above the feet, scaled to his body: his guard's neck stands at about 130, his hips at 73.
 */
export const WATT_LIGHTING: Lighting = {
  ground: ANCHOR.y,
  rim: {
    direction: STREET_SIGN.direction,
    facing: STREET_SIGN.facing,
    fade: { full: 116, none: 90 },
    exact: exactRims([MATERIAL.glass, MATERIAL.brass]),
  },
  occlusion: { height: 64, depth: FLOOR_OCCLUSION },
  glow: { [DETAIL.ledCore]: DETAIL.ledHalo },
  fx: {
    tints: EFFECT_TINTS,
    exact: Object.fromEntries(
      [MATERIAL.glass, MATERIAL.brass].flatMap((material) => {
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

const isSheet = (sheet: string): sheet is WattSheet => sheet in WATT_SHEETS;

export const WATT: Fighter = {
  name: 'watt',
  sheets: WATT_SHEETS,
  body: WATT_BODY,
  poses: (sheet) => (isSheet(sheet) ? WATT_POSES[sheet] : undefined),
  // Ticks per frame, from the clips that play each strip: the game's timing.
  timing: (sheet) =>
    isSheet(sheet)
      ? timingOf(WATT_CLIPS, sheet, WATT_SHEETS[sheet].frames)
      : { ticks: [], loops: false },
  lighting: WATT_LIGHTING,
  draw: drawWatt,
  fx: EFFECTS,
  platine: namedEffects(WATT_CLIPS),
  paletteOf,
};
