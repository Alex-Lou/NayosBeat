/**
 * The market's atmospheres (docs/art/decor-night-market.md §4): the same alley, each in its own
 * palette, slot for slot with its night's (palette.ts). Under the open sky: the rain falls on it
 * all (src/render/stage-rain.ts); its fog has two banks drifting (index.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { fogged } from '../kit/fog.ts';
import { ceiled, grade, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  CLOUD,
  DISTANT,
  DISTANT_FAR,
  HAZE,
  LANTERN,
  LANTERN_PALE,
  MOON,
  PALETTE,
  SKY,
  WINDOW,
} from './palette.ts';

/** What gives light: the lanterns, the far windows. */
const LIT: ReadonlySet<number> = new Set([...LANTERN, ...LANTERN_PALE, ...WINDOW]);

/**
 * Dusk, golden: the sky from a deep blue overhead to a dull amber over the roofs, the city dark
 * against it; the alley warm in the last light, the lanterns just lit.
 */
function dusk(): Rgba[] {
  const palette = [...PALETTE];
  grade(palette, { glow: rgba('#6a4a4a'), shadow: rgba('#262a44'), lit: LIT });
  for (const slot of LIT) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  repaint(palette, SKY, [
    '#1e2340',
    '#242646',
    '#2c2a49',
    '#362f4a',
    '#433448',
    '#503846',
    '#5c3c42',
    '#653f3e',
    '#6a423a',
  ]);
  repaint(palette, CLOUD, ['#3a2e4a', '#4a344c', '#583a4a', '#623e44']);
  repaint(palette, HAZE, ['#4a3238', '#5a3a3a', '#66423c', '#6a443a']);
  repaint(palette, DISTANT, ['#262636', '#2c2b3a', '#33313e', '#3a3842']);
  ceiled(palette, PALETTE, LIT);
  return palette;
}

/**
 * Rain at midnight: the stone soaked and darker, the awnings heavy, the sky a low lid; the lanterns
 * and the far windows as bright, glowing in the wet air.
 */
function rain(): Rgba[] {
  const palette = [...PALETTE];
  grade(palette, { glow: rgba('#2e3450'), shadow: rgba('#1c1d31'), lit: LIT });
  for (const slot of LIT) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, LIT);
  repaint(palette, SKY, [
    '#1b1b30',
    '#1d1d34',
    '#202038',
    '#23233c',
    '#27273f',
    '#2b2b42',
    '#302f45',
    '#353347',
    '#3a3749',
  ]);
  repaint(palette, CLOUD, ['#22233e', '#292944', '#302f49', '#37354e']);
  repaint(palette, HAZE, ['#3a2c30', '#4a3436', '#5a3c3a', '#66423c']);
  repaint(palette, DISTANT, ['#21222e', '#262733', '#2c2d39', '#323340']);
  return palette;
}

/**
 * A wet fog (docs/art/brume.md): the city and the far windows gone, the alley a little greyer, the
 * lanterns as bright, glowing in it. Banks drift over the roofs and low along the lane (index.ts).
 */
function fog(): Rgba[] {
  return fogged(PALETTE, {
    color: rgba('#3a3648'),
    far: [SKY, CLOUD, HAZE, DISTANT_FAR, DISTANT, MOON],
    lit: new Set([...LANTERN, ...LANTERN_PALE]),
    depth: 0.7,
    near: 0.2,
  });
}

/** The atmospheres the market offers, the base one first: midnight clear (palette.ts as it is). */
export const MARCHE_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: dusk() },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'midnight', weather: 'fog' }, palette: fog() },
];
