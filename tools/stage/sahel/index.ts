/**
 * Sahel Sunset (docs/art/decor-sahel.md): the market street's illustration is hand-drawn in
 * art-src/sahel/ (far and floor); the code animates its lamps, the laundry on the line, the birds
 * crossing the sunset and the dust on the road. The stage is indexed at the fighters' grain,
 * without a middle layer.
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

const LAMP: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 246, b: 206, a: 70 },
  { r: 255, g: 220, b: 140, a: 105 },
  { r: 255, g: 178, b: 86, a: 145 },
  { r: 255, g: 248, b: 218, a: 225 },
];

const CLOTH: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 236, b: 188, a: 70 },
  { r: 255, g: 214, b: 142, a: 105 },
  { r: 255, g: 190, b: 112, a: 145 },
];

const BIRD: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 52, g: 30, b: 26, a: 215 },
  { r: 84, g: 44, b: 34, a: 190 },
  { r: 124, g: 66, b: 46, a: 150 },
];

const DUST: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 240, b: 196, a: 55 },
  { r: 255, g: 218, b: 148, a: 80 },
  { r: 255, g: 194, b: 112, a: 110 },
  { r: 255, g: 248, b: 218, a: 140 },
];

/** The laundry on the line, in far-image pixels: one shimmer per cloth. */
const CLOTHES: readonly (readonly [x: number, y: number, width: number])[] = [
  [282, 150, 10],
  [302, 146, 11],
  [318, 148, 9],
  [334, 144, 18],
  [362, 148, 15],
  [384, 152, 10],
];

interface LampSpec {
  readonly name: string;
  /** Its bulb, in far-image pixels. */
  readonly x: number;
  readonly y: number;
  /** Its halo's base radius, in far-image pixels. */
  readonly size: number;
  /** Its place in the slow breath, so the lamps do not pulse together. */
  readonly phase: number;
}

const LAMPS: readonly LampSpec[] = [
  { name: 'lamp-awning', x: 124, y: 264, size: 9, phase: 0 },
  { name: 'lamp-street', x: 595, y: 203, size: 12, phase: 2 },
  { name: 'lamp-lane', x: 705, y: 262, size: 6, phase: 4 },
  { name: 'lamp-high', x: 1062, y: 73, size: 13, phase: 3 },
];

function hash(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

/** One street lamp breathes, slowly, never a flash. */
function lampFrame(
  frame: number,
  spec: LampSpec,
  width: number,
  height: number,
): ReturnType<typeof imageOf> {
  const canvas = new Canvas(width, height);
  if (frame > 0) {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const phase = (frame + spec.phase) % 6;
    const breathe = phase < 3 ? phase : 5 - phase;
    const rx = spec.size + breathe * 2;
    const ry = Math.max(3, Math.round(rx * 0.62));
    canvas.ellipse(cx - rx, cy - ry, rx * 2, ry * 2, 1);
    canvas.ellipse(
      cx - Math.round(rx * 0.55),
      cy - Math.round(ry * 0.55),
      Math.round(rx * 1.1),
      Math.round(ry * 1.1),
      2,
    );
    canvas.ellipse(
      cx - Math.round(rx * 0.26),
      cy - Math.round(ry * 0.26),
      Math.round(rx * 0.52),
      Math.round(ry * 0.52),
      3,
    );
    canvas.fill(cx - 2, cy - 2, 4, 4, 4);
  }
  return imageOf(canvas, LAMP);
}

function lampProp(spec: LampSpec): CodeProp {
  const reach = spec.size + 7;
  const width = reach * 2 + 1;
  const height = reach * 2 + 1;
  return {
    name: spec.name,
    layer: 'far',
    rect: { x: spec.x - reach, y: spec.y - reach, width, height },
    timeline: [
      [1, 45],
      [2, 45],
      [3, 45],
      [4, 45],
      [5, 45],
      [6, 45],
    ],
    frames: Array.from({ length: 7 }, (_, frame) => lampFrame(frame, spec, width, height)),
    overlay: true,
  };
}

/** A warm rim travels along the hanging clothes, a breath of wind. */
function laundryFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(140, 75);
  if (frame > 0) {
    for (let cloth = 0; cloth < CLOTHES.length; cloth++) {
      const [x, y, width] = CLOTHES[cloth] ?? [0, 0, 0];
      const sway = (hash(cloth * 13 + frame) > 0.5 ? 1 : -1) * (1 + (frame % 2));
      const left = x - 265 + sway;
      const top = y - 120 + Math.round(hash(cloth * 17 + frame) * 3);
      canvas.fill(left, top, Math.max(2, width - 3), 1, 1 + (cloth % 2));
      canvas.fill(left + 1, top + 1, Math.max(1, width - 6), 1, 3);
    }
  }
  return imageOf(canvas, CLOTH);
}

