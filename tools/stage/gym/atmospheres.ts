/**
 * The gym's atmospheres (docs/art/decor-gym.md §4): the same gym, each in its own palette, slot
 * for slot with its night's (palette.ts), graded (kit/grade.ts). The slots it takes from the street
 * take the street's palette of the same hour (its sky, its towers), the gym's own are graded after
 * them.
 */

import type { Rgba } from '../../sprites/png.ts';
import { ceiled, grade, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { dusk as streetDusk, fog as streetFog, rain as streetRain } from '../rue/atmospheres.ts';
import { BORROWED, FLUO, LAMP_GREEN, LAMP_RED, OWN_FROM, PALETTE, TRAIN_LIT } from './palette.ts';

/** `palette` with the slots the gym takes from the street as `street` (its palette of an hour). */
function borrowedFrom(palette: Rgba[], street: readonly Rgba[]): Rgba[] {
  for (const [slot, theirs] of BORROWED)
    palette[slot] = street[theirs] ?? palette[slot] ?? rgba('#000000');
  return palette;
}

/**
 * Closing time at dusk: the low sun through the fan window, amber on the brick and the boards,
 * the shadows under the vault blue; the tubes just on, and paler than the day still left.
 */
function dusk(): Rgba[] {
  const palette = borrowedFrom([...PALETTE], streetDusk());
  grade(
    palette,
    {
      glow: rgba('#7c5444'),
      shadow: rgba('#262a44'),
      lit: new Set([...FLUO, ...LAMP_GREEN, ...LAMP_RED, ...TRAIN_LIT]),
    },
    OWN_FROM,
  );
  return palette;
}

/**
 * The rain at midnight (docs/art/pluie.md): it falls outside, at the window (index.ts), the street's
 * night of rain behind it; under the vault, the brick and the boards colder and damper, the tubes
 * as bright as ever. The gym is sheltered (src/art/stages.ts): no curtain falls over the fight.
 */
function rain(): Rgba[] {
  const palette = borrowedFrom([...PALETTE], streetRain());
  const lit = new Set([...FLUO, ...LAMP_GREEN, ...LAMP_RED, ...TRAIN_LIT]);
  grade(palette, { glow: rgba('#2e3450'), shadow: rgba('#1c1d31'), lit }, OWN_FROM);
  for (const slot of lit) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, lit);
  return palette;
}

/**
 * A fog at midnight (docs/art/brume.md): outside, the street's night of fog, the towers and the
 * next span half gone behind the window; under the vault, the gym as it is, sheltered from it.
 */
function fog(): Rgba[] {
  return borrowedFrom([...PALETTE], streetFog());
}

/** The atmospheres the gym offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const GYM_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: dusk() },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'midnight', weather: 'fog' }, palette: fog() },
];
