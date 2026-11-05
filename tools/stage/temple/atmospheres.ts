/**
 * The temple's atmospheres (docs/art/decor-temple.md §4): the same courtyard, each in its own
 * palette, slot for slot with its night's (palette.ts), graded while preserving full contrast.
 */

import type { Rgba } from '../../sprites/png.ts';
import { mix, repaint, rgba, type Grade } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  CLOUD,
  GLITTER,
  ISLAND,
  ISLAND_FAR,
  LANTERN,
  MOON,
  PALETTE,
  SEA,
  SKY,
  SNOW_BLOSSOM,
  SNOW_MOSS,
  SNOW_STONE,
  SNOW_TILE,
} from './palette.ts';

const LIT: ReadonlySet<number> = new Set([...LANTERN, ...MOON, ...GLITTER]);

function graded(base: readonly Rgba[], { glow, shadow }: Omit<Grade, 'lit'>): Rgba[] {
  const palette = [...base];
  palette.forEach((color, slot) => {
    if (slot === 0 || LIT.has(slot)) return;
    const light = (color.r + color.g + color.b) / 3;
    palette[slot] = light < 56 ? mix(color, shadow, 0.28) : mix(color, glow, 0.24);
  });
  return palette;
}

function dusk(): Rgba[] {
  const palette = graded(PALETTE, { glow: rgba('#b87458'), shadow: rgba('#2c2e50') });
  repaint(palette, SKY, [
    '#242a50',
    '#30325a',
    '#403a62',
    '#544268',
    '#6a4c6a',
    '#825668',
    '#9c6264',
    '#b6705e',
    '#d08058',
  ]);
  repaint(palette, CLOUD, ['#4a385c', '#664868', '#865a70', '#aa7078']);
  repaint(palette, SEA, ['#282848', '#363254', '#483c5e', '#5e4864', '#765668']);
  repaint(palette, GLITTER, ['#8a5c48', '#c48660', '#f4b87c']);
  repaint(palette, ISLAND_FAR, ['#3c3050', '#4c3a5a', '#604664']);
  repaint(palette, ISLAND, ['#24203c', '#302848', '#403254', '#523e62']);
  return palette;
}

function dawn(): Rgba[] {
  const palette = graded(PALETTE, { glow: rgba('#98a8c4'), shadow: rgba('#222a42') });
  repaint(palette, SKY, [
    '#2c3450',
    '#363e5c',
    '#424a68',
    '#505674',
    '#606280',
    '#726e8a',
    '#867a94',
    '#9c889c',
    '#b498a4',
  ]);
  repaint(palette, CLOUD, ['#424868', '#565a7a', '#6e6e8e', '#8a86a4']);
  repaint(palette, SEA, ['#26304a', '#303c58', '#3c4a68', '#4a5878', '#5a6888']);
  repaint(palette, ISLAND_FAR, ['#38405c', '#464e6c', '#565e7c']);
  repaint(palette, ISLAND, ['#262c44', '#323852', '#404662', '#505674']);
  return palette;
}

function duskRain(): Rgba[] {
  const palette = graded(dusk(), { glow: rgba('#444e78'), shadow: rgba('#1e2038') });
  repaint(palette, SKY, [
    '#1f223e',
    '#262846',
    '#2f2e4e',
    '#3a3554',
    '#463c5a',
    '#54445e',
    '#644c60',
    '#765460',
    '#885e60',
  ]);
  repaint(palette, CLOUD, ['#343050', '#443a5a', '#564462', '#6a5068']);
  return palette;
}

function snow(): Rgba[] {
  const palette = graded(PALETTE, { glow: rgba('#646c98'), shadow: rgba('#20243c') });
  repaint(palette, SNOW_TILE, ['#484c68', '#5e6482', '#78809e', '#9ca4c0', '#c8d0e8']);
  repaint(palette, SNOW_STONE, [
    '#38364c',
    '#484660',
    '#5a5874',
    '#6e6c8a',
    '#8482a0',
    '#9c9ab8',
    '#b8b6d0',
    '#dcdce8',
  ]);
  repaint(palette, SNOW_MOSS, ['#3c3a52', '#504e68', '#686682', '#84829e']);
  repaint(palette, SNOW_BLOSSOM, ['#4c445e', '#625874', '#7a708c', '#988ea8', '#c8c0d8']);
  repaint(palette, SKY, [
    '#1c2038',
    '#222642',
    '#2a2e4c',
    '#323656',
    '#3c4060',
    '#464a6a',
    '#525474',
    '#60607e',
    '#6e6c88',
  ]);
  return palette;
}

export const TEMPLE_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dusk', weather: 'clear' }, palette: dusk() },
  { atmosphere: { moment: 'dawn', weather: 'clear' }, palette: dawn() },
  { atmosphere: { moment: 'dusk', weather: 'rain' }, palette: duskRain() },
  { atmosphere: { moment: 'midnight', weather: 'snow' }, palette: snow() },
];