/** A small flock crosses the sunset, wings up, wings down. */
function birdFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(600, 120);
  if (frame > 0) {
    for (let bird = 0; bird < 8; bird++) {
      const x = 18 + Math.floor(hash(bird * 19) * 560);
      const y = 12 + Math.floor(hash(bird * 23) * 92);
      const size = 3 + Math.floor(hash(bird * 29) * 3);
      const lift = frame === 1 ? -size : size;
      const color = 1 + Math.floor(hash(bird * 31) * 3);
      canvas.line(x - size, y + Math.round(lift * 0.7), x, y, color);
      canvas.line(x, y, x + size, y + Math.round(lift * 0.7), color);
      canvas.set(x, y - 1, color);
    }
  }
  return imageOf(canvas, BIRD);
}

/** Golden dust drifts over the road, low and slow. */
function dustFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(960, 72);
  if (frame > 0) {
    for (let mote = 0; mote < 48; mote++) {
      const drift = Math.round(hash(mote * 41 + frame) * 3) - 1;
      const x = Math.floor(hash(mote * 37) * 950) + drift + frame;
      const y = Math.floor(hash(mote * 43) * 68) + (frame % 3) - 1;
      const color = 1 + Math.floor(hash(mote * 47 + frame) * 4);
      canvas.set(x % 960, Math.max(0, Math.min(71, y)), color);
      if (hash(mote * 53 + frame) > 0.72) canvas.set((x + 1) % 960, y, color);
    }
  }
  return imageOf(canvas, DUST);
}

const LAUNDRY: CodeProp = {
  name: 'laundry',
  layer: 'far',
  rect: { x: 265, y: 120, width: 140, height: 75 },
  timeline: [
    [1, 24],
    [2, 24],
    [3, 24],
    [4, 24],
  ],
  frames: Array.from({ length: 5 }, (_, frame) => laundryFrame(frame)),
  overlay: true,
};

const BIRDS: CodeProp = {
  name: 'birds',
  layer: 'far',
  rect: { x: 300, y: 30, width: 600, height: 120 },
  timeline: Array.from({ length: 40 }, (_, flap): [number, number] => [1 + (flap % 2), 10]),
  frames: Array.from({ length: 3 }, (_, frame) => birdFrame(frame)),
  drift: { from: -900, to: 900, start: 0, steps: 400 },
  overlay: true,
};

const ROAD_DUST: CodeProp = {
  name: 'dust',
  layer: 'floor',
  rect: { x: 480, y: 4, width: 960, height: 72 },
  timeline: [
    [1, 40],
    [2, 40],
    [3, 40],
    [4, 40],
    [5, 40],
  ],
  frames: Array.from({ length: 6 }, (_, frame) => dustFrame(frame)),
  overlay: true,
};

let drawn: CodeStage | undefined;

export function drawSahel(): CodeStage {
  drawn ??= {
    layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') },
    props: [...LAMPS.map(lampProp), LAUNDRY, BIRDS, ROAD_DUST],
  };
  return drawn;
}

export const SAHEL: CodeMap = {
  name: 'sahel',
  draw: drawSahel,
  atmospheres: [{ atmosphere: { moment: 'dusk', weather: 'clear' }, palette: [BLANK] }],
  noMid: true,
};
