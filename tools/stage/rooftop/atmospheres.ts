/**
 * The rooftop's atmospheres (docs/art/decor-rooftop.md §4): the same roof, each in its own palette,
 * slot for slot with its night's (palette.ts), graded (kit/grade.ts). Its rain falls by itself
 * (src/render/stage-rain.ts): a palette is all the rain asks of a stage (docs/art/pluie.md).
 */

import type { Rgba } from '../../sprites/png.ts';
import { ceiled, grade, repaint, rgba, type Grade } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  AVIATION,
  BEAM,
  BEAM_DROP,
  CLOUD,
  EMBER,
  HAZE,
  NEON_GREEN,
  NEON_ORANGE,
  NEON_VIOLET,
  NEON_YELLOW,
  PALE,
  PALETTE,
  REFLECT_VIOLET,
  REFLECT_YELLOW,
  SKY,
  SODIUM,
  WET,
  WET_PAVER,
  WINDOW,
} from './palette.ts';

/** What gives light: as bright under the rain as on a dry night, which makes it stand out. */
const LIT: ReadonlySet<number> = new Set([
  ...NEON_VIOLET,
  ...NEON_YELLOW,
  ...NEON_GREEN,
  ...NEON_ORANGE,
  ...SODIUM,
  ...WINDOW.slice(1),
  ...AVIATION,
  ...PALE,
  ...EMBER,
  ...BEAM,
  ...BEAM_DROP,
]);

/**
 * The rain's common ground: graded toward `light`, the lights restored, the masses brought back
 * under the flash measures' ceiling; the puddles turned to water, the signs' streaks lit in them,
 * the rain caught in the searchlight's beam.
 */
function soaked(light: Omit<Grade, 'lit'>): Rgba[] {
  const palette = [...PALETTE];
  grade(palette, { ...light, lit: LIT });
  for (const slot of LIT) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, LIT);
  repaint(palette, WET, ['#1c1c29', '#20202e', '#252434', '#2b283a', '#322d41', '#3a3248']);
  repaint(palette, WET_PAVER, [
    '#1e1d2b',
    '#232130',
    '#292636',
    '#302b3d',
    '#373144',
    '#40384c',
    '#4a3f53',
    '#544657',
  ]);
  repaint(palette, REFLECT_VIOLET, [
    '#3a2a50',
    '#422e54',
    '#4a3256',
    '#523657',
    '#5a3957',
    '#623c57',
  ]);
  repaint(palette, REFLECT_YELLOW, [
    '#3e2e2a',
    '#48322a',
    '#523628',
    '#5c3a28',
    '#663c2a',
    '#6c3c2c',
  ]);
  repaint(palette, BEAM_DROP, ['#565a80', '#8084aa', '#b4b8d8']);
  return palette;
}

/**
 * The rain at midnight, a downpour: the roof and the city darker and colder, soaked; the signs, the
 * lamp and the windows as bright as on a dry night, their light running in the puddles; the sky a
 * low lid, the far towers half gone.
 */
function midnightRain(): Rgba[] {
  const palette = soaked({ glow: rgba('#2e3450'), shadow: rgba('#1c1d31') });
  repaint(palette, SKY, [
    '#1b1b2f',
    '#1c1c32',
    '#1e1e35',
    '#202038',
    '#24223b',
    '#28243e',
    '#2d2741',
    '#322943',
    '#372b44',
  ]);
  repaint(palette, CLOUD, ['#232239', '#29263f', '#302a45', '#382f4a']);
  repaint(palette, HAZE, ['#1f1d36', '#211f39', '#24223b', '#28243e']);
  return palette;
}

/**
 * A storm at dusk: the last of the day low behind the towers, a dull amber under a lid of blue;
 * the clouds' bellies rose; the roof in the evening's shade, wet; the signs just lit, as bright as
 * at night. Every large color stays under the flashes' band and the flash measures' ceiling
 * (kit/grade.ts BACKDROP_CEILING), nowhere near the fighters' cyan or magenta.
 */
function duskRain(): Rgba[] {
  const palette = soaked({ glow: rgba('#4a3c52'), shadow: rgba('#20223c') });
  repaint(palette, SKY, [
    '#1d2140',
    '#212443',
    '#262745',
    '#2e2a47',
    '#382e48',
    '#443247',
    '#503545',
    '#5c3843',
    '#663a40',
  ]);
  repaint(palette, CLOUD, ['#2e2a46', '#3a304c', '#48364e', '#58394c']);
  repaint(palette, HAZE, ['#262441', '#2a2744', '#302a46', '#372d47']);
  return palette;
}

/** The atmospheres the rooftop offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const ROOFTOP_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: midnightRain() },
  { atmosphere: { moment: 'dusk', weather: 'rain' }, palette: duskRain() },
];
