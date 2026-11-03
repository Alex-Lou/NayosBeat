/**
 * The ballroom's atmospheres (docs/art/decor-bal.md §4): the same room, each in its own palette,
 * slot for slot with its night's (palette.ts). Sheltered (src/art/stages.ts): its rain and its snow
 * fall only behind the high windows (far.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { repaint } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import { NIGHT, PALETTE, SILL } from './palette.ts';

/** Rain outside: the night behind the glass darker and colder, the rain on it (far.ts). */
function rain(): Rgba[] {
  const palette = [...PALETTE];
  repaint(palette, NIGHT, ['#191a2c', '#1b1d31', '#1f2236']);
  repaint(palette, SILL, ['#1f2236', '#1f2236']);
  return palette;
}

/**
 * Snow outside: the night behind the glass paler, lit by the snow; the snow piled on the sills
 * outside (a hidden ramp, the night's lowest tone in the other palettes) and falling (far.ts).
 */
function snow(): Rgba[] {
  const palette = [...PALETTE];
  repaint(palette, NIGHT, ['#212132', '#262637', '#2c2b3c']);
  repaint(palette, SILL, ['#9a94a8', '#c8c4d0']);
  return palette;
}

/** The atmospheres the ballroom offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const BAL_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'midnight', weather: 'snow' }, palette: snow() },
];
