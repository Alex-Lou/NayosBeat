/**
 * Sunset Beam (docs/art/decor-sunset.md): the beach bar's illustration is hand-drawn in
 * art-src/sunset/ (far and floor); the code animates its string lights, torches, equalizer and
 * the sun's reflection. The stage is indexed at the fighters' grain, without a middle layer.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';

const BLANK: Rgba = { r: 0, g: 0, b: 0, a: 0 };

function blank(name: 'far' | 'mid' | 'floor') {
  const { width, height } = sizeOf(name);
  return imageOf(new Canvas(width, height), [BLANK]);
}

const STRING: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 246, b: 190, a: 110 },
  { r: 255, g: 214, b: 110, a: 170 },
  { r: 255, g: 166, b: 70, a: 220 },
  { r: 255, g: 232, b: 150, a: 150 },
];

const TORCH: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 246, b: 200, a: 210 },
  { r: 255, g: 206, b: 90, a: 230 },
  { r: 255, g: 130, b: 40, a: 220 },
  { r: 210, g: 62, b: 52, a: 160 },
];

const EQUALIZER: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 120, g: 244, b: 255, a: 230 },
  { r: 40, g: 190, b: 235, a: 230 },
  { r: 255, g: 86, b: 190, a: 230 },
  { r: 240, g: 248, b: 255, a: 230 },
];

const SHIMMER: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 246, b: 190, a: 180 },
  { r: 255, g: 214, b: 110, a: 150 },
  { r: 255, g: 180, b: 90, a: 110 },
];

function hash(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

function stringFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(1200, 90);
  if (frame > 0) {
    for (let bulb = 0; bulb < 38; bulb++) {
      const x = 20 + Math.floor(hash(bulb * 17) * 1160);
      const y = 8 + Math.floor(hash(bulb * 23) * 58);
      const glow = 1 + Math.floor(hash(bulb * 31 + frame) * 4);
      canvas.fill(x, y, 2, 3, glow);
      if (hash(bulb * 37 + frame) > 0.75) canvas.fill(x - 2, y - 1, 6, 5, 1);
    }
  }
  return imageOf(canvas, STRING);
}

function torchFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(780, 120);
  if (frame > 0) {
    for (let torch = 0; torch < 11; torch++) {
      const x = 22 + Math.floor(hash(torch * 41) * 740);
      const y = 70 + Math.floor(hash(torch * 43) * 18);
      const height = 8 + Math.floor(hash(torch * 47 + frame) * 18);
      const color = 1 + Math.floor(hash(torch * 53 + frame) * 4);
      canvas.fill(x, y - height, 3, height, 2);
      canvas.fill(x + 1, y - height - 3, 2, 4, color);
      if (hash(torch * 59 + frame) > 0.6) canvas.fill(x - 2, y - 4, 7, 3, 3);
    }
  }
  return imageOf(canvas, TORCH);
}

function equalizerFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(170, 95);
  if (frame > 0) {
    for (let bar = 0; bar < 15; bar++) {
      const height = 10 + Math.floor(hash(bar * 61 + frame) * 62);
      const color = bar % 3 === 0 ? 1 : bar % 3 === 1 ? 2 : 3;
      canvas.fill(8 + bar * 10, 86 - height, 7, height, color);
      if (bar % 4 === 0) canvas.fill(8 + bar * 10, 86 - height, 7, 2, 4);
    }
  }
  return imageOf(canvas, EQUALIZER);
}

function shimmerFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(320, 100);
  if (frame > 0) {
    for (let glint = 0; glint < 18; glint++) {
      const x = Math.floor(hash(glint * 67 + frame) * 320);
      const y = 20 + Math.floor(hash(glint * 71 + frame * 3) * 70);
      const width = 3 + Math.floor(hash(glint * 73 + frame) * 10);
      canvas.fill(x, y, width, 1, 1 + Math.floor(hash(glint * 79 + frame) * 3));
    }
  }
  return imageOf(canvas, SHIMMER);
}

const STRING_LIGHTS: CodeProp = {
  name: 'string-lights',
  layer: 'far',
  rect: { x: 0, y: 0, width: 1200, height: 90 },
  timeline: [
    [1, 30],
    [2, 30],
    [3, 30],
    [4, 30],
  ],
  frames: Array.from({ length: 5 }, (_, frame) => stringFrame(frame)),
  overlay: true,
};

const TORCHES: CodeProp = {
  name: 'torches',
  layer: 'far',
  rect: { x: 220, y: 230, width: 780, height: 120 },
  timeline: [
    [1, 15],
    [2, 15],
    [3, 15],
    [4, 15],
  ],
  frames: Array.from({ length: 5 }, (_, frame) => torchFrame(frame)),
  overlay: true,
};

const DECK: CodeProp = {
  name: 'equalizer',
  layer: 'far',
  rect: { x: 5, y: 260, width: 170, height: 95 },
  timeline: [
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 6],
    [5, 6],
    [6, 6],
  ],
  frames: Array.from({ length: 7 }, (_, frame) => equalizerFrame(frame)),
  overlay: true,
};

const SUN: CodeProp = {
  name: 'sun-shimmer',
  layer: 'far',
  rect: { x: 480, y: 170, width: 320, height: 100 },
  timeline: [
    [1, 24],
    [2, 24],
    [3, 24],
    [4, 24],
  ],
  frames: Array.from({ length: 5 }, (_, frame) => shimmerFrame(frame)),
  overlay: true,
};

let drawn: CodeStage | undefined;

export function drawSunset(): CodeStage {
  drawn ??= {
    layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') },
    props: [STRING_LIGHTS, TORCHES, DECK, SUN],
  };
  return drawn;
}

export const SUNSET: CodeMap = {
  name: 'sunset',
  draw: drawSunset,
  atmospheres: [{ atmosphere: { moment: 'dusk', weather: 'clear' }, palette: [BLANK] }],
  noMid: true,
};
