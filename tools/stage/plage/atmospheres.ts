/**
 * The beach's atmospheres (docs/art/decor-plage.md §4): the same beach at the golden hour, each in
 * its own palette, slot for slot with the base one's (palette.ts). Under the open sky: the rain
 * falls on it all (src/render/stage-rain.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { fogged } from '../kit/fog.ts';
import { ceiled, grade, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { CLOUD, GLITTER, HEADLAND, LAMP, PALETTE, SEA, SKY, SUN } from './palette.ts';

/** What gives light: the sun and its path, the bar's bulbs. */
const LIT: ReadonlySet<number> = new Set([...SUN, ...GLITTER, ...LAMP]);

/**
 * A tropical shower: the sky gone to a low grey lid, the sun behind it, a dim amber band where it
 * sets; the sea grey; the sand and the palms darker, wet; the bar's bulbs as bright.
 */
function shower(): Rgba[] {
  const palette = [...PALETTE];
  grade(palette, { glow: rgba('#3a3650'), shadow: rgba('#1c1d31'), lit: LIT });
  for (const slot of LIT) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  repaint(palette, SKY, [
    '#1e1f36',
    '#212238',
    '#25253a',
    '#2a273b',
    '#30293c',
    '#362b3c',
    '#3c2d3b',
    '#432f3a',
    '#4a3238',
  ]);
  repaint(palette, CLOUD, ['#2a2840', '#302c42', '#363042', '#3c3242']);
  repaint(palette, SUN, ['#4a3238', '#5a3a3a', '#6a423c']);
  repaint(palette, GLITTER, ['#3a2e3a', '#4a343c', '#5a3a3e']);
  repaint(palette, SEA, ['#1f2034', '#232336', '#272638', '#2b2939', '#302c3a']);
  ceiled(palette, PALETTE, LIT);
  return palette;
}

/**
 * Sea mist (docs/art/brume.md): the headland and the far sea gone, the sun a pale disc in it; the
 * beach a little greyer; the bulbs as bright, glowing in it. Banks of mist drift over the sea and
 * low along the shore (index.ts).
 */
function mist(): Rgba[] {
  return fogged(PALETTE, {
    color: rgba('#4a3c48'),
    far: [SKY, CLOUD, SEA, HEADLAND],
    lit: new Set(LAMP),
    depth: 0.7,
    near: 0.22,
  });
}

/** The atmospheres the beach offers, the base one first: the golden hour (palette.ts as it is). */
export const PLAGE_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'rain' }, palette: shower() },
  { atmosphere: { moment: 'dusk', weather: 'fog' }, palette: mist() },
];
