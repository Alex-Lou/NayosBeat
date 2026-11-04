/**
 * The dojo's atmospheres (docs/art/decor-dojo.md §4): the same hall, each in its own palette, slot
 * for slot with its night's (palette.ts). Sheltered (src/art/stages.ts): the rain falls outside,
 * drawn on the screens by the `rain` animation (mid.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { ceiled, grade, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { LANTERN, PALETTE, PAPER, PAPER_LIT, WALL } from './palette.ts';

/** What gives light: the lanterns. */
const LIT: ReadonlySet<number> = new Set([...LANTERN]);

/**
 * The rain at night: the hall a little colder, the screens' paper greyer where the rain streaks,
 * the lanterns as bright.
 */
function rain(): Rgba[] {
  const palette = [...PALETTE];
  grade(palette, { glow: rgba('#2e3450'), shadow: rgba('#1c1d31'), lit: LIT });
  for (const slot of LIT) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, LIT);
  repaint(palette, WALL, ['#1c1c2c', '#22222e', '#282834']);
  repaint(palette, PAPER, ['#3a3428', '#423c2c', '#48402e']);
  repaint(palette, PAPER_LIT, ['#423c2c', '#4a4430']);
  return palette;
}

/** The atmospheres the hall offers, the base one first: midnight clear (palette.ts as it is). */
export const DOJO_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
];
