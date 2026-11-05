/**
 * Watt's head is a high-wattage industrial light bulb (docs/watt.md §10): a globe of smoked glass
 * catching the violet street sign on its back rim and the warm sodium lamps on its front dome;
 * inside, a bold, expressive twin-coil Tesla filament (`F`, `f`) mounted on two heavy electrode
 * posts (`w`) that forms his "eyes and grin of current", surrounded by a two-step internal glow
 * (`h`, `H`); at the base, a heavy riveted brass screw cap (`O..G`) seated in his collar socket.
 * Its expressions are the filament's shapes and states (face.ts).
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '...........rrdddddd',
  '.........rrdddddddddd',
  '.......rrddddlllldddddd',
  '......rsssbbbbllllllggdd',
  '.....rsssbbbbbbllllllgddd',
  '....rslbbbbbbbbbblllllgddd',
  '....rslgbbbbbbbbbblllllddd',
  '...rslbbbbbbbbbbbbbllllgddd',
  '...rslbbbbbbbHHHHbbbblllldd',
  '..rsslgsbbbbHHHHHHHHbblllddd',
  '..rsslsssbbHHhhhhhhHHbbllddd',
  '..osslssssHHhfFFhFFfhHbbbldd',
  '..osslgsssHHfFFhhFFfhhHbbbdd',
  '..osslssssHHfFhhhhFfhhHbbbdd',
  '..osssssssHHhhhhhhhhhhHbbbdd',
  '..osssssssHHfFhhhhFfhhHbbbdo',
  '..osssssssHHhfFFFFfhhhHbbsso',
  '..ossssssssHHwhfFfwhhHbbsso',
  '...ossssssssHHwhhhwhhHbbso',
  '...osssssssssHwhhhwhHbbsso',
  '....ossssssssswHHHwHHbsso',
  '....osssssssssswHHwssssso',
  '.....ossssssssswsswsssso',
  '......osssssssswsswsssso',
  '.......ossssssswsswssso',
  '.......osssssssswswssso',
  '........ossssssswwssso',
  '........ossssssswwssso',
  '.........OGGBBLLBBGGO',
  '.........OSSBBLBBLLSO',
  '.........ODDSSBSSBBDO',
  '.........ODDDDSLLGGBO',
  '.........OSSBBLBBLLSO',
  '.........ODDSSBSSBBDO',
  '.........ODDDDSLLGGBO',
  '..........OSBBLLLGGO',
  '..........ODSSBBBLLO',
  '............ODDDDO',
  '............OOOOOO',
];

/** Pixel of the stamp on the skeleton's head point: the middle of the globe. */
export const HEAD_CENTER: Point = { x: 14, y: 13 };

const GLASS = MATERIAL.glass;
const BRASS = MATERIAL.brass;

/** Palette slot of each stamp character; '.' (or any other) is empty. */
const LEGEND: Legend = {
  // The globe, darkest to lightest; its back edge in the sign's light.
  o: GLASS.outline,
  d: GLASS.deep,
  s: GLASS.shadow,
  b: GLASS.base,
  l: GLASS.light,
  g: GLASS.gloss,
  r: GLASS.rim,
  // The light inside the smoke, around the filament.
  H: DETAIL.glowDeep,
  h: DETAIL.glow,
  // The filament: its coil, lit; its wires.
  F: DETAIL.ledCore,
  f: DETAIL.sound,
  w: DETAIL.wire,
  // The brass cap and its threads.
  O: BRASS.outline,
  D: BRASS.deep,
  S: BRASS.shadow,
  B: BRASS.base,
  L: BRASS.light,
  G: BRASS.gloss,
};

/**
 * Draws the bulb with the filament's state of `face`, its center pixel at `center` (cell
 * pixels), turned `angle` degrees clockwise on screen; mirrored when his body is turned round
 * (Skeleton.turned): a bulb is the same from both sides, only its glints move.
 */
export function stampHead(
  canvas: PixelCanvas,
  face: Face,
  center: Point,
  angle: number,
  turned = false,
): void {
  const slots = headSlots(expressionOf(HEAD, face));
  if (!turned) {
    stamp(canvas, slots, HEAD_CENTER, center, angle);
    return;
  }
  const width = Math.max(...slots.map((row) => row.length));
  const mirrored = slots.map((row) =>
    [...row, ...Array<number>(width - row.length).fill(0)].reverse(),
  );
  stamp(canvas, mirrored, { x: width - 1 - HEAD_CENTER.x, y: HEAD_CENTER.y }, center, angle);
}

/** Palette slots of a head's pixels (0: empty). */
export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}
