/**
 * The forest's atmospheres (docs/art/decor-firefly-forest.md §4): the same clearing, each in its
 * own palette, slot for slot with its night's (palette.ts). Under the open sky: the rain falls on
 * it all (src/render/stage-rain.ts); its fog has two banks drifting (index.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { fogged } from '../kit/fog.ts';
import { ceiled, grade, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { CLOUD, MOON, PALETTE, SKY, TREE_FAR, TREE_MID, TREE_NEAR } from './palette.ts';

/** What gives light: the moon, the fireflies, the mushrooms. */
const LIT: ReadonlySet<number> = new Set([...MOON]);

/**
 * A fine rain at night: the sky a low lid, the earth dark and wet, the pond rippling; the moon
 * dimmer behind the trees, the fireflies and the mushrooms as bright.
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
  repaint(palette, CLOUD, ['#22233e', '#292944', '#302f49']);
  repaint(palette, MOON, ['#4a4a5c', '#7a7890', '#a8a4b0']);
  return palette;
}

/**
 * The night's mist (docs/art/brume.md): the far trees gone, the clearing a little greyer, the
 * moon pale in it; the fireflies glow through. Banks drift between the trunks and low along the
 * path (index.ts).
 */
function fog(): Rgba[] {
  return fogged(PALETTE, {
    color: rgba('#3a3648'),
    far: [SKY, CLOUD, MOON, TREE_FAR, TREE_MID, TREE_NEAR],
    lit: new Set(MOON),
    depth: 0.7,
    near: 0.2,
  });
}

/** The atmospheres the forest offers, the base one first: midnight clear (palette.ts as it is). */
export const LUCIOLES_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'midnight', weather: 'fog' }, palette: fog() },
];
