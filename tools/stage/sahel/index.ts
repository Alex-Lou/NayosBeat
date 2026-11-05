/**
 * Sahel Sunset (docs/art/decor-sahel.md): the market street's illustration is hand-drawn in
 * art-src/sahel/ (far and floor); the code animates its lamps and their light, the laundry, the
 * smoke of the stalls, the crowd, the string lights, the birds and the dust. Every animation is
 * drawn on the same 2 × 2 pixel grain as the illustration, so the stage reads as one scene instead
 * of a background with sprites laid over it.
 */

import type { IndexedImage, Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeProp, CodeStage, Rect } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';

/** The illustration's grain: a block is a world pixel, as in `adapt.ts`. */
const BLOCK = 2;
const BLANK: Rgba = { r: 0, g: 0, b: 0, a: 0 };

function blank(name: 'far' | 'mid' | 'floor') {
  const { width, height } = sizeOf(name);
  return imageOf(new Canvas(width, height), [BLANK]);
}

/** A block canvas, enlarged to the image's 2 × 2 grain. */
function blockImageOf(blocks: Canvas, palette: readonly Rgba[]): IndexedImage {
  const canvas = new Canvas(blocks.width * BLOCK, blocks.height * BLOCK);
  for (let y = 0; y < blocks.height; y++) {
    for (let x = 0; x < blocks.width; x++) {
      const slot = blocks.get(x, y);
      if (slot !== 0) canvas.fill(x * BLOCK, y * BLOCK, BLOCK, BLOCK, slot);
    }
  }
  return imageOf(canvas, palette);
}

interface PropSpec {
  readonly name: string;
  readonly layer: 'far' | 'floor';
  /** In image pixels; every side even, the grain's. */
  readonly rect: Rect;
  readonly palette: readonly Rgba[];
  /** How many frames, frame 0 clear. */
  readonly frames: number;
  readonly timeline: readonly (readonly [frame: number, steps: number])[];
  readonly draw: (frame: number, canvas: Canvas) => void;
  readonly drift?: CodeProp['drift'];
}

function blockProp(spec: PropSpec): CodeProp {
  const { rect } = spec;
  if (rect.x % BLOCK !== 0 || rect.y % BLOCK !== 0) {
    throw new Error(`${spec.name}: its rect must start on the grain (${BLOCK} px)`);
  }
  if (rect.width % BLOCK !== 0 || rect.height % BLOCK !== 0) {
    throw new Error(`${spec.name}: its rect must be a whole number of blocks`);
  }
  const width = rect.width / BLOCK;
  const height = rect.height / BLOCK;
  return {
    name: spec.name,
    layer: spec.layer,
    rect,
    timeline: spec.timeline,
    frames: Array.from({ length: spec.frames }, (_, frame) => {
      const canvas = new Canvas(width, height);
      if (frame > 0) spec.draw(frame, canvas);
      return blockImageOf(canvas, spec.palette);
    }),
    ...(spec.drift ? { drift: spec.drift } : {}),
    overlay: true,
  };
}

const LAMP: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 242, b: 198, a: 20 },
  { r: 255, g: 216, b: 140, a: 40 },
  { r: 255, g: 178, b: 86, a: 70 },
  { r: 255, g: 248, b: 220, a: 220 },
];

const STRING_LIGHT: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 34, g: 22, b: 18, a: 200 },
  { r: 255, g: 210, b: 128, a: 45 },
  { r: 255, g: 232, b: 170, a: 170 },
  { r: 255, g: 250, b: 214, a: 225 },
];

const SMOKE: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 228, g: 208, b: 194, a: 55 },
  { r: 206, g: 184, b: 172, a: 85 },
  { r: 180, g: 158, b: 150, a: 115 },
  { r: 132, g: 116, b: 112, a: 75 },
];

const CLOTH: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 236, b: 188, a: 90 },
  { r: 255, g: 206, b: 130, a: 120 },
  { r: 74, g: 44, b: 36, a: 120 },
];

const BIRD: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 52, g: 30, b: 26, a: 215 },
  { r: 84, g: 44, b: 34, a: 190 },
  { r: 124, g: 66, b: 46, a: 150 },
];

const CROWD: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 24, g: 15, b: 14, a: 255 },
  { r: 48, g: 29, b: 24, a: 255 },
  { r: 150, g: 92, b: 58, a: 190 },
  { r: 224, g: 152, b: 92, a: 150 },
];

const DUST: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 240, b: 196, a: 55 },
  { r: 255, g: 218, b: 148, a: 80 },
  { r: 255, g: 194, b: 112, a: 110 },
  { r: 255, g: 248, b: 218, a: 140 },
];

const SUN: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 232, b: 156, a: 18 },
  { r: 255, g: 202, b: 118, a: 32 },
  { r: 255, g: 172, b: 86, a: 48 },
];

