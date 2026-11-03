/**
 * Neon Dusk's atmospheres (docs/art/decor-neon-dusk.md §4): the same street, each in its own
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
  NEON_GREEN,
  NEON_ORANGE,
  PALETTE,
  SKY,
  WINDOW,
} from './palette.ts';

/** What gives light: the neons, the far windows, the flying cars' lights. */
const LIT: ReadonlySet<number> = new Set([...NEON_ORANGE, ...NEON_GREEN, ...WINDOW]);

/**
 * Rain at midnight: the asphalt soaked and darker, the sky a low lid; the neons and the far
 * windows as bright, glowing in the wet air, their reflections longer.
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
  repaint(palette, HAZE, ['#3a2e3a', '#4a3440', '#5a3c40', '#664244']);
  return palette;
}

/**
 * A wet fog (docs/art/brume.md): the city gone, the street a little greyer, the neons as bright,
 * glowing in it. Banks drift over the roofs and low along the street (index.ts).
 */
function fog(): Rgba[] {
  return fogged(PALETTE, {
    color: rgba('#3a3648'),
    far: [SKY, CLOUD, HAZE, DISTANT_FAR, DISTANT],
    lit: new Set([...NEON_ORANGE, ...NEON_GREEN]),
    depth: 0.7,
    near: 0.2,
  });
}

/** The atmospheres the street offers, the base one first: midnight clear (palette.ts as it is). */
export const NEON_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'midnight', weather: 'fog' }, palette: fog() },
];
