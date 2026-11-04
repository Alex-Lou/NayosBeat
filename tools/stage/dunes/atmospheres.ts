/**
 * The dunes' atmospheres (docs/art/decor-dune-dusk.md §4): the same desert, each in its own
 * palette, slot for slot with its dusk's (palette.ts). Under the open sky: the rain falls on it
 * all (src/render/stage-rain.ts); its fog has two banks drifting (index.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { fogged } from '../kit/fog.ts';
import { ceiled, grade, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { CLOUD, DUNE_FAR, DUNE_MID, PALETTE, SKY, SUN, SUNGLOW } from './palette.ts';

/** What gives light: the low sun and its path. */
const LIT: ReadonlySet<number> = new Set([...SUN, ...SUNGLOW]);

/**
 * A rare rain at dusk: the sky a grey lid, the sun a pale disc behind it, the sand darker and
 * wet, the tufts shining.
 */
function rain(): Rgba[] {
  const palette = [...PALETTE];
  grade(palette, { glow: rgba('#3a4050'), shadow: rgba('#1c1d31'), lit: LIT });
  for (const slot of LIT) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, LIT);
  repaint(palette, SKY, [
    '#1e2036',
    '#24243c',
    '#2a2a42',
    '#322f46',
    '#3d3648',
    '#493d48',
    '#4e403c',
    '#52423c',
    '#54443c',
  ]);
  repaint(palette, CLOUD, ['#323046', '#3c384e', '#484054']);
  repaint(palette, SUN, ['#4a3830', '#5e4634', '#6a5040']);
  repaint(palette, SUNGLOW, ['#3e3428', '#463a2a', '#4e402e']);
  return palette;
}

/**
 * A sand haze (docs/art/brume.md): the far dunes gone, the plain a little greyer, the sun pale in
 * it. Banks drift over the dunes and low along the plain (index.ts).
 */
function fog(): Rgba[] {
  return fogged(PALETTE, {
    color: rgba('#423c40'),
    far: [SKY, CLOUD, SUNGLOW, DUNE_FAR, DUNE_MID],
    lit: new Set(SUN),
    depth: 0.7,
    near: 0.2,
  });
}

/** The atmospheres the desert offers, the base one first: the dusk (palette.ts as it is). */
export const DUNES_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'dusk', weather: 'fog' }, palette: fog() },
];