/** The laundry on the line, in far-image pixels: one hem per cloth. */
const CLOTHES: readonly (readonly [x: number, bottom: number, width: number])[] = [
  [282, 176, 10],
  [302, 181, 11],
  [318, 179, 9],
  [334, 185, 18],
  [362, 181, 15],
  [384, 181, 10],
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
  /** Where its light lands on the far road, in far-image pixels; none: halo only. */
  readonly ground?: number;
}

const LAMPS: readonly LampSpec[] = [
  { name: 'lamp-awning', x: 124, y: 264, size: 9, phase: 0, ground: 404 },
  { name: 'lamp-street', x: 596, y: 204, size: 12, phase: 2, ground: 422 },
  { name: 'lamp-lane', x: 704, y: 262, size: 6, phase: 4, ground: 422 },
  { name: 'lamp-high', x: 1062, y: 72, size: 13, phase: 3 },
];

function hash(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

/** One street lamp breathes, slowly, and lays its pool on the road; never a flash. */
function lampFrame(frame: number, spec: LampSpec, rect: Rect, canvas: Canvas): void {
  const cx = Math.round((spec.x - rect.x) / BLOCK);
  const cy = Math.round((spec.y - rect.y) / BLOCK);
  const phase = (frame + spec.phase) % 6;
  const breathe = phase < 3 ? phase : 5 - phase;
  const rx = Math.max(3, Math.round(spec.size / BLOCK) + breathe);
  const ry = Math.max(2, Math.round(rx * 0.62));
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
  if (spec.ground === undefined) return;
  const ground = Math.round((spec.ground - rect.y) / BLOCK);
  const poolWidth = Math.max(6, Math.round(spec.size / BLOCK) + breathe) * 2;
  canvas.ellipse(cx - poolWidth / 2, ground - 4, poolWidth, 4, 2);
  canvas.ellipse(cx - poolWidth / 4, ground - 3, poolWidth / 2, 2, 3);
}

function lampProp(spec: LampSpec): CodeProp {
  let reach = spec.size + 8;
  if (reach % 2 !== 0) reach += 1;
  const bottom = spec.ground ?? spec.y + reach;
  const rect: Rect = {
    x: spec.x - reach,
    y: spec.y - reach,
    width: reach * 2,
    height: bottom - (spec.y - reach),
  };
  return blockProp({
    name: spec.name,
    layer: 'far',
    rect,
    palette: LAMP,
    frames: 7,
    timeline: [
      [1, 45],
      [2, 45],
      [3, 45],
      [4, 45],
      [5, 45],
      [6, 45],
    ],
    draw: (frame, canvas) => {
      lampFrame(frame, spec, rect, canvas);
    },
  });
}

/** The wire and its bulbs over the street, one bulb after another. */
function stringFrame(frame: number, canvas: Canvas): void {
  const width = canvas.width;
  const height = canvas.height;
  const sag = Math.round(height * 0.3);
  const top = 6;
  for (let x = 0; x < width; x++) {
    const t = x / Math.max(1, width - 1);
    const y = Math.round(top + Math.sin(t * Math.PI) * sag);
    canvas.set(x, y, 1);
    if ((x & 1) === 0) canvas.set(x, y + 1, 1);
  }
  for (let bulb = 0; bulb < 16; bulb++) {
    const t = (bulb + 0.5) / 16;
    const x = Math.round(t * (width - 1));
    const y = Math.round(top + Math.sin(t * Math.PI) * sag);
    const bright = (bulb + frame) % 5 === 0 ? 4 : 3;
    canvas.fill(x - 1, y + 1, 2, 3, 2);
    canvas.fill(x, y + 1, 1, 2, bright);
    if ((bulb + frame) % 3 === 0) canvas.fill(x - 2, y + 2, 5, 3, 1);
  }
}

/** A plume of cooking smoke, rising and drifting. */
function smokeFrame(
  frame: number,
  canvas: Canvas,
  baseX: number,
  baseY: number,
  wind: number,
): void {
  for (let wisp = 0; wisp < 14; wisp++) {
    const phase = (frame + wisp * 0.6) % 6;
    const rise = phase * 12 + (wisp % 3) * 5;
    const sway = Math.round(Math.sin((phase / 6 + wisp * 0.19) * Math.PI * 2) * 3);
    const x = Math.round(baseX + wind * rise * 0.14) + sway;
    const y = Math.round(baseY - rise);
    if (y < 2) continue;
    const width = 3 + (phase > 2 ? 1 : 0) + (wisp % 2);
    const height = 2 + (wisp % 2);
    const slot = phase > 4 ? 1 : phase > 2 ? 2 : 3;
    canvas.fill(x, y, width, height, slot);
    canvas.set(x - 1, y + 1, 1);
    if (phase < 3) canvas.set(x + width, y - 1, 2);
    if (wisp % 4 === 0) canvas.set(x + 1, y + height, 4);
  }
}

/** A person of the foreground crowd: a dark silhouette with a warm rim, breathing with the others. */
function person(canvas: Canvas, x: number, feet: number, height: number, arm: boolean): void {
  const headY = feet - height;
  const bodyTop = headY + 4;
  const bodyHeight = height - 10;
  canvas.fill(x - 3, bodyTop, 6, bodyHeight, 2);
  canvas.fill(x - 4, bodyTop + 1, 8, 3, 2);
  canvas.fill(x - 2, headY, 4, 4, 2);
  canvas.fill(x - 3, feet - 6, 2, 6, 1);
  canvas.fill(x + 1, feet - 6, 2, 6, 1);
  canvas.fill(x - 4, bodyTop + 1, 1, bodyHeight, 3);
  canvas.fill(x - 2, headY, 1, 4, 4);
  if (!arm) return;
  const armX = x + 4;
  const armY = bodyTop + 1;
  canvas.fill(armX, armY - 5, 1, 5, 2);
  canvas.fill(armX - 1, armY - 7, 3, 2, 2);
  canvas.set(armX, armY - 7, 4);
}

/** The crowd in front of the stalls: a slow bob, a few raised arms. */
function crowdFrame(frame: number, canvas: Canvas): void {
  const people: readonly (readonly [x: number, feet: number, height: number, phase: number])[] = [
    [30, 62, 21, 0],
    [58, 63, 25, 2],
    [86, 61, 19, 1],
    [114, 63, 27, 3],
    [142, 62, 23, 4],
  ];
  for (const [x, feet, height, phase] of people) {
    const offset = [0, 1, 0, -1, 0][(frame + phase) % 5] ?? 0;
    person(canvas, x, feet + offset, height, (frame + phase) % 4 === 0);
  }
  const arms = [10, 44, 78, 112, 150, 188];
  for (let i = 0; i < arms.length; i++) {
    const x = arms[i] ?? 0;
    const phase = (frame + i) % 4;
    const raise = phase === 0 ? 0 : phase === 2 ? 2 : 1;
    const top = 6 - raise;
    canvas.fill(x, top, 1, 6 + raise, 1);
    canvas.fill(x - 1, top - 1, 3, 2, 2);
    canvas.set(x, top, 3);
  }
}

/** A warm rim travels along the hanging clothes, and their hems answer the wind. */
function laundryFrame(frame: number, canvas: Canvas): void {
  const sway = [0, 1, 0, -1][(frame - 1) % 4] ?? 0;
  for (let cloth = 0; cloth < CLOTHES.length; cloth++) {
    const [x, bottom, width] = CLOTHES[cloth] ?? [0, 0, 0];
    const left = Math.round((x - 264) / BLOCK) + sway;
    const hem = Math.round((bottom - 118) / BLOCK);
    const blocks = Math.max(2, Math.round(width / BLOCK));
    canvas.fill(left, hem, blocks, 1, 2);
    canvas.fill(left + (sway > 0 ? 0 : 1), hem + 1, Math.max(1, blocks - 1), 1, 3);
    canvas.fill(left, hem - 2, Math.max(1, blocks - 2), 1, 1);
  }
}

/** A small flock crosses the sunset, wings up, wings down. */
function birdFrame(frame: number, canvas: Canvas): void {
  for (let bird = 0; bird < 10; bird++) {
    const x = 14 + Math.floor(hash(bird * 19) * 272);
    const y = 8 + Math.floor(hash(bird * 23) * 44);
    const size = 2 + Math.floor(hash(bird * 29) * 3);
    const lift = frame === 1 ? -size : size;
    const color = 1 + Math.floor(hash(bird * 31) * 3);
    canvas.line(x - size, y + Math.round(lift * 0.7), x, y, color);
    canvas.line(x, y, x + size, y + Math.round(lift * 0.7), color);
    canvas.set(x, y - 1, color);
  }
}

/** Golden dust drifts over the road, low and slow. */
function dustFrame(frame: number, canvas: Canvas): void {
  for (let mote = 0; mote < 64; mote++) {
    const drift = Math.round(hash(mote * 41 + frame) * 3) - 1;
    const x = Math.floor(hash(mote * 37) * 476) + drift + frame;
    const y = Math.floor(hash(mote * 43) * 32) + (frame % 3) - 1;
    const color = 1 + Math.floor(hash(mote * 47 + frame) * 4);
    const px = x % 480;
    canvas.set(px, Math.max(0, Math.min(35, y)), color);
    if (hash(mote * 53 + frame) > 0.74) {
      canvas.set((x + 1) % 480, y, color);
      canvas.set(px, Math.max(0, Math.min(35, y + 1)), color);
    }
  }
  // A few heavier puffs near the ground, where the fight kicks the road.
  for (let puff = 0; puff < 5; puff++) {
    const x = (60 + puff * 88 + frame * 2) % 480;
    const y = 29 + (puff % 3);
    canvas.fill(x, y, 3, 2, 2 + (puff % 2));
    canvas.set(x + 3, y - 1, 1);
  }
}

/** The sun's breath, behind the street. */
function sunFrame(frame: number, canvas: Canvas): void {
  const pulse = [0, 1, 2, 1][(frame - 1) % 4] ?? 0;
  const cx = Math.round(canvas.width / 2);
  const cy = Math.round(canvas.height / 2);
  canvas.ellipse(cx - 19 - pulse, cy - 10 - pulse, (19 + pulse) * 2, (10 + pulse) * 2, 1);
  canvas.ellipse(cx - 13, cy - 7, 26, 14, 2);
  canvas.ellipse(cx - 7, cy - 4, 14, 8, 3);
}

const SUN_GLOW = blockProp({
  name: 'sun-glow',
  layer: 'far',
  rect: { x: 560, y: 170, width: 120, height: 100 },
  palette: SUN,
  frames: 5,
  timeline: [
    [1, 60],
    [2, 60],
    [3, 60],
    [4, 60],
  ],
  draw: sunFrame,
});

const STRING_LIGHTS = blockProp({
  name: 'string-lights',
  layer: 'far',
  rect: { x: 160, y: 170, width: 880, height: 60 },
  palette: STRING_LIGHT,
  frames: 5,
  timeline: [
    [1, 30],
    [2, 30],
    [3, 30],
    [4, 30],
  ],
  draw: stringFrame,
});

const SMOKE_LEFT = blockProp({
  name: 'smoke-left',
  layer: 'far',
  rect: { x: 210, y: 60, width: 120, height: 180 },
  palette: SMOKE,
  frames: 7,
  timeline: [
    [1, 40],
    [2, 40],
    [3, 40],
    [4, 40],
    [5, 40],
    [6, 40],
  ],
  draw: (frame, canvas) => {
    smokeFrame(frame, canvas, 35, 88, 1);
  },
});

const SMOKE_RIGHT = blockProp({
  name: 'smoke-right',
  layer: 'far',
  rect: { x: 1080, y: 60, width: 120, height: 180 },
  palette: SMOKE,
  frames: 7,
  timeline: [
    [1, 40],
    [2, 40],
    [3, 40],
    [4, 40],
    [5, 40],
    [6, 40],
  ],
  draw: (frame, canvas) => {
    smokeFrame(frame, canvas, 35, 88, -1);
  },
});

const CROWD_LIFE = blockProp({
  name: 'crowd',
  layer: 'far',
  rect: { x: 500, y: 290, width: 400, height: 130 },
  palette: CROWD,
  frames: 5,
  timeline: [
    [1, 30],
    [2, 30],
    [3, 30],
    [4, 30],
  ],
  draw: crowdFrame,
});

const LAUNDRY = blockProp({
  name: 'laundry',
  layer: 'far',
  rect: { x: 264, y: 118, width: 144, height: 76 },
  palette: CLOTH,
  frames: 5,
  timeline: [
    [1, 30],
    [2, 30],
    [3, 30],
    [4, 30],
  ],
  draw: laundryFrame,
});

const BIRDS = blockProp({
  name: 'birds',
  layer: 'far',
  rect: { x: 300, y: 30, width: 600, height: 120 },
  palette: BIRD,
  frames: 3,
  timeline: Array.from({ length: 40 }, (_, flap): [number, number] => [1 + (flap % 2), 10]),
  draw: birdFrame,
  drift: { from: -900, to: 900, start: 0, steps: 400 },
});

const ROAD_DUST = blockProp({
  name: 'dust',
  layer: 'floor',
  rect: { x: 480, y: 4, width: 960, height: 72 },
  palette: DUST,
  frames: 6,
  timeline: [
    [1, 40],
    [2, 40],
    [3, 40],
    [4, 40],
    [5, 40],
  ],
  draw: dustFrame,
});

let drawn: CodeStage | undefined;

export function drawSahel(): CodeStage {
  drawn ??= {
    layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') },
    props: [
      SUN_GLOW,
      STRING_LIGHTS,
      SMOKE_LEFT,
      SMOKE_RIGHT,
      CROWD_LIFE,
      LAUNDRY,
      BIRDS,
      ...LAMPS.map(lampProp),
      ROAD_DUST,
    ],
  };
  return drawn;
}

export const SAHEL: CodeMap = {
  name: 'sahel',
  draw: drawSahel,
  atmospheres: [{ atmosphere: { moment: 'dusk', weather: 'clear' }, palette: [BLANK] }],
  noMid: true,
};
