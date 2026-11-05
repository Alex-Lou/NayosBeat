/**
 * Chinatown (docs/art/decor-chinatown.md): the illustration's true layers are hand-drawn in
 * art-src/chinatown/ (far and floor); the code adds the waterfall, the lanterns and the fireflies
 * laid over them. The stage is indexed, at the game's grain, so it sits under the fighters instead
 * of competing with them.
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

const WATER: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 255, b: 255, a: 220 },
  { r: 190, g: 236, b: 238, a: 210 },
  { r: 118, g: 195, b: 205, a: 200 },
  { r: 60, g: 138, b: 160, a: 190 },
];

const LANTERN: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 236, b: 170, a: 70 },
  { r: 255, g: 196, b: 90, a: 110 },
  { r: 255, g: 224, b: 140, a: 180 },
  { r: 255, g: 246, b: 210, a: 220 },
];

const FIREFLY: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 244, b: 170, a: 230 },
  { r: 188, g: 240, b: 130, a: 210 },
  { r: 120, g: 210, b: 120, a: 180 },
];

function hash(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

/** The fall, frame 0 clear; the base image keeps the water's colour. */
function waterfallFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(80, 170);
  if (frame > 0) {
    for (let streak = 0; streak < 16; streak++) {
      const x = 10 + Math.floor(hash(streak * 7 + frame) * 58);
      const y = 6 + Math.floor(hash(streak * 11 + frame * 3) * 120);
      const height = 12 + Math.floor(hash(streak * 13 + frame * 5) * 28);
      const color = 1 + Math.floor(hash(streak * 17 + frame) * 4);
      canvas.fill(x, y, 2, height, color);
      canvas.set(x, y + height, 1);
    }
    for (let splash = 0; splash < 12; splash++) {
      const x = 12 + Math.floor(hash(splash * 19 + frame) * 52);
      const y = 146 + Math.floor(hash(splash * 23 + frame) * 14);
      canvas.fill(x, y, 2, 1, 1 + Math.floor(hash(splash * 29 + frame) * 3));
    }
  }
  return imageOf(canvas, WATER);
}

/** The two stone lanterns: a slow, warm breath, never a flash. */
function lanternFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(250, 130);
  if (frame > 0) {
    for (const [x, y] of [
      [35, 58],
      [214, 58],
    ] as const) {
      const glow = 1 + (frame % 4);
      canvas.fill(x - 8, y - 8, 16, 16, glow);
      canvas.fill(x - 4, y - 4, 8, 8, 4);
      canvas.fill(x - 2, y - 2, 4, 4, 4);
    }
  }
  return imageOf(canvas, LANTERN);
}

/** The fireflies drift across the water and the trees. */
function fireflyFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(520, 320);
  if (frame > 0) {
    for (let dot = 0; dot < 34; dot++) {
      const x = Math.floor(hash(dot * 31 + frame) * 520);
      const y = Math.floor(hash(dot * 37 + frame * 13) * 320);
      const color = 1 + Math.floor(hash(dot * 41 + frame) * 3);
      canvas.set(x, y, color);
      if (hash(dot * 43 + frame) > 0.7) canvas.set(x + 1, y, color);
    }
  }
  return imageOf(canvas, FIREFLY);
}

const WATERFALL: CodeProp = {
  name: 'waterfall',
  layer: 'far',
  rect: { x: 116, y: 268, width: 80, height: 170 },
  timeline: [
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 6],
    [5, 6],
    [6, 6],
  ],
  frames: Array.from({ length: 7 }, (_, frame) => waterfallFrame(frame)),
  overlay: true,
};

const LANTERNS: CodeProp = {
  name: 'lanterns',
  layer: 'far',
  rect: { x: 630, y: 278, width: 250, height: 130 },
  timeline: [
    [1, 50],
    [2, 50],
    [3, 50],
    [4, 50],
  ],
  frames: Array.from({ length: 5 }, (_, frame) => lanternFrame(frame)),
  overlay: true,
};

const FIREFLIES: CodeProp = {
  name: 'fireflies',
  layer: 'far',
  rect: { x: 80, y: 120, width: 520, height: 320 },
  timeline: [
    [1, 40],
    [2, 40],
    [3, 40],
    [4, 40],
    [5, 40],
    [6, 40],
  ],
  frames: Array.from({ length: 7 }, (_, frame) => fireflyFrame(frame)),
  drift: { from: -520, to: 520, start: 0, steps: 240 },
  overlay: true,
};

let drawn: CodeStage | undefined;

export function drawChinatown(): CodeStage {
  drawn ??= {
    layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') },
    props: [WATERFALL, LANTERNS, FIREFLIES],
  };
  return drawn;
}

export const CHINATOWN: CodeMap = {
  name: 'chinatown',
  draw: drawChinatown,
  atmospheres: [{ atmosphere: { moment: 'dusk', weather: 'clear' }, palette: [BLANK] }],
  noMid: true,
};
