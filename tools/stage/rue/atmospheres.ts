/**
 * The street's atmospheres (docs/art/decor-rue.md §13): the same street, each in its own palette,
 * slot for slot with the night's (palette.ts), graded (kit/grade.ts). `npm run stages` writes each
 * atmosphere's layers in its folder (tools/sprites/stage-drawn.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { ceiled, grade, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  CLOUD,
  COOL,
  DISTANT,
  DISTANT_LIT,
  LAMP,
  LIGHTBOX,
  NEON_ORANGE,
  NEON_VIOLET,
  PALETTE,
  SKY,
  WARM,
} from './palette.ts';

/**
 * Dusk: the last light of the day, low behind the city. The sky goes from a deep blue overhead to
 * a dull amber at the horizon, the clouds lit pink from below, the towers backlit, darker than
 * their sky. The street is in the evening's shade, a little lighter and less violet than at
 * midnight; its lamps and signs just lit, weaker than the daylight still left. Still darker, duller
 * and less saturated than the fighters (docs/flashs.md §3), and nowhere near their cyan or magenta.
 */
export function dusk(): Rgba[] {
  const palette = [...PALETTE];
  // The evening's light: the street's walls and stones turn rose, at about their own luminance
  // (the flashes' band, docs/flashs.md §3), its deepest shadows blue; its lights still faint.
  grade(palette, {
    glow: rgba('#7a4a58'),
    shadow: rgba('#2a2c4a'),
    lit: new Set([...WARM, ...LAMP, ...LIGHTBOX, ...NEON_ORANGE, ...NEON_VIOLET, ...COOL]),
  });
  // Its lightest steps stay under VEIL_DELTA's luminance: a black effect over the sky changes it
  // no more than over the night's (docs/flashs.md §3; tests/tools/stage-drawn.test.ts).
  repaint(palette, SKY, [
    '#202848',
    '#262e50',
    '#2e3355',
    '#3a3757',
    '#483c57',
    '#563f53',
    '#62434e',
    '#66444b',
    '#6c4443',
  ]);
  repaint(palette, CLOUD, ['#3e3756', '#4d3f59', '#5a4456', '#5f4552']);
  repaint(palette, DISTANT, ['#211f38', '#25223c', '#2a2640', '#312b46']);
  repaint(palette, DISTANT_LIT, ['#3e3550', '#574352', '#715452']);
  return palette;
}

/**
 * The rain at midnight (docs/art/pluie.md): the walls and the sidewalk darker and colder, soaked;
 * the lamps, the windows and the signs as bright as on a dry night, the street around them
 * glistening; the sky a low lid, the towers half gone in the rain.
 */
function rain(): Rgba[] {
  const palette = [...PALETTE];
  const lit = new Set([...WARM, ...LAMP, ...LIGHTBOX, ...NEON_ORANGE, ...NEON_VIOLET, ...COOL]);
  grade(palette, { glow: rgba('#2e3450'), shadow: rgba('#1c1d31'), lit });
  for (const slot of lit) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, lit);
  repaint(palette, SKY, [
    '#1b1b2f',
    '#1f1e33',
    '#232136',
    '#272439',
    '#2b273c',
    '#2f2a3f',
    '#332c41',
    '#372f43',
    '#3b3145',
  ]);
  repaint(palette, CLOUD, ['#262439', '#2c2940', '#332e46', '#3a334a']);
  repaint(palette, DISTANT, ['#1f1c34', '#221f37', '#26223a', '#2a253d']);
  repaint(palette, DISTANT_LIT, ['#3a3048', '#4a3a4e', '#5a4652']);
  return palette;
}

/** The atmospheres the street offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const STREET_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: dusk() },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
];
