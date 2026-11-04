/**
 * The forest's atmospheres (docs/art/decor-forest-dance.md §4): the same clearing, each in its own
 * palette, slot for slot with its dawn's (palette.ts). Under the open sky: the rain falls on it
 * all (src/render/stage-rain.ts); its fog has two banks drifting (index.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { fogged } from '../kit/fog.ts';
import { ceiled, grade, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { CLOUD, PALETTE, SKY, SUNGLOW, TREE_FAR, TREE_MID, TREE_NEAR } from './palette.ts';

/** What gives light: the dawn's glow. */
const LIT: ReadonlySet<number> = new Set([...SUNGLOW]);

/**
 * A fine rain at dawn: the sky a grey lid, the earth dark and wet, the leaves shining; the glow
 * of the sunrise dimmer behind the trees.
 */
function rain(): Rgba[] {
  const palette = [...PALETTE];
  grade(palette, { glow: rgba('#3a4050'), shadow: rgba('#1c1d31'), lit: LIT });
  for (const slot of LIT) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, LIT);
  repaint(palette, SKY, [
    '#22242e',
    '#262832',
    '#2b2d36',
    '#30323a',
    '#373740',
    '#3f3e46',
    '#454248',
    '#463e42',
    '#484244',
  ]);
  repaint(palette, CLOUD, ['#22303e', '#293846', '#30404c']);
  repaint(palette, SUNGLOW, ['#3a3840', '#444046', '#4c4646']);
  return palette;
}

/**
 * The morning mist (docs/art/brume.md): the far trees gone, the clearing a little greyer, the
 * dawn's glow pale in it. Banks drift between the trunks and low along the path (index.ts).
 */
function fog(): Rgba[] {
  return fogged(PALETTE, {
    color: rgba('#3e3c48'),
    far: [SKY, CLOUD, SUNGLOW, TREE_FAR, TREE_MID, TREE_NEAR],
    lit: new Set(SUNGLOW),
    depth: 0.7,
    near: 0.22,
  });
}

/** The atmospheres the forest offers, the base one first: the dawn (palette.ts as it is). */
export const FORET_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'dawn', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dawn', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'dawn', weather: 'fog' }, palette: fog() },
];
