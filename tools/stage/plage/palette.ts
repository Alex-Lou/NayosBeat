/**
 * Sunset Beach's palette (docs/art/decor-plage.md §3): its own. A beach at the golden hour: the sky
 * from a deep blue overhead to a dull amber at the horizon, the low sun and its path on the sea,
 * the sand warm, the palms dark against the light; a striped parasol or two, the bar's thatch and
 * its string of bulbs. Held inside the flash measures' band (docs/flashs.md §3): a dusk, never a
 * full day. Slot 0 is transparent, every other color opaque. The fighters own cyan and magenta:
 * the sea's blues and the parasols' red stay dull, far from both.
 */

import type { Rgba } from '../../sprites/png.ts';
import { MIST_HEXES } from '../kit/fog.ts';
import type { FigureRamps } from '../rue/people.ts';

const colors: Rgba[] = [{ r: 0, g: 0, b: 0, a: 0 }];

/** Registers the colors, darkest first, and returns their slots. */
function ramp(...hexes: string[]): readonly number[] {
  return hexes.map((hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    colors.push({ r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 });
    return colors.length - 1;
  });
}

/** The sky, overhead to the horizon: deep blue, violet, rose, a dull amber. */
export const SKY = ramp(
  '#22223e',
  '#28243f',
  '#302741',
  '#3a2b42',
  '#462f42',
  '#523441',
  '#5e383e',
  '#683e3a',
  '#6d4436',
);
/** The clouds, long flat bands lit gold from below. */
export const CLOUD = ramp('#3a2c44', '#4c3446', '#5e3c44', '#6d4440');
/** The low sun: its ring, its disc, its core; its path on the sea. */
export const SUN = ramp('#c87a44', '#f0a860', '#ffd890');
export const GLITTER = ramp('#7a5040', '#b07850', '#e0a868');
/** The sea, from the shore to the horizon, and the foam of its waves. */
export const SEA = ramp('#22223a', '#2a253c', '#34293c', '#40303c', '#4c363c');
export const FOAM = ramp('#6a5a5a', '#9a8a84', '#c8b8a8');
/** The headland far off, its palms. */
export const HEADLAND = ramp('#1e1b2e', '#241f32', '#2c2436');
/** The sand, dry, and wet where the waves reach. */
export const SAND = ramp('#3a2a2a', '#432f2c', '#4c362f', '#553c33', '#5e4236');
export const WET = ramp('#2e2430', '#352832', '#3e2e34');
/** The palms: trunks and fronds in silhouette, rimmed by the low sun. */
export const PALM = ramp('#1c1822', '#221c26', '#2a222c', '#6a4434');
/** The parasols' stripes, the loungers' and the bar's wood, its thatch. */
export const STRIPE = ramp('#4a2228', '#5c2c32', '#4a3a32', '#584436');
export const WOOD = ramp('#2a2026', '#34262a', '#40302e', '#4c3832');
export const STRAW = ramp('#3a2c26', '#4a382a', '#5a442e');
/** The bar's string of bulbs, its sign: the glow, the bulb. */
export const LAMP = ramp('#7a5430', '#d8a050', '#ffe0a0');
/** The gulls. */
export const GULL = ramp('#4a4252', '#8a8290');
/** The bathers, the bartender, in silhouettes; their rim of the sun; a towel, a swimsuit. */
export const PERSON = ramp('#1a1824', '#1f1c29', '#252130', '#2c2737', '#352f41');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const RIM = ramp('#8a5a3a', '#c08452');
export const TOWEL = ramp('#3e1c22', '#5a2a2e', '#2a3448');
/** The sea mist, drawn only in the fog (kit/fog.ts). */
export const MIST = ramp(...MIST_HEXES);

/** The beach's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The beach has ${PALETTE.length} colors: 256 at most`);
