/**
 * Rust Carnival (docs/art/decor-carnival.md): the abandoned fairground's illustration is
 * hand-drawn in art-src/carnival/ (far and floor); the code animates the Ferris wheel's lights,
 * the storm's blue flash, the carousel and the puddles.
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

const BOLT: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 230, g: 246, b: 255, a: 200 },
  { r: 110, g: 190, b: 255, a: 230 },
  { r: 64, g: 110, b: 255, a: 220 },
  { r: 150, g: 100, b: 255, a: 180 },
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
  const canvas = new Canvas(380, 330);
  if (frame > 0) {
    const cx = 190;
    const cy = 165;
    for (let light = 0; light < 34; light++) {
      const angle = (light / 34) * Math.PI * 2;
      const radius = 156;
      const x = cx + Math.round(Math.cos(angle) * radius);
      const y = cy + Math.round(Math.sin(angle) * radius);
      const color = (light + frame) % 5 === 0 ? 1 : (light + frame) % 3 === 0 ? 3 : 2;
      canvas.fill(x - 1, y - 1, 3, 3, color);
    }
    for (let spoke = 0; spoke < 8; spoke++) {
      const angle = (spoke / 8) * Math.PI * 2;
      canvas.fill(
        cx + Math.round(Math.cos(angle) * 74),
        cy + Math.round(Math.sin(angle) * 74),
        2,
        2,
        (spoke + frame) % 2 === 0 ? 4 : 2,
      );
    }
  }
  return imageOf(canvas, WHEEL);
}

function boltFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(220, 180);
  if (frame > 0) {
    const random = [0, 1, 2, 3][frame - 1] ?? 0;
    let x = 90;
    let y = 12;
    canvas.fill(x, y, 3, 10, random > 0 ? 1 : 2);
    for (let step = 0; step < 8; step++) {
      x += Math.round(hash(step * 13 + random) * 28) - 14;
      y += 18;
      canvas.fill(x, y, random > 1 ? 4 : 2, 10, random > 1 ? 1 : 2);
      if (step % 2 === 0) canvas.fill(x - 8, y + 4, 9, 2, 3);
    }
    canvas.fill(84, 150, 34, 2, 2);
    if (random > 1) canvas.fill(120, 128, 24, 2, 4);
  }
  return imageOf(canvas, BOLT);
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
  rect: { x: 150, y: 0, width: 380, height: 330 },
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

const STORM: CodeProp = {
  name: 'storm',
  layer: 'far',
  rect: { x: 600, y: 0, width: 220, height: 180 },
  timeline: [
    [0, 480],
    [1, 3],
    [2, 3],
    [3, 3],
    [0, 120],
  ],
  frames: Array.from({ length: 4 }, (_, frame) => boltFrame(frame)),
  overlay: true,
};

const CAROUSEL_LIGHTS: CodeProp = {
  name: 'carousel',
  layer: 'far',
  rect: { x: 740, y: 180, width: 240, height: 190 },
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
    props: [FERRIS, STORM, CAROUSEL_LIGHTS, PUDDLES],
  };
  return drawn;
}

export const CARNIVAL: CodeMap = {
  name: 'carnival',
  draw: drawCarnival,
  atmospheres: [{ atmosphere: { moment: 'midnight', weather: 'clear' }, palette: [BLANK] }],
  noMid: true,
};
