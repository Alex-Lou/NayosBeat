/**
 * The club's atmospheres (docs/art/decor-club.md §4): the same room, each in its own palette, slot
 * for slot with its night's (palette.ts). Sheltered (src/art/stages.ts): its rain falls only in the
 * loading door's opening, its fog is the stage's smoke.
 */

import type { Rgba } from '../../sprites/png.ts';
import { fogged } from '../kit/fog.ts';
import { repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { AMBER, BRICK, NIGHT, PALETTE, RAIN, SODIUM, VIOLET, YARD } from './palette.ts';

const LIT: ReadonlySet<number> = new Set([...VIOLET, ...AMBER, ...SODIUM, ...RAIN]);

/**
 * The stage's smoke (docs/art/brume.md): the back of the room swallowed in a violet haze, the
 * speaker walls half gone, the floor's crowd a little greyer; the LEDs and the bar as bright,
 * glowing in it. Banks of smoke drift low over the dance floor (index.ts).
 */
function smoke(): Rgba[] {
  return fogged(PALETTE, {
    color: rgba('#2c2840'),
    far: [BRICK],
    lit: LIT,
    depth: 0.6,
    near: 0.2,
  });
}

/**
 * Rain outside: the yard beyond the loading door soaked and darker, the night a lower lid, the rain
 * falling in the opening (mid.ts); the room as it is.
 */
function rain(): Rgba[] {
  const palette = [...PALETTE];
  repaint(palette, NIGHT, ['#1b1b2f', '#1d1c32', '#232038']);
  repaint(palette, YARD, ['#1f1e2c', '#262433', '#2e2b3b']);
  return palette;
}

/** The atmospheres the club offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const CLUB_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'midnight', weather: 'fog' }, palette: smoke() },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
];
