/**
 * Watt's head is a light bulb (docs/watt.md §10), drawn from scratch: a globe of smoked glass,
 * the club's violet sign catching its top and back edge, the sodium lamps' warm glint on its
 * front; inside, the filament coiled across on two wires, lit in his energy, a halo of light in
 * the smoke around it; under the globe, the brass cap screwed into his collar, its threads in
 * warm lines. The filament sits a little forward: it is where he looks. One character per pixel
 * (legend below). The bulb is rigid: it turns with the head, upright under 20 degrees, by
 * RotSprite beyond. Its expressions are the filament's states (face.ts).
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
  '...rslbbbbbbbbbbbbbbblllldd',
  '..rsslgsbbbbbbbbbbbbbblllddd',
  '..rsslsssbbbbbHHHHbbbbbllddd',
  '..osslssssbbHHHHHHHHbbbbbldd',
  '..osslgssssHHHHHHHHHHbbbbbdd',
  '..osslssssHHHHhhhhHHHHbbbbdd',
  '..osssssssHHHhhhhhhHHHbbbbdd',
  '..ossssssHHHhhhhhhhhHHHbbbdo',
  '..ossssssHHHFfFfFfFfFHHbbsso',
  '..ossssssHHHfFfFfFfFfHHbbsso',
  '...osssssHHHhwhhhhwhHHHbbso',
  '...ossssssHHHwhhhhwHHHbbsso',
  '....osssssHHHwhhhhwHHHbsso',
  '....ossssssHHwHHHHwHHsssso',
  '.....ossssssHwHHHHwHsssso',
  '......osssssswHHHHwsssso',
  '.......ossssswsssswssso',
  '.......ossssswsssswssso',
  '........osssswsssswsso',
  '........osssswsssswsso',
  '.........ossswsssswso',
  '.........OBBLLLLLLGGO',
  '.........OSSBBBBBBBBO',
  '.........ODDSSSSSSSSO',
  '.........OBBLLLLLLGGO',
  '.........OSSBBBBBBBBO',
  '.........ODDSSSSSSSSO',
  '..........OBLLLLLLGO',
  '..........OSBBBBBBBO',
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
