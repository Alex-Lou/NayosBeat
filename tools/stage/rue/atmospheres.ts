/**
 * The street's atmospheres (docs/art/decor-rue.md §13): the same street, each in its own palette,
 * slot for slot with the night's (palette.ts), graded (kit/grade.ts). `npm run stages` writes each
 * atmosphere's layers in its folder (tools/sprites/stage-drawn.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { grade, repaint, rgba } from '../kit/grade.ts';
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

/** The atmospheres the street offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const STREET_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: dusk() },
];
