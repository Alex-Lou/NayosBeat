/**
 * The dock's atmospheres (docs/art/decor-dock.md §4): the same yard, each in its own palette, slot
 * for slot with its night's (palette.ts), graded (kit/grade.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { grade, luminanceOf, MOST_LUMINANCE, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  CLOUD,
  DISTANT,
  DISTANT_LIT,
  EMBER,
  EXIT,
  GLASS,
  GLASS_WARM,
  PALETTE,
  SKY,
  SODIUM,
} from './palette.ts';

/**
 * The ceiling of the dawn's masses, channel by channel. Two measures are set over every large
 * color of every stage, and the dock must move neither:
 * - the flash tables are measured over the brightest backdrop, each channel at its highest among
 *   the street's and the gym's large colors (#6d4457, src/render/luminance.ts `brightestBackdrop`,
 *   tests/render/flash-areas.test.ts);
 * - the Finisher's cyan halo takes the highest alpha that lights none of them (0.27,
 *   tests/render/finisher-halo.test.ts). Cyan adds green, and the less red a backdrop has, the
 *   less the halo's own red takes back: a grey dawn at that backdrop's green would lower it.
 * So the green sits a few steps lower.
 */
const DAWN_CEILING = rgba('#6d3c57');

/** `color`, darkened (its hue kept) until none of its channels is past `ceiling`'s. */
function under(color: Rgba, ceiling: Rgba): Rgba {
  const k = Math.min(
    1,
    ceiling.r / Math.max(color.r, 1),
    ceiling.g / Math.max(color.g, 1),
    ceiling.b / Math.max(color.b, 1),
  );
  const channel = (value: number) => Math.floor(value * k);
  return { r: channel(color.r), g: channel(color.g), b: channel(color.b), a: color.a };
}

/**
 * A grey dawn, the party's end: a cold slate light comes down into the yard, the brick and the
 * concrete turn grey-blue, the shadows go blue; the wall packs are still on, paler than the day
 * coming, and the club's violet fades in its windows. The sky is a low lid of grey, a little
 * lighter over the roofs. Every large color stays under the flashes' band (docs/flashs.md §3)
 * and under DAWN_CEILING: the masses the night kept under the band are darkened back under it.
 */
function dawn(): Rgba[] {
  const palette = [...PALETTE];
  const lit = new Set([...SODIUM, ...GLASS.slice(3), ...GLASS_WARM, ...EXIT, ...EMBER]);
  grade(palette, { glow: rgba('#7c8698'), shadow: rgba('#1e2436'), lit });
  palette.forEach((color, slot) => {
    const night = PALETTE[slot];
    if (slot === 0 || lit.has(slot) || !night || luminanceOf(night) > MOST_LUMINANCE) return;
    palette[slot] = under(color, DAWN_CEILING);
  });
  // The sky a lid of grey, lighter than the night's from the top down: over the roof, the only
  // band of it the fight shows (docs/art/decor-rue.md §13).
  repaint(palette, SKY, [
    '#262a3e',
    '#292c41',
    '#2c2f44',
    '#303247',
    '#333449',
    '#37364b',
    '#3a384d',
    '#3e3a50',
    '#423b52',
  ]);
  repaint(palette, CLOUD, ['#2c2c40', '#36344a', '#423e52', '#4e4656']);
  repaint(palette, DISTANT, ['#22243a', '#272a40', '#2d3046', '#34364c']);
  repaint(palette, DISTANT_LIT, ['#3e3c50', '#524c58', '#6a5e5e']);
  return palette;
}

/** The atmospheres the dock offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const DOCK_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dawn', weather: 'clear' }, palette: dawn() },
];
