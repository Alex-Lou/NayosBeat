/**
 * The dock's atmospheres (docs/art/decor-dock.md §4): the same yard, each in its own palette, slot
 * for slot with its night's (palette.ts), graded (kit/grade.ts).
 */

import type { Rgba } from '../../sprites/png.ts';
import { fogged } from '../kit/fog.ts';
import { ceiled, grade, repaint, rgba } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  CLOUD,
  DISTANT,
  DISTANT_LIT,
  EMBER,
  EXIT,
  GLASS,
  GLASS_WARM,
  PALETTE,
  SKY,
  SODIUM,
  WET,
  WET_ASPHALT,
} from './palette.ts';

/**
 * A grey dawn, the party's end: a cold slate light comes down into the yard, the brick and the
 * concrete turn grey-blue, the shadows go blue; the wall packs are still on, paler than the day
 * coming, and the club's violet fades in its windows. The sky is a low lid of grey, a little
 * lighter over the roofs. Every large color stays under the flashes' band (docs/flashs.md §3)
 * and under the flash measures' ceiling (kit/grade.ts `ceiled`).
 */
function dawn(): Rgba[] {
  const palette = [...PALETTE];
  const lit = new Set([...SODIUM, ...GLASS.slice(3), ...GLASS_WARM, ...EXIT, ...EMBER]);
  grade(palette, { glow: rgba('#7c8698'), shadow: rgba('#1e2436'), lit });
  ceiled(palette, PALETTE, lit);
  // The sky a lid of grey, lighter than the night's from the top down: over the roof, the only
  // band of it the fight shows (docs/art/decor-rue.md §13).
  repaint(palette, SKY, [
    '#262a3e',
    '#292c41',
    '#2c2f44',
    '#303247',
    '#333449',
    '#37364b',
    '#3a384d',
    '#3e3a50',
    '#423b52',
  ]);
  repaint(palette, CLOUD, ['#2c2c40', '#36344a', '#423e52', '#4e4656']);
  repaint(palette, DISTANT, ['#22243a', '#272a40', '#2d3046', '#34364c']);
  repaint(palette, DISTANT_LIT, ['#3e3c50', '#524c58', '#6a5e5e']);
  return palette;
}

/**
 * The rain at midnight, a downpour (docs/art/pluie.md): the brick and the concrete darker and
 * colder, soaked; the lamps and the club's violet as bright as on a dry night, their light
 * running in the puddles (WET, floor.ts); the sky a low lid, the towers half gone in the rain.
 */
function rain(): Rgba[] {
  const palette = [...PALETTE];
  const lit = new Set([...SODIUM, ...GLASS.slice(3), ...GLASS_WARM, ...EXIT, ...EMBER]);
  grade(palette, { glow: rgba('#2e3450'), shadow: rgba('#1c1d31'), lit });
  for (const slot of lit) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  ceiled(palette, PALETTE, lit);
  repaint(palette, WET, [
    '#1c1c28',
    '#20202e',
    '#252433',
    '#2b293a',
    '#322e42',
    '#3a334a',
    '#423850',
    '#4a3c54',
  ]);
  repaint(palette, WET_ASPHALT, ['#1c1c2a', '#22212f', '#2a2737', '#332e40']);
  repaint(palette, SKY, [
    '#1c1c30',
    '#201f34',
    '#242238',
    '#28253b',
    '#2c283e',
    '#302b40',
    '#342d42',
    '#383044',
    '#3c3246',
  ]);
  repaint(palette, CLOUD, ['#262439', '#2c2940', '#332e46', '#3a334a']);
  repaint(palette, DISTANT, ['#1f1c34', '#221f37', '#26223a', '#2a253d']);
  repaint(palette, DISTANT_LIT, ['#3a3048', '#4a3a4e', '#5a4652']);
  return palette;
}

/**
 * A fog at midnight (docs/art/brume.md): the city over the roof gone, the back street down the
 * alley a grey hollow; the yard a little greyer; the wall packs and the club's violet as bright as
 * ever, glowing out of it. Banks of mist drift over the distance (index.ts).
 */
function fog(): Rgba[] {
  return fogged(PALETTE, {
    color: rgba('#2a2838'),
    far: [SKY, CLOUD, DISTANT, DISTANT_LIT],
    lit: new Set([...SODIUM, ...GLASS.slice(3), ...GLASS_WARM, ...EXIT, ...EMBER]),
    depth: 0.72,
    near: 0.24,
  });
}

/** The atmospheres the dock offers, the base one first (BASE_ATMOSPHERE: palette.ts as it is). */
export const DOCK_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dawn', weather: 'clear' }, palette: dawn() },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'midnight', weather: 'fog' }, palette: fog() },
];
