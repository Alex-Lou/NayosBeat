/**
 * The dock's atmospheres (docs/art/decor-dock.md §4): the same yard, each in its own palette, slot
 * for slot with its night's (palette.ts), graded (kit/grade.ts) without crushing contrast.
 */

import type { Rgba } from '../../sprites/png.ts';
import { mix, repaint, rgba, type Grade } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  CLOUD,
  DISTANT,
  DISTANT_LIT,
  EMBER,
  EXIT,
  GLASS,
  GLASS_WARM,
  MIST,
  PALETTE,
  SKY,
  SODIUM,
  WET,
  WET_ASPHALT,
} from './palette.ts';

function gradeFull(palette: Rgba[], { glow, shadow, lit }: Grade): void {
  palette.forEach((color, slot) => {
    if (slot === 0) return;
    const light = (color.r + color.g + color.b) / 3;
    palette[slot] = lit.has(slot)
      ? mix(color, glow, 0.25)
      : light < 56
        ? mix(color, shadow, 0.28)
        : mix(color, glow, 0.2);
  });
}

function dawn(): Rgba[] {
  const palette = [...PALETTE];
  const lit = new Set([...SODIUM, ...GLASS.slice(3), ...GLASS_WARM, ...EXIT, ...EMBER]);
  gradeFull(palette, { glow: rgba('#98a8c0'), shadow: rgba('#242c44'), lit });
  repaint(palette, SKY, [
    '#343c58',
    '#3c4462',
    '#464e6c',
    '#525876',
    '#5e6280',
    '#6c6c88',
    '#7c7690',
    '#8e8094',
    '#a28c98',
  ]);
  repaint(palette, CLOUD, ['#444664', '#565676', '#6a6686', '#827896']);
  repaint(palette, DISTANT, ['#2c324e', '#383e5c', '#464c6c', '#565c7c']);
  repaint(palette, DISTANT_LIT, ['#5e5c76', '#7c7688', '#a09294']);
  return palette;
}

function rain(): Rgba[] {
  const palette = [...PALETTE];
  const lit = new Set([...SODIUM, ...GLASS.slice(3), ...GLASS_WARM, ...EXIT, ...EMBER]);
  gradeFull(palette, { glow: rgba('#445078'), shadow: rgba('#1c2038'), lit });
  for (const slot of lit) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  repaint(palette, WET, [
    '#202234',
    '#2c2e44',
    '#3a3c56',
    '#4c4e6a',
    '#606280',
    '#787a98',
    '#9496b2',
    '#b4b6ce',
  ]);
  repaint(palette, WET_ASPHALT, ['#1a1c2e', '#26283e', '#363852', '#4a4c68']);
  repaint(palette, SKY, [
    '#1c2038',
    '#222640',
    '#292d48',
    '#313550',
    '#3a3d58',
    '#444660',
    '#4e4f68',
    '#5a5870',
    '#666278',
  ]);
  repaint(palette, CLOUD, ['#2e304c', '#3a3c5a', '#484a68', '#585a78']);
  repaint(palette, DISTANT, ['#20223c', '#282a46', '#323452', '#3e4060']);
  repaint(palette, DISTANT_LIT, ['#4c4464', '#665874', '#846e82']);
  return palette;
}

function fog(): Rgba[] {
  const lit = new Set([...SODIUM, ...GLASS.slice(3), ...GLASS_WARM, ...EXIT, ...EMBER, ...MIST]);
  const far = new Set([SKY, CLOUD, DISTANT, DISTANT_LIT].flat());
  const fogColor = rgba('#383c54');
  return PALETTE.map((color, slot) => {
    if (slot === 0 || lit.has(slot)) return color;
    return mix(color, fogColor, far.has(slot) ? 0.62 : 0.22);
  });
}

export const DOCK_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'dawn', weather: 'clear' }, palette: dawn() },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: rain() },
  { atmosphere: { moment: 'midnight', weather: 'fog' }, palette: fog() },
];
