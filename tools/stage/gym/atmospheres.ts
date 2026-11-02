/**
 * The gym's atmospheres (docs/art/decor-gym.md §4): the same gym, each in its own palette, slot
 * for slot with its night's (palette.ts), graded (kit/grade.ts). The slots it takes from the street
 * take the street's palette of the same hour (its sky, its towers), the gym's own are graded after
 * them.
 */

import type { Rgba } from '../../sprites/png.ts';
import { grade, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { dusk as streetDusk } from '../rue/atmospheres.ts';
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

/** The atmospheres the gym offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const GYM_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: dusk() },
];
