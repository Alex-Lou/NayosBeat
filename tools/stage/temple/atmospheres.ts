/**
 * The temple's atmospheres (docs/art/decor-temple.md §4): the same courtyard, each in its own
 * palette, slot for slot with its night's (palette.ts), graded (kit/grade.ts). No full day: dawn,
 * dusk and night keep every large color in the flashes' band (docs/flashs.md §3), the developer's
 * choice (docs/art/brume.md §1). Its rain and its snow fall by themselves (src/render/stage-rain.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { ceiled, grade, repaint, rgba, type Grade } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  CLOUD,
  GLITTER,
  ISLAND,
  ISLAND_FAR,
  LANTERN,
  MOON,
  PALETTE,
  SEA,
  SKY,
  SNOW_BLOSSOM,
  SNOW_MOSS,
  SNOW_STONE,
  SNOW_TILE,
} from './palette.ts';

/** What gives light: the lanterns, the moon and its path. */
const LIT: ReadonlySet<number> = new Set([...LANTERN, ...MOON, ...GLITTER]);

/** `base` graded toward `light`, its lights as they were, its masses under the ceiling. */
function graded(base: readonly Rgba[], light: Omit<Grade, 'lit'>): Rgba[] {
  const palette = [...base];
  grade(palette, { ...light, lit: LIT });
  for (const slot of LIT) palette[slot] = base[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, LIT);
  return palette;
}

/**
 * Dusk, golden: the sky from a deep blue overhead to a dull amber at the horizon, the clouds lit
 * rose from below, the sea taking the sky's warmth, the islands dark against it; the courtyard warm
 * in the last light, the lanterns just lit.
 */
function dusk(): Rgba[] {
  const palette = graded(PALETTE, { glow: rgba('#7c5444'), shadow: rgba('#262a44') });
  repaint(palette, SKY, [
    '#1f2442',
    '#262846',
    '#2e2b47',
    '#3a2f48',
    '#463346',
    '#523744',
    '#5e3a40',
    '#683c3c',
    '#6d3c38',
  ]);
  repaint(palette, CLOUD, ['#3a2c44', '#4a3246', '#5a3844', '#6a3c40']);
  repaint(palette, SEA, ['#24223a', '#2c263c', '#36293c', '#42303c', '#4e343c']);
  repaint(palette, GLITTER, ['#6a4436', '#9a6444', '#c88a58']);
  repaint(palette, ISLAND_FAR, ['#2c233a', '#32263c', '#3a2a3e']);
  repaint(palette, ISLAND, ['#1d1b2f', '#211d31', '#262034', '#2c2337']);
  return palette;
}

/**
 * Dawn: a cold slate light, the sky a pale grey lid with a blush of pink over the sea, the islands
 * grey-blue; the courtyard cool, the lanterns still on, paler than the day coming.
 */
function dawn(): Rgba[] {
  const palette = graded(PALETTE, { glow: rgba('#7c8698'), shadow: rgba('#1e2436') });
  repaint(palette, SKY, [
    '#24283c',
    '#272b3f',
    '#2b2e42',
    '#2f3145',
    '#333447',
    '#38364a',
    '#3e384c',
    '#443a4e',
    '#4a3c50',
  ]);
  repaint(palette, CLOUD, ['#2e3044', '#363648', '#403c4e', '#4a4052']);
  repaint(palette, SEA, ['#212536', '#252939', '#2a2d3d', '#2f3141', '#353544']);
  repaint(palette, ISLAND_FAR, ['#2a2c40', '#2e3043', '#333446']);
  repaint(palette, ISLAND, ['#202234', '#232537', '#27283a', '#2b2b3d']);
  return palette;
}

/**
 * Rain at dusk: the dusk's sky gone to a low lid, its amber a dim band at the horizon; the stone
 * and the wood darker and colder, wet; the lanterns as bright, glowing in it.
 */
function duskRain(): Rgba[] {
  const palette = graded(dusk(), { glow: rgba('#2e3450'), shadow: rgba('#1c1d31') });
  repaint(palette, SKY, [
    '#1d1f36',
    '#202139',
    '#24233b',
    '#29253c',
    '#2f283d',
    '#352a3d',
    '#3c2c3c',
    '#432e3a',
    '#4a3038',
  ]);
  repaint(palette, CLOUD, ['#2a2640', '#312a42', '#382e42', '#403040']);
  return palette;
}

/**
 * Snow at night: a hush of cold blue, the snow on the roofs, the walls' caps, the lanterns' tops,
 * the cherry's branches and the flagstones a pale lavender grey (its hidden ramps, palette.ts),
 * held inside the flash measures' envelope; the lanterns warm against it.
 */
function snow(): Rgba[] {
  const palette = graded(PALETTE, { glow: rgba('#3a3c58'), shadow: rgba('#1e2034') });
  // The snow's lit edges, thin lines under 1 % of the screen each: brighter than the masses may be.
  repaint(palette, SNOW_TILE, ['#34303f', '#3c3546', '#463a4c', '#706a80', '#9a94a8']);
  repaint(palette, SNOW_STONE, [
    '#2a2838',
    '#302c3e',
    '#363043',
    '#3e3548',
    '#463a4c',
    '#4e3e50',
    '#706a80',
    '#9a94a8',
  ]);
  repaint(palette, SNOW_MOSS, ['#302c3e', '#3a3346', '#463a4c', '#504052']);
  repaint(palette, SNOW_BLOSSOM, ['#3a3346', '#443a4c', '#4e3e50', '#564254', '#9a94a8']);
  repaint(palette, SKY, [
    '#1b1b2f',
    '#1c1c32',
    '#1e1e35',
    '#212038',
    '#24223a',
    '#28243c',
    '#2c263e',
    '#302840',
    '#342a42',
  ]);
  return palette;
}

/** The atmospheres the temple offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const TEMPLE_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: dusk() },
  { atmosphere: { moment: 'dawn', weather: 'clear' }, palette: dawn() },
  { atmosphere: { moment: 'dusk', weather: 'rain' }, palette: duskRain() },
  { atmosphere: { moment: 'midnight', weather: 'snow' }, palette: snow() },
];
