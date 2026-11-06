/**
 * Sahel Sunset (docs/art/decor-sahel.md): the market street's illustration, turned into pixel art
 * in three planes in art-src/sahel/ (far: the sky; mid: the street; floor: the road, by
 * `adapt.ts`); the code animates the sun, the lamps, the laundry, the birds and the dust.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { crowdProps } from './crowd.ts';
import { drawSahelFloor, FLOOR_PALETTE } from './floor.ts';
import { enlist, imageIn } from './shared.ts';
import { vfxProps } from './vfx.ts';

const BLANK: Rgba = { r: 0, g: 0, b: 0, a: 0 };

function blank(name: 'far' | 'mid' | 'floor') {
  const { width, height } = sizeOf(name);
  return imageOf(new Canvas(width, height), [BLANK]);
}

const LAMP: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 246, b: 206, a: 45 },
  { r: 255, g: 220, b: 140, a: 75 },
  { r: 255, g: 178, b: 86, a: 110 },
];
const LAMP_AT = enlist(LAMP);

const CLOTH: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 236, b: 188, a: 70 },
  { r: 255, g: 214, b: 142, a: 105 },
  { r: 255, g: 190, b: 112, a: 145 },
];
const CLOTH_AT = enlist(CLOTH);

const BIRD: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 52, g: 30, b: 26, a: 215 },
  { r: 84, g: 44, b: 34, a: 190 },
  { r: 124, g: 66, b: 46, a: 150 },
];
const BIRD_AT = enlist(BIRD);

const SUN: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 232, b: 156, a: 18 },
  { r: 255, g: 202, b: 118, a: 32 },
  { r: 255, g: 172, b: 86, a: 48 },
];
const SUN_AT = enlist(SUN);

/**
 * Where a point of the illustration lands in the middle layer, from where it was in the far one
 * (tools/stage/sahel/adapt.ts: the far layer is the illustration at 1200 px wide, the middle one
 * at 1440 px, its top at source row ≈ 66).
 */
function onMid(x: number, y: number): readonly [number, number] {
  const scale = 1440 / 1672;
  const source = 1672 / 1200;
  return [Math.round(x * source * scale), Math.round((y * source - (600 - 460 / scale)) * scale)];
}

/** The laundry on the line, in middle-layer pixels: one shimmer per cloth. */
const CLOTHES: readonly (readonly [x: number, y: number, width: number])[] = (
  [
    [282, 150, 10],
    [302, 146, 11],
    [318, 148, 9],
    [334, 144, 18],
    [362, 148, 15],
    [384, 152, 10],
  ] as const
).map(([x, y, width]) => [...onMid(x, y), Math.round(width * 1.2)] as const);
const LAUNDRY_RECT = { x: 320, y: 96, width: 180, height: 84 } as const;

interface LampSpec {
  readonly name: string;
  /** Its bulb, in middle-layer pixels. */
  readonly x: number;
  readonly y: number;
  /** Its halo's base radius, in middle-layer pixels. */
  readonly size: number;
  /** Its place in the slow breath, so the lamps do not pulse together. */
  readonly phase: number;
}

const LAMPS: readonly LampSpec[] = [
  { name: 'lamp-awning', x: 147, y: 259, size: 11, phase: 0 },
  { name: 'lamp-street', x: 714, y: 186, size: 14, phase: 2 },
  { name: 'lamp-lane', x: 846, y: 257, size: 7, phase: 4 },
  { name: 'lamp-high', x: 1277, y: 25, size: 15, phase: 3 },
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
  }
  return imageIn(canvas, LAMP_AT);
}

function lampProp(spec: LampSpec): CodeProp {
  const reach = spec.size + 7;
  const width = reach * 2 + 1;
  const height = reach * 2 + 1;
  return {
    name: spec.name,
    layer: 'mid',
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
  const canvas = new Canvas(LAUNDRY_RECT.width, LAUNDRY_RECT.height);
  if (frame > 0) {
    for (let cloth = 0; cloth < CLOTHES.length; cloth++) {
      const [x, y, width] = CLOTHES[cloth] ?? [0, 0, 0];
      const sway = (hash(cloth * 13 + frame) > 0.5 ? 1 : -1) * (1 + (frame % 2));
      const left = x - LAUNDRY_RECT.x + sway;
      const top = y - LAUNDRY_RECT.y + Math.round(hash(cloth * 17 + frame) * 3);
      canvas.fill(left, top, Math.max(2, width - 3), 1, 1 + (cloth % 2));
      canvas.fill(left + 1, top + 1, Math.max(1, width - 6), 1, 3);
    }
  }
  return imageIn(canvas, CLOTH_AT);
}

/** A small flock crosses the sunset, wings up, wings down. */
function birdFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(220, 60);
  if (frame > 0) {
    for (let bird = 0; bird < 8; bird++) {
      const x = 10 + Math.floor(hash(bird * 19) * 196);
      const y = 8 + Math.floor(hash(bird * 23) * 44);
      const size = 3 + Math.floor(hash(bird * 29) * 3);
      const lift = frame === 1 ? -size : size;
      const color = 1 + Math.floor(hash(bird * 31) * 3);
      canvas.line(x - size, y + Math.round(lift * 0.7), x, y, color);
      canvas.line(x, y, x + size, y + Math.round(lift * 0.7), color);
      canvas.set(x, y - 1, color);
    }
  }
  return imageIn(canvas, BIRD_AT);
}

/** The sun's breath, behind the street. */
function sunFrame(frame: number): ReturnType<typeof imageOf> {
  const canvas = new Canvas(120, 100);
  if (frame > 0) {
    const pulse = [0, 1, 2, 1][(frame - 1) % 4] ?? 0;
    canvas.ellipse(30 - pulse, 32 - pulse, 60 + pulse * 2, 36 + pulse * 2, 1);
    canvas.ellipse(40, 38, 40, 24, 2);
    canvas.ellipse(50, 44, 20, 12, 3);
  }
  return imageIn(canvas, SUN_AT);
}

const SUN_GLOW: CodeProp = {
  name: 'sun-glow',
  layer: 'far',
  rect: { x: 560, y: 170, width: 120, height: 100 },
  timeline: [
    [1, 60],
    [2, 60],
    [3, 60],
    [4, 60],
  ],
  frames: Array.from({ length: 5 }, (_, frame) => sunFrame(frame)),
  overlay: true,
};

const LAUNDRY: CodeProp = {
  name: 'laundry',
  layer: 'mid',
  rect: LAUNDRY_RECT,
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
  rect: { x: 500, y: 40, width: 220, height: 60 },
  timeline: Array.from({ length: 40 }, (_, flap): [number, number] => [1 + (flap % 2), 10]),
  frames: Array.from({ length: 3 }, (_, frame) => birdFrame(frame)),
  drift: { from: -900, to: 900, start: 0, steps: 400 },
  overlay: true,
};

let drawn: CodeStage | undefined;

export function drawSahel(): CodeStage {
  const floor = sizeOf('floor');
  drawn ??= {
    layers: {
      far: blank('far'),
      mid: blank('mid'),
      floor: imageOf(drawSahelFloor(floor.width, floor.height), FLOOR_PALETTE),
    },
    props: [SUN_GLOW, BIRDS, ...crowdProps(), LAUNDRY, ...LAMPS.map(lampProp), ...vfxProps()],
  };
  return drawn;
}

export const SAHEL: CodeMap = {
  name: 'sahel',
  draw: drawSahel,
  atmospheres: [{ atmosphere: { moment: 'dusk', weather: 'clear' }, palette: FLOOR_PALETTE }],
};
