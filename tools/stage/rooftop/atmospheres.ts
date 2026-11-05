/**
 * The rooftop's atmospheres (docs/art/decor-rooftop.md §4): the same roof, each in its own palette,
 * slot for slot with its night's (palette.ts), graded while preserving full contrast.
 */

import type { Rgba } from '../../sprites/png.ts';
import { mix, repaint, rgba, type Grade } from '../kit/grade.ts';
import type { StageAtmosphere } from '../kit/stage.ts';
import {
  AVIATION,
  BEAM,
  BEAM_DROP,
  CLOUD,
  EMBER,
  HAZE,
  MIST,
  NEON_GREEN,
  NEON_ORANGE,
  NEON_VIOLET,
  NEON_YELLOW,
  PALE,
  PALETTE,
  REFLECT_VIOLET,
  REFLECT_YELLOW,
  SKY,
  SODIUM,
  TOWER,
  WET,
  WET_PAVER,
  WINDOW,
} from './palette.ts';

const LIT: ReadonlySet<number> = new Set([
  ...NEON_VIOLET,
  ...NEON_YELLOW,
  ...NEON_GREEN,
  ...NEON_ORANGE,
  ...SODIUM,
  ...WINDOW.slice(1),
  ...AVIATION,
  ...PALE,
  ...EMBER,
  ...BEAM,
  ...BEAM_DROP,
]);

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

function soaked(light: Omit<Grade, 'lit'>): Rgba[] {
  const palette = [...PALETTE];
  gradeFull(palette, { ...light, lit: LIT });
  for (const slot of LIT) palette[slot] = PALETTE[slot] ?? palette[slot] ?? rgba('#000000');
  repaint(palette, WET, ['#1a1c2e', '#24283e', '#323650', '#424666', '#54587c', '#6a6e94']);
  repaint(palette, WET_PAVER, [
    '#202032',
    '#2e2e44',
    '#3e3e58',
    '#50506e',
    '#646484',
    '#7a7a9c',
    '#9494b6',
    '#b0b0d0',
  ]);
  repaint(palette, REFLECT_VIOLET, [
    '#3c2a58',
    '#4e3670',
    '#624488',
    '#7854a0',
    '#9066b8',
    '#aa7cd0',
  ]);
  repaint(palette, REFLECT_YELLOW, [
    '#463428',
    '#5c422c',
    '#745230',
    '#8e6436',
    '#aa783e',
    '#c68e48',
  ]);
  repaint(palette, BEAM_DROP, ['#5c6290', '#8890be', '#c0c8ea']);
  return palette;
}

function midnightRain(): Rgba[] {
  const palette = soaked({ glow: rgba('#424c78'), shadow: rgba('#1c1e36') });
  repaint(palette, SKY, [
    '#1b1d34',
    '#20223e',
    '#272848',
    '#303052',
    '#3a385c',
    '#444066',
    '#504a70',
    '#5c5478',
    '#6a5e80',
  ]);
  repaint(palette, CLOUD, ['#2a2848', '#38345a', '#48426c', '#5a527e']);
  repaint(palette, HAZE, ['#242242', '#2e2c50', '#3a3860', '#484670']);
  return palette;
}

function duskRain(): Rgba[] {
  const palette = soaked({ glow: rgba('#785c74'), shadow: rgba('#242644') });
  repaint(palette, SKY, [
    '#202444',
    '#2a2a4e',
    '#363056',
    '#44365e',
    '#543e64',
    '#664668',
    '#7a506a',
    '#8e5a6a',
    '#a46668',
  ]);
  repaint(palette, CLOUD, ['#3a2e50', '#4e385a', '#644462', '#7c5268']);
  repaint(palette, HAZE, ['#2c2648', '#382e52', '#46385c', '#564266']);
  repaint(palette, TOWER, ['#1e1c36', '#282442', '#342e50', '#423a60', '#524872']);
  return palette;
}

function fog(): Rgba[] {
  const lit = new Set([...LIT, ...MIST]);
  const far = new Set([SKY, CLOUD, HAZE, TOWER, WINDOW.slice(0, 1)].flat());
  const fogColor = rgba('#383c56');
  return PALETTE.map((color, slot) => {
    if (slot === 0 || lit.has(slot)) return color;
    return mix(color, fogColor, far.has(slot) ? 0.62 : 0.22);
  });
}

export const ROOFTOP_ATMOSPHERES: readonly StageAtmosphere[] = [
  { atmosphere: { moment: 'midnight', weather: 'clear' }, palette: PALETTE },
  { atmosphere: { moment: 'midnight', weather: 'rain' }, palette: midnightRain() },
  { atmosphere: { moment: 'dusk', weather: 'rain' }, palette: duskRain() },
  { atmosphere: { moment: 'midnight', weather: 'fog' }, palette: fog() },
];
