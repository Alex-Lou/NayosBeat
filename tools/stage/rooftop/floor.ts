/**
 * The floor (docs/art/decor-rooftop.md §2.3): the roof the fighters stand on, in bands that read at
 * a glance. The slate membrane at their feet, its sheets lapped every 64 world pixels (they measure
 * the distances, as the street's slabs do); a walkway of concrete pavers across it, a pad a sheet;
 * the membrane again, then the drain channel along the edge; nearest, the parapet's coping, its lit
 * edge, its face. Both ends darken under the parapets' shade. Puddles in hidden ramps, which only
 * the rain shows (palette.ts). Flat tones, no band of dithering the whole width (it would shimmer
 * when the screen shakes). Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import { CONCRETE, MEMBRANE, RUST, STEEL, WET, WET_PAVER } from './palette.ts';

const SCALE = 2;
/** A membrane sheet's width, and a paver's with its joint: 64 world pixels. */
const SHEET = 64 * SCALE;
/** How far from each end the roof darkens (24 world pixels). */
const CORNER = 24 * SCALE;
/** The bands, top to bottom: membrane, walkway, membrane, drain, coping's top, coping's face. */
const ROWS = { walkway: 12, back: 40, drain: 54, coping: 60, face: 68 } as const;

function cornerOf(width: number, x: number): number {
  const end = Math.min(x, width - 1 - x);
  return end < CORNER ? -1.6 * (1 - end / CORNER) ** 1.5 : 0;
}

/**
 * Where the rain pools on the roof: long shallow puddles in the membrane's dips. Drawn in WET and
 * WET_PAVER, which only the rain's palettes show (palette.ts): dry, they are the roof itself.
 */
export function wetAt(seed: number, x: number, y: number): boolean {
  return noise(seed + 9, x, y * 3, 80) > 0.63;
}

/** A sheet of membrane at x, y: its lap (a raised seam and its shadow), its grit, its patches. */
function membraneAt(seed: number, width: number, x: number, y: number): number {
  const along = x % SHEET;
  const lap = along === 0 ? -1.4 : along === 1 ? 1.4 : along === 2 ? 0.6 : 0;
  const patch = noise(seed + 4, x, y, 40) > 0.74 ? 0.5 : 0;
  const grit = noise(seed + 5, x, y, 1.5) > 0.9 ? 0.8 : 0;
  const level = 2 + lap + patch + grit + cornerOf(width, x) + (noise(seed, x, y, 26) - 0.5) * 0.5;
  return tone(wetAt(seed, x, y) && along > 2 ? WET : MEMBRANE, level, x, y);
}

/** A paver of the walkway at x, y: a square pad on its pedestals, its joints dark. */
function paverAt(seed: number, width: number, x: number, y: number): number {
  const along = x % SHEET;
  const row = y - ROWS.walkway;
  const height = ROWS.back - ROWS.walkway;
  // Two pads a sheet, their joints showing the membrane's dark.
  const joint = along < 3 || (along >= SHEET / 2 && along < SHEET / 2 + 2) || row === 13;
  if (joint) return at(MEMBRANE, 0);
  const lit = row === 0 || row === 14 ? 1.4 : 0;
  const shade = row === height - 1 || row === 12 ? -1 : 0;
  const worn = noise(seed + 7, x, y, 9) > 0.7 ? -0.5 : 0;
  const level = 3.4 + lit + shade + worn + cornerOf(width, x);
  return tone(wetAt(seed + 2, x, y) ? WET_PAVER : CONCRETE, level, x, y);
}

/** The floor, `width` × `height` image pixels, from the rooftop's seed. */
export function drawFloor(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    const corner = cornerOf(width, x);
    if (y < ROWS.walkway || (y >= ROWS.back && y < ROWS.drain)) {
      return membraneAt(seed, width, x, y);
    }
    if (y < ROWS.back) return paverAt(seed, width, x, y);
    // The drain channel: its lip lit, its dark bottom, a grate every other sheet.
    if (y < ROWS.coping) {
      if (y === ROWS.drain) return at(CONCRETE, 2);
      const grate = x % (SHEET * 2) > SHEET - 24 && x % (SHEET * 2) < SHEET + 24;
      if (grate) return at(STEEL, (x % 4 < 2 ? 1 : 3) + (y === ROWS.coping - 1 ? -1 : 0));
      return at(MEMBRANE, 0);
    }
    // The coping: its lit front edge, its top in slabs, then its face, darker, stained.
    if (y === ROWS.coping) return at(CONCRETE, 7);
    if (y < ROWS.face) {
      const joint = x % SHEET === 0 ? -2 : 0;
      return tone(CONCRETE, 5 + joint + corner - (y - ROWS.coping) * 0.12, x, y);
    }
    if (y === ROWS.face) return at(CONCRETE, 2);
    const stain = noise(seed + 11, x, y * 0.25, 7) > 0.68 ? -0.8 : 0;
    const rust = noise(seed + 13, x, y * 0.15, 3) > 0.86;
    if (rust) return at(RUST, 0);
    return tone(CONCRETE, 2.6 + stain + corner + (noise(seed + 12, x, y, 18) - 0.5) * 0.4, x, y);
  });
  return canvas;
}
