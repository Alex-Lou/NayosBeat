/**
 * Lomé Carnival (docs/art/decor-carnival.md): the developer's background (issue #155), the
 * abandoned fairground under the storm, drawn whole in art-src/carnival/ (far and floor, in
 * truecolor); `npm run stages` copies it as it is, so the illustration keeps every colour. The
 * code adds the Ferris wheel's lights, the storm's blue flash, the carousel and the puddles over
 * the hand-drawn scene. No middle layer: the scene is a single illustration.
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

const WHEEL: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 240, b: 190, a: 220 },
  { r: 255, g: 176, b: 90, a: 230 },
  { r: 255, g: 80, b: 140, a: 230 },
  { r: 210, g: 90, b: 255, a: 220 },
];

const CAROUSEL: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 230, b: 160, a: 220 },
  { r: 255, g: 150, b: 80, a: 230 },
  { r: 255, g: 80, b: 150, a: 220 },
];

const PUDDLE: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 190, b: 150, a: 150 },
  { r: 255, g: 80, b: 170, a: 140 },
  { r: 180, g: 120, b: 255, a: 120 },
];

function hash(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

function wheelFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(320, 280);
  if (frame > 0) {
    const cx = 160;
    const cy = 132;
    for (let light = 0; light < 34; light++) {
      const angle = (light / 34) * Math.PI * 2;
      const radius = 130;
      const x = cx + Math.round(Math.cos(angle) * radius);
      const y = cy + Math.round(Math.sin(angle) * radius);
      const color = (light + frame) % 5 === 0 ? 1 : (light + frame) % 3 === 0 ? 3 : 2;
      canvas.fill(x - 1, y - 1, 3, 3, color);
    }
    for (let spoke = 0; spoke < 8; spoke++) {
      const angle = (spoke / 8) * Math.PI * 2;
      canvas.fill(
        cx + Math.round(Math.cos(angle) * 60),
        cy + Math.round(Math.sin(angle) * 74),
        2,
        2,
        (spoke + frame) % 2 === 0 ? 4 : 2,
      );
    }
  }
  return imageOf(canvas, WHEEL);
}

function carouselFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(240, 190);
  if (frame > 0) {
    for (let light = 0; light < 22; light++) {
      const x = 14 + Math.floor(hash(light * 17) * 212);
      const y = 20 + Math.floor(hash(light * 19) * 126);
      const color = (light + frame) % 4 === 0 ? 1 : (light + frame) % 2 === 0 ? 2 : 3;
      canvas.fill(x, y, 2, 2, color);
    }
  }
  return imageOf(canvas, CAROUSEL);
}

function puddleFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(700, 60);
  if (frame > 0) {
    for (let glint = 0; glint < 24; glint++) {
      const x = Math.floor(hash(glint * 23 + frame) * 700);
      const y = Math.floor(hash(glint * 29 + frame * 3) * 60);
      const width = 8 + Math.floor(hash(glint * 31 + frame) * 26);
      canvas.fill(x, y, width, 1, 1 + Math.floor(hash(glint * 37 + frame) * 3));
    }
  }
  return imageOf(canvas, PUDDLE);
}

const FERRIS: CodeProp = {
  name: 'ferris-lights',
  layer: 'far',
  rect: { x: 250, y: 0, width: 320, height: 280 },
  timeline: [
    [1, 10],
    [2, 10],
    [3, 10],
    [4, 10],
    [5, 10],
    [6, 10],
  ],
  frames: Array.from({ length: 7 }, (_, frame) => wheelFrame(frame)),
  overlay: true,
};

const CAROUSEL_LIGHTS: CodeProp = {
  name: 'carousel',
  layer: 'far',
  rect: { x: 675, y: 170, width: 240, height: 190 },
  timeline: [
    [1, 30],
    [2, 30],
    [3, 30],
    [4, 30],
  ],
  frames: Array.from({ length: 5 }, (_, frame) => carouselFrame(frame)),
  overlay: true,
};

const PUDDLES: CodeProp = {
  name: 'puddles',
  layer: 'floor',
  rect: { x: 300, y: 8, width: 700, height: 60 },
  timeline: [
    [1, 30],
    [2, 30],
    [3, 30],
    [4, 30],
  ],
  frames: Array.from({ length: 5 }, (_, frame) => puddleFrame(frame)),
  overlay: true,
};

let drawn: CodeStage | undefined;

export function drawCarnival(): CodeStage {
  drawn ??= {
    layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') },
    props: [FERRIS, CAROUSEL_LIGHTS, PUDDLES],
  };
  return drawn;
}

export const CARNIVAL: CodeMap = {
  name: 'carnival',
  draw: drawCarnival,
  atmospheres: [{ atmosphere: { moment: 'midnight', weather: 'clear' }, palette: [BLANK] }],
  rgba: true,
  noMid: true,
};
