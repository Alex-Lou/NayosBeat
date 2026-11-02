/**
 * The street's light, the same on every fighter who stands in it (docs/art/decor-rue.md §5,
 * docs/art/nayo-lumiere.md, docs/art/riff-lumiere.md). The sodium lamps are the key light
 * (raster.ts, `LIGHT`); the club's violet sign, behind the fighters and up high, is their back
 * light; the floor darkens their lower body. Each fighter scales the heights to their body
 * (`Lighting.rim.fade`, `Lighting.occlusion.height`), never the light itself.
 */

import type { Point } from './raster.ts';

export const STREET_SIGN = {
  /** Its violet on a dark material. */
  color: '#8e74c0',
  /** Its violet on a light material (a light jacket, silver). */
  onLight: '#cbb8ee',
  /** Where it comes from, in image axes (x right, y down), toward it: behind, up high. */
  direction: { x: -0.6, y: -0.8 } as Point,
  /** How squarely an edge must face it to take its color, and its material's light tone. */
  facing: { rim: 0.75, light: 0.55 },
} as const;

/** How much key light (n·L) the floor takes from a fighter's feet: the ambient occlusion. */
export const FLOOR_OCCLUSION = 0.55;
