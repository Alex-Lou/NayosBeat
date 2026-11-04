/**
 * The middle layer (docs/art/decor-rooftop.md §2.2): the roof behind the fighters, in high-detail
 * pixel art and 3D perspective (docs/art/proprete.md). Every animation the blimp shakes loops over
 * BLIMP_CYCLE, with it (far.ts).
 */

import { Canvas, Mask, at, dithered } from '../kit/canvas.ts';
import { spell } from '../kit/font.ts';
import { lightAt, spill, type Light, type Spill } from '../kit/light.ts';
import { noise, streamOf } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import { CROSSED, drawFigure, HIP, type Figure, type Outfit, type Pose } from '../rue/people.ts';
import { drawTag, drawThrowUp } from '../rue/signs.ts';
import { BLIMP_CYCLE, PASS, PASS_AT } from './far.ts';
import { wetAt } from './floor.ts';
import {
  AVIATION,
  CLOTH,
  CONCRETE,
  CONCRETE_VIOLET,
  EMBER,
  FIGURE_RAMPS,
  HAIR,
  MEMBRANE,
  MEMBRANE_VIOLET,
  MEMBRANE_YELLOW,
  NEON_GREEN,
  NEON_ORANGE,
  NEON_VIOLET,
  NEON_YELLOW,
  PALE,
  REFLECT_VIOLET,
  REFLECT_YELLOW,
  RIM_WARM,
  RUST,
  SODIUM,
  SPRAY_RAMPS,
  STEAM,
  STEEL,
  TAG,
  TANK,
  UMBRELLA,
  WET,
} from './palette.ts';
import { drawSignBack, signLetters } from './signs.ts';

export const BASE = 404;
const PARAPET = 368;
const FLOOR_END = 470;
const BACK_FEET = 414;
const FEET = 428;
const HUT = { left: 48, right: 248, roof: 256, foot: 428 } as const;
const DOOR: Rect = { x: 142, y: 330, width: 42, height: HUT.foot - 330 };
const LAMP = { x: 163, y: 316 } as const;
const NEON = { x: 318, y: 128, scale: 12 } as const;
const TRUSS = { left: 312, right: 716, top: 254 } as const;
const TANK_AT = { cx: 800, top: 192, body: 108, width: 110 } as const;
const UNITS = [
  { x: 878, width: 70 },
  { x: 958, width: 70 },
] as const;
const UNIT = { top: 356, height: FEET - 356 } as const;
const MAST = { x: 1056, top: 236 } as const;
const LUCK = { x: 1096, y: 116, scale: 9, spine: 1136 } as const;
const LINE = { left: 1242, right: 1404, y: 318 } as const;
const DRONE = { x: 700, y: 296 } as const;
const SUBSTATION = { x: 500, y: 372, width: 52, height: 56 } as const;
const TURBINE = { x: 1368, y: 354 } as const;
const PUDDLE_NEON = { x: 364, y: 430, width: 120, height: 14 } as const;
const PUDDLE_LUCK = { x: 1084, y: 430, width: 96, height: 14 } as const;
const DECK_VENT = { x: 638, y: 432 } as const;

const LIGHTS: readonly Light[] = [
  { x: LAMP.x, y: LAMP.y + 8, radius: 135, strength: 1.9, squash: 1 },
  { x: LAMP.x, y: 444, radius: 120, strength: 1.1, squash: 0.35 },
  { x: 516, y: 250, radius: 260, strength: 1.2, squash: 0.7 },
  { x: LUCK.spine, y: 230, radius: 175, strength: 1, squash: 0.9 },
];

const ROOF_SPILLS: readonly Spill[] = [
  {
    light: { x: 516, y: 416, radius: 190, strength: 1, squash: 0.18 },
    twins: [
      [MEMBRANE, MEMBRANE_VIOLET],
      [CONCRETE, CONCRETE_VIOLET],
    ],
  },
  {
    light: { x: LUCK.spine, y: 418, radius: 105, strength: 1, squash: 0.22 },
    twins: [[MEMBRANE, MEMBRANE_YELLOW]],
  },
];

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
}

function hdTone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const step = dithered(fraction, x >> 1, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? 0;
}

function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < BLIMP_CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

export function overhead(step: number): boolean {
  return step >= PASS_AT + PASS * 0.3 && step < PASS_AT + PASS * 0.7;
}

function drawParapet(canvas: Canvas): void {
  const center = canvas.width / 2;
  for (const [rLeft, rRight] of [
    [264, 308],
    [720, 748],
    [1164, 1236],
  ] as const) {
    canvas.hline(rLeft, PARAPET - 16, rRight - rLeft, at(STEEL, 4));
    canvas.hline(rLeft, PARAPET - 9, rRight - rLeft, at(STEEL, 2));
    for (let px = rLeft; px <= rRight; px += 16) {
      canvas.fill(px, PARAPET - 16, 2, 16, at(STEEL, 2));
      canvas.vline(px + 1, PARAPET - 16, 16, at(STEEL, 3));
    }
  }
  canvas.paint(0, PARAPET, canvas.width, BASE - PARAPET, (x, y) => {
    const dy = y - PARAPET;
    const perspX = x - Math.round(((x - center) * dy) / 180);
    const along = ((perspX % 96) + 96) % 96;
    const joint = along < 2;
    const pilaster = along >= 40 && along < 56;
    const lit = lightAt(LIGHTS, x, y) * 0.7;
    if (y === PARAPET) return at(CONCRETE, 6);
    if (y < PARAPET + 6) {
      return hdTone(CONCRETE, 4.2 + lit - (joint ? 1.5 : 0), x, y);
    }
    if (y === PARAPET + 6) return at(CONCRETE, 0);
    const scupper = along > 14 && along < 30 && y > BASE - 7;
    if (scupper) return at(MEMBRANE, 0);
    const pLift = pilaster ? (along < 43 ? 1.2 : along > 53 ? -0.8 : 0.5) : 0;
    const stain = (noise(31, x >> 2, y >> 1, 5) - 0.5) * 0.6;
    return hdTone(CONCRETE, 1.8 + pLift + lit + stain - (joint ? 1 : 0), x, y);
  });
  for (const ry of [PARAPET + 12, PARAPET + 18]) {
    canvas.hline(256, ry, canvas.width - 256, at(STEEL, 3));
    canvas.hline(256, ry + 1, canvas.width - 256, at(STEEL, 0));
  }
}

interface Reflected {
  readonly letters: Mask;
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly stretch: number;
  readonly ramp: readonly number[];
}

function drawMembrane(canvas: Canvas, signs: readonly Reflected[]): void {
  canvas.paint(0, BASE, canvas.width, FLOOR_END - BASE, (x, y) => {
    const fade = Math.max(0, 1 - (y - BASE) / 52);
    const lit = lightAt(LIGHTS, x, y) * 0.85 * fade;
    const wear = (noise(37, x >> 2, y >> 1, 8) - 0.5) * 0.45 * fade;
    const level = 2 + lit + wear;
    const sign = signs.find(({ left, right }) => x >= left && x < right);
    const pooled = sign !== undefined && noise(45, Math.floor(x / 8), Math.floor(y / 4), 6) > 0.38;
    if (!wetAt(41, x, y) && !pooled) {
      return hdTone(MEMBRANE, level, x, y);
    }
    if (sign && y % 3 !== 0) {
      const ripple = Math.round(Math.sin(y * 1.5) * 2);
      const mirrored = Math.round(sign.bottom - (y - BASE) * sign.stretch);
      const reflected = [-2, 0, 2].some((d) => sign.letters.has(x + ripple, mirrored + d));
      if (reflected) return hdTone(sign.ramp, level, x, y);
    }
    return hdTone(WET, level, x, y);
  });
  canvas.fill(0, BASE, canvas.width, 3, at(MEMBRANE, 0));
}

function drawRoofPuddle(
  canvas: Canvas,
  rect: Rect,
  baseRamp: readonly number[],
  streakRamp: readonly number[],
  frame: number,
): void {
  const { x, y, width, height } = rect;
  const water = new Mask(canvas.width, canvas.height);
  water.ellipse(x, y, width, height);
  water.ellipse(x + 16, y - 3, Math.round(width * 0.55), Math.round(height * 0.65));
  const cx = x + width * 0.5;
  const cy = y + height * 0.5;
  canvas.paint(x, y - 4, width, height + 4, (px, py) => {
    if (!water.has(px, py)) return undefined;
    if (!water.has(px, py - 1)) return at(baseRamp, 4);
    if (!water.has(px, py + 1)) return at(baseRamp, 2);
    if (frame > 0) {
      const r = Math.hypot((px + 0.5 - cx) / 2.8, py + 0.5 - cy);
      const ring = 1.6 + frame * 2.5;
      if (Math.abs(r - ring) < 0.65) return at(streakRamp, 3);
    }
    if ((py + frame) % 3 === 0 && Math.abs(px - cx) < width * 0.32 - (py - y)) {
      return at(streakRamp, 1);
    }
    return at(baseRamp, py - y > height * 0.5 ? 2 : 1);
  });
}

function drawHut(canvas: Canvas): void {
  const { left, right, roof, foot } = HUT;
  const sideW = 18;
  canvas.polygon(
    [
      [left - 6, foot],
      [right + 6, foot],
      [right + sideW + 10, foot + 8],
      [left - 10, foot + 8],
    ],
    at(CONCRETE, 2),
  );
  canvas.hline(left - 10, foot + 8, right - left + sideW + 20, at(CONCRETE, 4));
  canvas.hline(left - 10, foot + 9, right - left + sideW + 20, at(MEMBRANE, 0));
  canvas.polygon(
    [
      [right, roof],
      [right + sideW, roof - 10],
      [right + sideW, foot - 10],
      [right, foot],
    ],
    at(CONCRETE, 1),
  );
  canvas.line(right, roof, right + sideW, roof - 10, at(CONCRETE, 4));
  canvas.paint(left, roof, right - left, foot - roof, (x, y) => {
    if (y < roof + 3) return at(CONCRETE, 0);
    const course = (y - roof) % 20 === 19;
    const vJoint = (x - left + Math.floor((y - roof) / 20) * 24) % 48 === 0;
    const edge = x - left < 3 ? -0.8 : right - x <= 3 ? 1.1 : 0;
    const lit = lightAt(LIGHTS, x, y) * 0.95;
    const stain = (noise(47, x >> 2, y >> 1, 7) - 0.5) * 0.7;
    return hdTone(CONCRETE, 1.9 + edge + lit + stain - (course || vJoint ? 1 : 0), x, y);
  });
  canvas.polygon(
    [
      [left - 6, roof - 8],
      [right + 4, roof - 8],
      [right + sideW + 4, roof - 18],
      [right + sideW + 4, roof - 10],
      [right + 4, roof],
      [left - 6, roof],
    ],
    at(CONCRETE, 3),
  );
  canvas.hline(left - 6, roof - 8, right - left + 10, at(CONCRETE, 6));
  for (let gx = left - 4; gx < right + 2; gx += 8) {
    canvas.vline(gx, roof - 6, 4, at(STEEL, 2));
  }
  canvas.fill(66, roof + 14, 14, 82, at(STEEL, 2));
  canvas.vline(66, roof + 14, 82, at(STEEL, 4));
  canvas.vline(79, roof + 14, 82, at(STEEL, 0));
  for (let y = roof + 22; y < roof + 92; y += 14) {
    canvas.fill(65, y, 16, 2, at(STEEL, 4));
  }
  canvas.fill(84, roof - 36, 12, 28, at(STEEL, 2));
  canvas.fill(80, roof - 41, 20, 6, at(STEEL, 3));
  canvas.hline(80, roof - 41, 20, at(STEEL, 5));
  canvas.vline(85, roof - 36, 28, at(STEEL, 4));
  for (const cy of [roof + 10, roof + 16, roof + 22]) {
    canvas.line(right + 10, cy, TRUSS.left + 6, cy + 20, at(STEEL, 1));
  }
  canvas.polygon(
    [
      [DOOR.x - 12, DOOR.y - 8],
      [DOOR.x + DOOR.width + 12, DOOR.y - 8],
      [DOOR.x + DOOR.width + 16, DOOR.y - 1],
      [DOOR.x - 8, DOOR.y - 1],
    ],
    at(STEEL, 3),
  );
  canvas.hline(DOOR.x - 8, DOOR.y - 1, DOOR.width + 24, at(STEEL, 5));
  canvas.fill(DOOR.x - 3, DOOR.y, DOOR.width + 6, DOOR.height, at(STEEL, 0));
  canvas.paint(DOOR.x, DOOR.y, DOOR.width, DOOR.height, (x, y) => {
    const frame = x === DOOR.x || x === DOOR.x + DOOR.width - 1 || y === DOOR.y;
    if (frame) return at(STEEL, 4);
    const plate = y > DOOR.y + DOOR.height - 16;
    if (plate) return hdTone(STEEL, 2.8, x, y);
    const windowSlit = x >= DOOR.x + 14 && x < DOOR.x + 28 && y >= DOOR.y + 14 && y < DOOR.y + 24;
    if (windowSlit) return at(SODIUM, y === DOOR.y + 14 ? 3 : 1);
    const panel =
      x >= DOOR.x + 6 &&
      x < DOOR.x + DOOR.width - 6 &&
      ((y >= DOOR.y + 8 && y < DOOR.y + 38) || (y >= DOOR.y + 46 && y < DOOR.y + DOOR.height - 20));
    if (panel) {
      if (y === DOOR.y + 8 || y === DOOR.y + 46 || x === DOOR.x + 6) return at(STEEL, 0);
      return hdTone(STEEL, 1.4 + lightAt(LIGHTS, x, y) * 0.4, x, y);
    }
    return hdTone(STEEL, 2.2 + lightAt(LIGHTS, x, y) * 0.5, x, y);
  });
  canvas.fill(DOOR.x + DOOR.width - 9, DOOR.y + 44, 4, 3, at(STEEL, 5));
  canvas.fill(LAMP.x - 7, LAMP.y - 3, 14, 3, at(STEEL, 3));
  canvas.fill(LAMP.x - 5, LAMP.y, 10, 5, at(SODIUM, 3));
  canvas.fill(LAMP.x - 3, LAMP.y + 1, 6, 3, at(SODIUM, 4));
  const ax = DOOR.x - 32;
  const ay = DOOR.y - 34;
  canvas.fill(ax - 11, ay - 3, 22, 29, at(STEEL, 0));
  canvas.hline(ax - 11, ay - 3, 22, at(STEEL, 3));
  const arrow = new Mask(canvas.width, canvas.height);
  arrow.rect(ax - 2, ay, 4, 20);
  arrow.limb(ax - 8, ay + 14, ax, ay + 22, 1.5);
  arrow.limb(ax + 8, ay + 14, ax, ay + 22, 1.5);
  for (let y = ay - 2; y < ay + 26; y++) {
    for (let x = ax - 10; x < ax + 10; x++) {
      if (arrow.has(x, y)) canvas.set(x, y, at(NEON_GREEN, 3));
      else if (arrow.has(x - 1, y) || arrow.has(x + 1, y) || arrow.has(x, y - 1)) {
        canvas.set(x, y, at(NEON_GREEN, 1));
      }
    }
  }
  const vm = { x: right + 10, y: foot - 68, w: 36, h: 68 };
  canvas.polygon(
    [
      [vm.x + vm.w, vm.y],
      [vm.x + vm.w + 8, vm.y - 5],
      [vm.x + vm.w + 8, vm.y + vm.h - 5],
      [vm.x + vm.w, vm.y + vm.h],
    ],
    at(STEEL, 0),
  );
  canvas.fill(vm.x, vm.y, vm.w, vm.h, at(STEEL, 2));
  canvas.hline(vm.x, vm.y, vm.w, at(STEEL, 4));
  canvas.vline(vm.x, vm.y, vm.h, at(STEEL, 4));
  canvas.fill(vm.x + 4, vm.y + 6, vm.w - 12, 34, at(STEEL, 0));
  for (const [ry, ramp] of [
    [vm.y + 10, NEON_ORANGE],
    [vm.y + 19, NEON_GREEN],
    [vm.y + 28, NEON_YELLOW],
  ] as const) {
    canvas.hline(vm.x + 6, ry, vm.w - 16, at(ramp, 2));
    for (let bx = vm.x + 7; bx < vm.x + vm.w - 11; bx += 5) {
      canvas.fill(bx, ry - 3, 3, 3, at(ramp, 2));
      canvas.set(bx, ry - 3, at(ramp, 3));
    }
  }
  canvas.fill(vm.x + vm.w - 6, vm.y + 14, 3, 10, at(NEON_GREEN, 3));
  canvas.fill(vm.x + 6, vm.y + 46, vm.w - 14, 8, at(STEEL, 0));
  canvas.hline(vm.x + 6, vm.y + 46, vm.w - 14, at(STEEL, 3));
}

function drawSteam(canvas: Canvas, frame: number): void {
  const x0 = 90;
  const top = HUT.roof - 42;
  const cloud = new Mask(canvas.width, canvas.height);
  for (let i = 0; i < 7; i++) {
    const rise = ((i * 8 + frame * 4) % 56) + 4;
    const cx = Math.round(x0 - rise * 0.68 - Math.sin((rise + frame * 5) / 6) * 3);
    const cy = Math.round(top - 2 - rise);
    const rx = Math.round(4 + rise * 0.18);
    const ry = Math.max(3, Math.round(rx * 0.72));
    cloud.ellipse(cx - rx, cy - ry, rx * 2, ry * 2);
  }
  canvas.paint(30, HUT.roof - 106, 70, 66, (px, py) => {
    if (!cloud.has(px, py)) return undefined;
    const rise = top - py;
    const lit = !cloud.has(px, py - 1) || !cloud.has(px - 1, py);
    const step = rise > 42 ? 0 : rise > 20 ? (lit ? 2 : 1) : lit ? 3 : 2;
    return at(STEAM, step);
  });
}

const HOLDING: Pose = {
  ...HIP,
  arms: [
    { joint: [2, 13], end: [8, 20] },
    { joint: [-1, 13], end: [-1, 26] },
  ],
};
const DRAG: Pose = {
  ...HOLDING,
  arms: [
    { joint: [6, 9], end: [5, -4] },
    { joint: [-1, 13], end: [-1, 26] },
  ],
};
const UMBRELLA_HELD: Pose = {
  ...HIP,
  arms: [
    { joint: [4, 11], end: [5, 2] },
    { joint: [-2, 13], end: [-1, 24] },
  ],
};

const SMOKER_OUTFIT: Outfit = {
  top: CLOTH.olive,
  legs: CLOTH.black,
  shoes: CLOTH.cream,
  hair: CLOTH.olive,
};
const SHELTERED_OUTFIT: Outfit = {
  top: CLOTH.red,
  legs: CLOTH.blue,
  shoes: CLOTH.black,
  hair: HAIR.black,
};
const WATCHER_OUTFIT: Outfit = {
  top: CLOTH.leather,
  legs: CLOTH.blue,
  shoes: CLOTH.black,
  hair: CLOTH.mustard,
};

const SMOKER: Figure = {
  x: 112,
  y: HUT.foot + 4,
  height: 84,
  shoulders: 30,
  facing: 1,
  head: 'hood',
  coat: 'short',
  pose: HOLDING,
  rim: { side: 1, above: true, ramp: RIM_WARM },
  outfit: SMOKER_OUTFIT,
};
const SHELTERED: Figure = {
  x: 218,
  y: HUT.foot + 4,
  height: 80,
  shoulders: 28,
  facing: -1,
  head: 'long',
  coat: 'long',
  pose: UMBRELLA_HELD,
  rim: { side: -1, above: false, ramp: RIM_WARM },
  face: true,
  outfit: SHELTERED_OUTFIT,
};
const WATCHER: Figure = {
  x: 1200,
  y: FEET,
  height: 84,
  shoulders: 28,
  facing: -1,
  head: 'cap',
  coat: 'short',
  pose: CROSSED,
  rim: { side: -1, above: true, ramp: RIM_WARM },
  face: true,
  outfit: WATCHER_OUTFIT,
};

function handOf(figure: Figure, arm: 0 | 1): [number, number] {
  const { height: tall, shoulders, facing, coat, pose } = figure;
  const k = tall / 80;
  const bulk = coat === 'puffer' ? 1.5 : 0;
  const upper = Math.max(1.8, 2.4 * k) + bulk * 0.6;
  const sx = (arm === 0 ? 1 : -1) * (shoulders / 2 - upper) + pose.lean * 0.7;
  const sy = figure.y - Math.round(tall * 0.81) + pose.dip + 4;
  const end = pose.arms[arm].end;
  return [Math.round(figure.x + (sx + end[0] * k) * facing), Math.round(sy + end[1] * k)];
}

function drawSmoker(canvas: Canvas, frame: number): void {
  const shown = { ...SMOKER, pose: frame === 1 ? DRAG : HOLDING };
  canvas.ellipse(SMOKER.x - 12, SMOKER.y - 2, 24, 4, at(MEMBRANE, 0));
  drawFigure(canvas, shown, FIGURE_RAMPS);
  const [hx, hy] = handOf(shown, 0);
  const tip = hx + 3;
  canvas.set(tip, hy - 1, at(EMBER, frame === 1 ? 1 : 0));
  canvas.set(tip - 1, hy - 1, at(PALE, 0));
  if (frame !== 1) return;
  for (const [dx, dy] of [
    [2, -4],
    [3, -6],
    [1, -8],
    [3, -10],
  ] as const) {
    canvas.set(tip + dx, hy + dy, at(STEAM, 1));
  }
}

function drawSheltered(canvas: Canvas): void {
  canvas.ellipse(SHELTERED.x - 12, SHELTERED.y - 2, 24, 4, at(MEMBRANE, 0));
  drawFigure(canvas, SHELTERED, FIGURE_RAMPS);
  const [hx, hy] = handOf(SHELTERED, 0);
  const rows = 20;
  const top = SHELTERED.y - SHELTERED.height - rows + 2;
  canvas.line(hx, hy, hx + 2, top + 10, at(STEEL, 3));
  const cx = hx + 2;
  for (let row = 0; row < rows; row++) {
    const half = Math.round(30 * Math.sqrt(row / (rows - 1)));
    for (let x = cx - half; x < cx + half; x++) {
      const rib = (x - cx + 60) % 15 === 0 && row > 2;
      const lit = row <= 2 + Math.max(0, (cx - x) / 10) && x < cx + 6;
      canvas.set(x, top + row, lit ? at(RIM_WARM, row === 0 ? 1 : 0) : at(UMBRELLA, rib ? 2 : 1));
    }
  }
  for (let x = cx - 30; x <= cx + 30; x++) {
    canvas.set(x, top + rows - 1 + ((x - cx + 60) % 15 < 8 ? 1 : 0), at(UMBRELLA, 0));
  }
  canvas.vline(cx, top - 3, 3, at(STEEL, 4));
}

function drawWatcher(canvas: Canvas, frame: number): void {
  const pose: Pose = frame === 1 ? { ...CROSSED, lean: 2, dip: -1 } : CROSSED;
  canvas.ellipse(WATCHER.x - 12, WATCHER.y - 2, 24, 4, at(MEMBRANE, 0));
  drawFigure(canvas, { ...WATCHER, pose }, FIGURE_RAMPS);
  canvas.fill(WATCHER.x + 18, FEET - 22, 22, 20, at(STEEL, 2));
  canvas.hline(WATCHER.x + 18, FEET - 22, 22, at(STEEL, 4));
  canvas.hline(WATCHER.x + 18, FEET - 12, 22, at(NEON_YELLOW, 2));
}

function drawCargoPod(canvas: Canvas, x: number, foot: number): void {
  const w = 86;
  const h = 48;
  const top = foot - h;
  canvas.polygon(
    [
      [x - 8, top + 5],
      [x, top],
      [x, foot],
      [x - 8, foot - 4],
    ],
    at(STEEL, 0),
  );
  canvas.line(x - 8, top + 5, x, top, at(STEEL, 3));
  canvas.paint(x, top, w, h, (px, py) => {
    const rx = px - x;
    const ry = py - top;
    if (ry === 0) return at(STEEL, 4);
    if (ry === 1 || ry >= h - 3) return at(STEEL, 1);
    if (rx < 4 || rx >= w - 4) return at(STEEL, 3);
    if (ry >= 8 && ry < h - 8 && rx % 10 === 0) return at(STEEL, 0);
    if (ry >= 8 && ry < h - 8 && rx % 10 === 1) return at(STEEL, 3);
    return at(STEEL, 2);
  });
  canvas.fill(x + 10, top + 12, 28, 10, at(STEEL, 0));
  canvas.hline(x + 12, top + 15, 18, at(NEON_ORANGE, 2));
  canvas.hline(x + 12, top + 18, 12, at(NEON_YELLOW, 2));
}

function drawTruss(canvas: Canvas, sparkFrame: number): void {
  const { left, right, top } = TRUSS;
  const annex = { x: left + 16, y: 318, w: 368, h: BACK_FEET - 318 };
  canvas.polygon(
    [
      [annex.x - 10, annex.y + 6],
      [annex.x, annex.y],
      [annex.x, BACK_FEET],
      [annex.x - 10, BACK_FEET - 4],
    ],
    at(STEEL, 0),
  );
  canvas.paint(annex.x, annex.y, annex.w, annex.h, (px, py) => {
    const rx = px - annex.x;
    const ry = py - annex.y;
    if (ry === 0) return at(STEEL, 4);
    if (ry < 4) return at(STEEL, 2);
    if (ry >= 12 && ry < 42) {
      const bay = rx % 46;
      if (bay < 4 || bay >= 42) return at(STEEL, 2);
      if (ry === 12 || ry === 41 || bay === 22) return at(STEEL, 0);
      const glow = ry > 26 ? 2 : 1;
      return (rx >> 4) % 2 === 0 ? at(NEON_VIOLET, glow - 1) : at(SODIUM, glow - 1);
    }
    if (ry === 42) return at(CONCRETE, 4);
    return rx % 12 === 0 ? at(STEEL, 0) : hdTone(STEEL, 1.3, px, py);
  });
  for (const py of [296, 304]) {
    canvas.fill(left + 12, py, right - left + 560, 5, at(STEEL, 2));
    canvas.hline(left + 12, py, right - left + 560, at(STEEL, 4));
    canvas.hline(left + 12, py + 4, right - left + 560, at(STEEL, 0));
    for (let fx = left + 28; fx < right + 540; fx += 44) {
      canvas.fill(fx, py - 1, 3, 7, at(STEEL, 3));
      canvas.vline(fx + 1, py - 1, 7, at(STEEL, 5));
    }
  }
  drawCargoPod(canvas, left + 22, BACK_FEET + 4);
  const beam = (x0: number, y0: number, x1: number, y1: number, slot = 1) => {
    canvas.line(x0, y0, x1, y1, at(STEEL, slot), 3);
    canvas.line(x0, y0 - 1, x1, y1 - 1, at(STEEL, slot + 2));
  };
  const posts = [left, left + 101, left + 202, left + 303, right - 8];
  for (const x of posts) {
    const backX = x + 12;
    canvas.fill(backX, top + 6, 5, BACK_FEET - top - 6, at(STEEL, 1));
    canvas.vline(backX + 4, top + 6, BACK_FEET - top - 6, at(STEEL, 2));
    canvas.fill(backX - 3, BACK_FEET - 8, 11, 8, at(CONCRETE, 1));
    canvas.line(x + 4, FEET - 12, backX + 2, BACK_FEET - 6, at(STEEL, 1), 2);
    canvas.line(x + 4, top + 12, backX + 2, top + 6, at(STEEL, 2), 2);
  }
  posts.slice(0, -1).forEach((x, index) => {
    const next = posts[index + 1] ?? right;
    const midY = Math.round((top + 8 + FEET - 54) / 2);
    canvas.hline(x + 4, midY, next - x, at(STEEL, 2));
    canvas.hline(x + 4, midY - 1, next - x, at(STEEL, 3));
    beam(x + 4, top + 8, next + 4, midY);
    beam(next + 4, top + 8, x + 4, midY);
    beam(x + 4, midY, next + 4, FEET - 54);
    beam(next + 4, midY, x + 4, FEET - 54);
  });
  for (const x of posts) {
    canvas.fill(x - 2, top, 2, FEET - top, at(STEEL, 0));
    canvas.fill(x, top, 8, FEET - top, at(STEEL, 2));
    canvas.vline(x, top, FEET - top, at(STEEL, 3));
    canvas.vline(x + 7, top, FEET - top, at(STEEL, 4));
    for (let ry = top + 16; ry < FEET - 16; ry += 14) {
      canvas.fill(x + 2, ry, 2, 1, at(STEEL, 4));
      canvas.fill(x + 5, ry, 2, 1, at(STEEL, 4));
    }
    canvas.polygon(
      [
        [x - 6, FEET - 14],
        [x - 2, FEET - 18],
        [x + 14, FEET - 18],
        [x + 12, FEET - 14],
      ],
      at(CONCRETE, 4),
    );
    canvas.fill(x - 6, FEET - 14, 18, 16, at(CONCRETE, 2));
    canvas.hline(x - 6, FEET - 14, 18, at(CONCRETE, 5));
    canvas.vline(x - 6, FEET - 14, 16, at(CONCRETE, 1));
    canvas.fill(x - 2, FEET - 24, 4, 10, at(RUST, 1));
  }
  for (const y of [top + 6, FEET - 54]) {
    canvas.fill(left, y - 4, right - left, 8, at(STEEL, 2));
    canvas.hline(left, y - 4, right - left, at(STEEL, 4));
    canvas.hline(left, y + 3, right - left, at(STEEL, 0));
    for (let rx = left + 8; rx < right - 8; rx += 16) {
      canvas.fill(rx, y - 2, 2, 1, at(STEEL, 4));
    }
  }
  canvas.polygon(
    [
      [left - 12, top - 2],
      [left - 8, top - 8],
      [right + 12, top - 8],
      [right + 8, top - 2],
    ],
    at(STEEL, 2),
  );
  canvas.hline(left - 8, top - 8, right - left + 20, at(NEON_VIOLET, 2));
  canvas.fill(left - 12, top - 2, right - left + 20, 5, at(STEEL, 1));
  canvas.hline(left - 12, top - 2, right - left + 20, at(NEON_VIOLET, 3));
  canvas.hline(left - 10, top - 18, right - left + 20, at(STEEL, 4));
  canvas.hline(left - 10, top - 11, right - left + 20, at(STEEL, 2));
  for (let x = left - 10; x < right + 10; x += 34) {
    canvas.vline(x, top - 18, 14, at(STEEL, 3));
  }
  for (let fx = left + 36; fx < right - 20; fx += 96) {
    canvas.fill(fx - 6, top + 2, 12, 5, at(STEEL, 3));
    canvas.hline(fx - 5, top + 1, 10, at(NEON_VIOLET, 3));
  }
  canvas.vline(left - 18, top - 4, FEET - top + 4, at(STEEL, 3));
  canvas.vline(left - 8, top - 4, FEET - top + 4, at(STEEL, 3));
  for (let y = top + 4; y < FEET; y += 9) canvas.hline(left - 18, y, 11, at(STEEL, 2));
  const sub = SUBSTATION;
  canvas.polygon(
    [
      [sub.x - 10, sub.y + 6],
      [sub.x, sub.y],
      [sub.x, sub.y + sub.height],
      [sub.x - 10, sub.y + sub.height - 4],
    ],
    at(STEEL, 0),
  );
  canvas.line(sub.x - 10, sub.y + 6, sub.x, sub.y, at(STEEL, 3));
  canvas.fill(sub.x, sub.y, sub.width, sub.height, at(STEEL, 2));
  canvas.hline(sub.x, sub.y, sub.width, at(STEEL, 4));
  canvas.vline(sub.x + sub.width - 1, sub.y, sub.height, at(STEEL, 4));
  for (let ry = sub.y + 8; ry < sub.y + sub.height - 10; ry += 4) {
    canvas.hline(sub.x + 4, ry, 18, at(STEEL, 0));
    canvas.hline(sub.x + 4, ry + 1, 18, at(STEEL, 3));
  }
  canvas.fill(sub.x + 26, sub.y + 8, 20, 14, at(STEEL, 0));
  canvas.hline(sub.x + 28, sub.y + 11, 16, at(NEON_GREEN, 2));
  canvas.hline(sub.x + 28, sub.y + 16, 12, at(NEON_YELLOW, 2));
  spell('HV', 1, 1, (px, py) => {
    canvas.set(sub.x + 29 + px, sub.y + 28 + py, at(NEON_YELLOW, 2));
  });
  for (const ix of [sub.x + 8, sub.x + 24, sub.x + 38]) {
    canvas.fill(ix, sub.y - 8, 4, 8, at(CONCRETE, 4));
    canvas.hline(ix - 1, sub.y - 6, 6, at(CONCRETE, 5));
    canvas.hline(ix - 1, sub.y - 3, 6, at(CONCRETE, 5));
  }
  if (sparkFrame > 0) {
    const sx = sub.x + (sparkFrame === 1 ? 10 : 26);
    const sy = sub.y - 9;
    canvas.line(sx - 4, sy, sx + 4, sy - 4, at(NEON_VIOLET, 4));
    canvas.line(sx + 3, sy, sx - 3, sy - 5, at(PALE, 1));
    canvas.fill(sx - 1, sy - 2, 3, 3, at(NEON_VIOLET, 3));
  }
}

function drawRaceway(canvas: Canvas): void {
  const y = NEON.y + NEON.scale * 4;
  canvas.fill(TRUSS.left - 2, y, TRUSS.right - TRUSS.left + 4, 14, at(STEEL, 1));
  canvas.hline(TRUSS.left - 2, y, TRUSS.right - TRUSS.left + 4, at(STEEL, 4));
  canvas.hline(TRUSS.left - 2, y + 13, TRUSS.right - TRUSS.left + 4, at(STEEL, 0));
  for (const x of [TRUSS.left + 40, TRUSS.left + 200, TRUSS.left + 360]) {
    canvas.fill(x - 1, y + 14, 4, TRUSS.top - y - 18, at(STEEL, 1));
    canvas.vline(x + 2, y + 14, TRUSS.top - y - 18, at(STEEL, 3));
  }
}

function drawTank(canvas: Canvas): void {
  const { cx, top, body, width } = TANK_AT;
  const left = cx - width / 2;
  const foot = top + body;
  for (const bx of [left + 18, left + width - 22]) {
    canvas.fill(bx, foot, 5, BACK_FEET - foot, at(STEEL, 1));
    canvas.fill(bx - 3, BACK_FEET - 8, 11, 8, at(CONCRETE, 1));
  }
  canvas.fill(cx - 5, foot, 10, FEET - foot - 6, at(STEEL, 1));
  canvas.vline(cx - 5, foot, FEET - foot - 6, at(STEEL, 0));
  canvas.vline(cx + 4, foot, FEET - foot - 6, at(STEEL, 3));
  for (let py = foot + 10; py < FEET - 12; py += 14) {
    canvas.hline(cx - 6, py, 12, at(STEEL, 4));
  }
  for (const lx of [left + 8, left + width - 14]) {
    canvas.fill(lx - 2, foot, 2, FEET - foot, at(STEEL, 0));
    canvas.fill(lx, foot, 6, FEET - foot, at(STEEL, 2));
    canvas.vline(lx + 5, foot, FEET - foot, at(STEEL, 4));
    canvas.fill(lx - 5, FEET - 12, 14, 14, at(CONCRETE, 2));
    canvas.hline(lx - 5, FEET - 12, 14, at(CONCRETE, 5));
  }
  canvas.line(left + 10, foot + 6, left + width - 12, FEET - 12, at(STEEL, 1), 2);
  canvas.line(left + width - 12, foot + 6, left + 10, FEET - 12, at(STEEL, 1), 2);
  canvas.hline(left + 8, foot + Math.round((FEET - foot) * 0.48), width - 16, at(STEEL, 2));
  canvas.polygon(
    [
      [left - 6, foot + 3],
      [left - 2, foot - 2],
      [left + width + 2, foot - 2],
      [left + width + 6, foot + 3],
    ],
    at(STEEL, 2),
  );
  canvas.hline(left - 6, foot + 3, width + 12, at(STEEL, 4));
  canvas.hline(left - 6, foot - 9, width + 12, at(STEEL, 3));
  for (let px = left - 6; px <= left + width + 6; px += 18) {
    canvas.vline(px, foot - 9, 12, at(STEEL, 2));
  }
  canvas.paint(left, top, width, body, (x, y) => {
    const u = (x + 0.5 - cx) / (width / 2);
    const curve = Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * 4);
    const hoopRow = (y - top - curve + 260) % 22;
    if (hoopRow === 0) return at(STEEL, 4);
    if (hoopRow === 1) return at(TANK, 0);
    const stave = (x - left) % 10 === 0 ? -0.45 : 0;
    const round = 1.6 + u * 1.5 - u * u * 0.8 + stave;
    return hdTone(TANK, round, x, y);
  });
  canvas.vline(left, top + 4, body - 8, at(NEON_VIOLET, 2));
  canvas.vline(left + 1, top + 4, body - 8, at(NEON_VIOLET, 1));
  canvas.vline(left + width - 12, top - 2, body + 4, at(STEEL, 3));
  canvas.vline(left + width - 6, top - 2, body + 4, at(STEEL, 3));
  for (let ly = top + 4; ly < foot; ly += 7) {
    canvas.hline(left + width - 12, ly, 7, at(STEEL, 2));
  }
  for (let row = 0; row < 20; row++) {
    const half = Math.round((width / 2 + 4) * (row / 19));
    for (let px = cx - half; px < cx + half; px++) {
      const u = (px - cx) / Math.max(1, half);
      canvas.set(px, top - 20 + row, hdTone(TANK, 2.1 + u * 1.2, px, top - 20 + row));
    }
  }
  canvas.hline(left - 4, top - 1, width + 8, at(TANK, 4));
  canvas.fill(cx - 6, top - 25, 12, 5, at(STEEL, 3));
  canvas.hline(cx - 6, top - 25, 12, at(STEEL, 5));
  for (const [rx, ry, rh] of [
    [left + 18, top + 24, 12],
    [left + 46, top + 46, 14],
    [left + 78, top + 24, 10],
  ] as const) {
    canvas.vline(rx, ry, rh, at(RUST, 1));
  }
  canvas.fill(cx - 16, FEET - 26, 32, 24, at(STEEL, 2));
  canvas.hline(cx - 16, FEET - 26, 32, at(STEEL, 4));
  canvas.fill(cx - 12, FEET - 22, 24, 14, at(STEEL, 0));
  canvas.set(cx - 8, FEET - 18, at(NEON_GREEN, 3));
  canvas.set(cx - 4, FEET - 18, at(NEON_YELLOW, 3));
}

function drawUnit(canvas: Canvas, x: number, width: number, turn: number): void {
  const { top, height } = UNIT;
  const sideW = 10;
  canvas.fill(x - sideW - 2, FEET, width + sideW + 6, 4, at(MEMBRANE, 0));
  canvas.fill(x - sideW, FEET - 4, width + sideW, 4, at(STEEL, 1));
  canvas.hline(x - sideW, FEET - 4, width + sideW, at(STEEL, 3));
  canvas.polygon(
    [
      [x - sideW, top + 5],
      [x, top],
      [x, top + height - 4],
      [x - sideW, top + height - 7],
    ],
    at(CONCRETE, 1),
  );
  canvas.line(x - sideW, top + 5, x, top, at(CONCRETE, 4));
  canvas.paint(x, top, width, height - 4, (px, py) => {
    const rx = px - x;
    const ry = py - top;
    if (ry === 0) return at(CONCRETE, 6);
    if (ry >= height - 6) return at(STEEL, 0);
    if (rx === 0 || rx === width - 1) return at(CONCRETE, 4);
    const grille = rx >= 6 && rx < width - 22 && ry >= 8 && ry < height - 10;
    if (grille) {
      return ry % 4 === 0 ? at(STEEL, 0) : ry % 4 === 1 ? at(CONCRETE, 3) : at(CONCRETE, 2);
    }
    if (rx === width - 18 && ry > 4 && ry < height - 6) return at(CONCRETE, 0);
    return hdTone(CONCRETE, 3.1 - ry * 0.015, px, py);
  });
  const fcx = x + 26;
  const fcy = top + Math.round((height - 4) * 0.52);
  canvas.ellipse(fcx - 15, fcy - 15, 30, 30, at(STEEL, 0));
  canvas.paint(fcx - 13, fcy - 13, 26, 26, (px, py) => {
    const u = (px + 0.5 - fcx) / 13;
    const v = (py + 0.5 - fcy) / 13;
    if (u * u + v * v > 1) return undefined;
    if (u * u + v * v > 0.78) return at(STEEL, 3);
    const angle = Math.atan2(v, u) + (turn * Math.PI) / 4.5;
    const blade = Math.cos(angle * 3) > 0.25;
    return at(STEEL, blade ? 2 : 0);
  });
  canvas.fill(fcx - 2, fcy - 2, 4, 4, at(STEEL, 4));
  canvas.fill(x + width - 14, top + 10, 8, 6, at(NEON_YELLOW, 2));
  canvas.set(x + width - 12, top + 20, at(NEON_GREEN, 3));
  const cx = x + width / 2;
  const cy = top - 4;
  canvas.polygon(
    [
      [cx - 24, top],
      [cx - 20, cy - 3],
      [cx + 20, cy - 3],
      [cx + 24, top],
    ],
    at(STEEL, 2),
  );
  canvas.paint(cx - 22, cy - 5, 44, 10, (px, py) => {
    const u = (px + 0.5 - cx) / 22;
    const v = (py + 0.5 - cy) / 5;
    if (u * u + v * v > 1) return undefined;
    const angle = Math.atan2(v, u) + (turn * Math.PI) / 4.5;
    const blade = Math.cos(angle * 3) > 0.35;
    const rim = u * u + v * v > 0.72;
    return at(STEEL, rim ? 4 : blade ? 2 : 0);
  });
  const flutter = turn === 1 ? -1 : turn === 2 ? 1 : 0;
  for (const ry of [top + 16, top + 34]) {
    canvas.line(x + 14, ry, x + 22, ry + 2 + flutter, at(NEON_ORANGE, 2), 2);
  }
}

function drawMast(canvas: Canvas, quiver: number, lit: boolean): void {
  const { x, top } = MAST;
  canvas.fill(x - 10, FEET - 12, 20, 14, at(CONCRETE, 2));
  canvas.hline(x - 10, FEET - 12, 20, at(CONCRETE, 5));
  canvas.vline(x - 3, top + 40, FEET - top - 52, at(STEEL, 2));
  canvas.vline(x + 3, top + 40, FEET - top - 52, at(STEEL, 4));
  for (let y = top + 44; y < FEET - 14; y += 12) {
    canvas.line(x - 3, y, x + 3, y + 6, at(STEEL, 1));
    canvas.line(x + 3, y + 6, x - 3, y + 12, at(STEEL, 1));
  }
  canvas.line(x, top + 60, x - 56, FEET - 4, at(STEEL, 1));
  canvas.line(x, top + 60, x + 52, FEET - 4, at(STEEL, 1));
  for (const [dx, y, size] of [
    [-16, top + 80, 14],
    [14, top + 140, 18],
  ] as const) {
    canvas.paint(x + dx - size / 2, y - size / 2, size, size, (px, py) => {
      const u = (px + 0.5 - (x + dx)) / (size / 2);
      const v = (py + 0.5 - y) / (size / 2);
      if (u * u + v * v > 1 || u * 0.6 + v > 0.5) return undefined;
      return at(STEEL, u * u + v * v > 0.7 ? 4 : 2);
    });
  }
  for (const [dx, height] of [
    [-2, 40],
    [0, 52],
    [2, 34],
  ] as const) {
    const base = top + 40;
    for (let rise = 0; rise < height; rise++) {
      const bend = Math.round(quiver * (rise / height) ** 2 * 2);
      canvas.set(x + dx + bend, base - rise, at(STEEL, 3));
    }
  }
  canvas.fill(x - 2, top - 16, 4, 4, at(AVIATION, lit ? 1 : 0));
  if (lit) {
    for (const [dx, dy] of [
      [-3, -1],
      [3, -1],
      [0, -4],
      [0, 2],
    ] as const) {
      canvas.fill(x - 1 + dx, top - 15 + dy, 2, 2, at(AVIATION, 0));
    }
  }
}

function drawSpine(canvas: Canvas): void {
  const { spine } = LUCK;
  canvas.polygon(
    [
      [spine - 16, FEET - 12],
      [spine - 12, FEET - 16],
      [spine + 16, FEET - 16],
      [spine + 16, FEET - 12],
    ],
    at(CONCRETE, 4),
  );
  canvas.fill(spine - 16, FEET - 12, 32, 14, at(CONCRETE, 2));
  canvas.hline(spine - 16, FEET - 12, 32, at(CONCRETE, 5));
  canvas.fill(spine - 4, 96, 8, FEET - 108, at(STEEL, 1));
  canvas.vline(spine + 3, 96, FEET - 108, at(STEEL, 4));
  for (const y of [132, 212, 292]) {
    canvas.fill(spine - 34, y, 68, 4, at(STEEL, 2));
    canvas.hline(spine - 34, y, 68, at(STEEL, 4));
  }
  canvas.line(spine, FEET - 64, spine - 36, FEET - 12, at(STEEL, 2), 2);
  canvas.line(spine, FEET - 64, spine + 36, FEET - 12, at(STEEL, 2), 2);
}

function drawLaundry(canvas: Canvas, sway: number): void {
  const { left, right, y } = LINE;
  for (const x of [left, right - 3]) {
    canvas.fill(x - 4, FEET - 10, 10, 12, at(CONCRETE, 2));
    canvas.hline(x - 4, FEET - 10, 10, at(CONCRETE, 5));
    canvas.fill(x, y - 6, 3, FEET - y - 4, at(STEEL, 2));
    canvas.vline(x + 2, y - 6, FEET - y - 4, at(STEEL, 4));
  }
  const sag = (x: number) => y + Math.round(Math.sin(((x - left) / (right - left)) * Math.PI) * 6);
  for (let x: number = left; x < right; x++) canvas.set(x, sag(x), at(STEEL, 3));
  const items = [
    { x: left + 10, width: 24, height: 26, ramp: CLOTH.red },
    { x: left + 42, width: 26, height: 28, ramp: CLOTH.cream },
    { x: left + 76, width: 22, height: 34, ramp: CLOTH.blue },
  ];
  items.forEach(({ x, width, height, ramp }, index) => {
    const swing = [0, 2, 1][(sway + index) % 3] ?? 0;
    const top = sag(x + width / 2) + 1;
    canvas.paint(x - 2, top, width + 6, height, (px, py) => {
      const down = (py - top) / height;
      const shift = Math.round(swing * down);
      const local = px - x - shift;
      if (local < 0 || local >= width) return undefined;
      if (index < 2 && down > 0.35 && (local < 4 || local >= width - 4)) return undefined;
      if (local === 0 || py === top) return at(ramp, 2);
      const fold = (local + Math.round(down * 3)) % 7 === 0 ? 0 : 1;
      return at(ramp, fold);
    });
    canvas.fill(x + 2, top - 1, 2, 2, at(PALE, 0));
    canvas.fill(x + width - 4, top - 1, 2, 2, at(PALE, 0));
  });
  canvas.fill(left + 18, FEET - 16, 26, 16, at(CLOTH.blue, 0));
  canvas.hline(left + 18, FEET - 16, 26, at(CLOTH.blue, 2));
  canvas.fill(left + 22, FEET - 20, 18, 4, at(CLOTH.cream, 1));
}

function drawTurbine(canvas: Canvas, frame: number): void {
  const { x, y } = TURBINE;
  canvas.fill(x - 6, y + 10, 12, PARAPET - (y + 10), at(STEEL, 2));
  canvas.vline(x + 5, y + 10, PARAPET - (y + 10), at(STEEL, 4));
  canvas.ellipse(x - 10, y - 2, 20, 14, at(STEEL, 2));
  canvas.hline(x - 7, y - 2, 14, at(STEEL, 4));
  for (let rib = -7 + (frame % 3); rib <= 7; rib += 4) {
    canvas.line(x + rib, y - 1, x + Math.round(rib * 1.2), y + 10, at(STEEL, rib > 0 ? 4 : 0));
  }
}

function drawDeckVent(canvas: Canvas, frame: number): void {
  const { x, y } = DECK_VENT;
  canvas.fill(x - 14, y - 2, 28, 8, at(MEMBRANE, 0));
  canvas.fill(x - 13, y - 1, 26, 6, at(STEEL, 2));
  canvas.hline(x - 13, y - 1, 26, at(STEEL, 4));
  for (let gx = x - 10; gx < x + 11; gx += 4) {
    canvas.fill(gx, y + 1, 2, 3, at(MEMBRANE, 0));
  }
  const cloud = new Mask(canvas.width, canvas.height);
  for (let i = 0; i < 6; i++) {
    const rise = ((i * 5 + frame * 3) % 28) + 2;
    const cx = Math.round(x + Math.sin((rise + i) / 3.5) * 2.5 - rise * 0.14);
    const cy = Math.round(y - 2 - rise);
    const rx = Math.round(3 + rise / 7);
    const ry = Math.max(3, Math.round(rx * 0.8));
    cloud.ellipse(cx - rx, cy - ry, rx * 2, ry * 2);
  }
  canvas.paint(x - 12, y - 34, 24, 34, (px, py) => {
    if (!cloud.has(px, py)) return undefined;
    const rise = y - py;
    const lit = !cloud.has(px, py - 1) || !cloud.has(px - 1, py);
    const step = rise > 22 ? 0 : rise > 10 ? (lit ? 2 : 1) : lit ? 2 : 1;
    return at(STEAM, step);
  });
}

function drawDrone(canvas: Canvas, bob: number): void {
  const x = DRONE.x;
  const y = DRONE.y + (bob % 3);
  canvas.fill(x - 9, y, 18, 6, at(STEEL, 2));
  canvas.hline(x - 9, y, 18, at(STEEL, 4));
  canvas.fill(x - 4, y + 6, 8, 7, at(CONCRETE, 3));
  canvas.hline(x - 4, y + 6, 8, at(CONCRETE, 5));
  for (const dx of [-14, 10]) {
    canvas.hline(x + dx - 4, y - 2, 12, at(STEEL, bob === 1 ? 1 : 4));
    canvas.vline(x + dx + 2, y - 1, 2, at(STEEL, 2));
  }
  canvas.fill(x - 1, y + 2, 2, 2, at(NEON_GREEN, bob === 0 ? 3 : 1));
}

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'mast',
    rect: { x: MAST.x - 8, y: MAST.top - 22, width: 17, height: 64 },
    frames: 6,
    timeline: timelineOf((step) => {
      const lit = Math.floor(step / 60) % 2 === 0 ? 0 : 3;
      const quiver = overhead(step) ? ([1, 2, 1, 0][Math.floor(step / 4) % 4] ?? 0) : 0;
      return lit + quiver;
    }),
  },
  {
    name: 'spark',
    rect: { x: SUBSTATION.x, y: SUBSTATION.y - 14, width: SUBSTATION.width, height: 14 },
    frames: 3,
    timeline: timelineOf((step) => {
      if (!overhead(step)) return 0;
      const phase = step % 40;
      return phase < 6 ? 1 : phase >= 20 && phase < 26 ? 2 : 0;
    }),
  },
  {
    name: 'puddleNeon',
    rect: {
      x: PUDDLE_NEON.x,
      y: PUDDLE_NEON.y - 4,
      width: PUDDLE_NEON.width,
      height: PUDDLE_NEON.height + 4,
    },
    frames: 4,
    timeline: timelineOf((step) => {
      if (!overhead(step)) return 0;
      const into = step % 36;
      return into < 9 ? 1 : into < 18 ? 2 : into < 27 ? 3 : 0;
    }),
  },
  {
    name: 'puddleLuck',
    rect: {
      x: PUDDLE_LUCK.x,
      y: PUDDLE_LUCK.y - 4,
      width: PUDDLE_LUCK.width,
      height: PUDDLE_LUCK.height + 4,
    },
    frames: 4,
    timeline: timelineOf((step) => {
      if (!overhead(step)) return 0;
      const into = (step + 12) % 36;
      return into < 9 ? 1 : into < 18 ? 2 : into < 27 ? 3 : 0;
    }),
  },
  {
    name: 'watcher',
    rect: {
      x: WATCHER.x - 24,
      y: WATCHER.y - WATCHER.height - 8,
      width: 50,
      height: WATCHER.height + 10,
    },
    frames: 2,
    timeline: timelineOf((step) => (overhead(step) || step % 120 < 40 ? 1 : 0)),
  },
  {
    name: 'turbine',
    rect: { x: TURBINE.x - 11, y: TURBINE.y - 3, width: 22, height: 16 },
    frames: 3,
    timeline: [
      [0, 5],
      [1, 5],
      [2, 5],
    ],
  },
  {
    name: 'smoker',
    rect: {
      x: SMOKER.x - 26,
      y: SMOKER.y - SMOKER.height - 8,
      width: 56,
      height: SMOKER.height + 10,
    },
    frames: 2,
    timeline: timelineOf((step) => (step % 540 < 100 ? 1 : 0)),
  },
  {
    name: 'steam',
    rect: { x: 30, y: HUT.roof - 106, width: 70, height: 66 },
    frames: 4,
    timeline: [
      [0, 14],
      [1, 14],
      [2, 14],
      [3, 14],
    ],
  },
  ...UNITS.map(({ x, width }, index): Animation => ({
    name: `fan${index}`,
    rect: { x: x + 10, y: UNIT.top - 9, width: width - 20, height: UNIT.height },
    frames: 3,
    timeline: [
      [0, 6 + index],
      [1, 6 + index],
      [2, 6 + index],
    ],
  })),
  {
    name: 'laundry',
    rect: { x: LINE.left + 6, y: LINE.y - 1, width: 100, height: 48 },
    frames: 3,
    timeline: [
      [0, 50],
      [1, 40],
      [2, 50],
      [1, 40],
    ],
  },
  {
    name: 'ventSteam',
    rect: { x: DECK_VENT.x - 12, y: DECK_VENT.y - 34, width: 24, height: 34 },
    frames: 4,
    timeline: [
      [0, 11],
      [1, 11],
      [2, 11],
      [3, 11],
    ],
  },
  {
    name: 'drone',
    rect: { x: DRONE.x - 18, y: DRONE.y - 3, width: 36, height: 19 },
    frames: 3,
    timeline: [
      [0, 24],
      [1, 24],
      [2, 24],
      [1, 24],
    ],
  },
];

function mastOf(frame: number): { lit: boolean; quiver: number } {
  return { lit: frame < 3, quiver: [0, 1, -1][frame % 3] ?? 0 };
}

export function drawMid(
  width: number,
  height: number,
  frameOf: (name: string) => number = () => 0,
  clip?: Rect,
): Canvas {
  const canvas = new Canvas(width, height);
  if (clip) {
    canvas.clip = {
      left: Math.max(0, clip.x),
      top: Math.max(0, clip.y),
      right: Math.min(width, clip.x + clip.width),
      bottom: Math.min(height, clip.y + clip.height),
    };
  }
  drawParapet(canvas);
  drawTurbine(canvas, frameOf('turbine'));
  const neon = signLetters(canvas, 'ネオン', NEON.x, NEON.y, NEON.scale, false);
  const luck = signLetters(canvas, '大吉', LUCK.x, LUCK.y, LUCK.scale, true);
  drawMembrane(canvas, [
    {
      letters: neon,
      left: NEON.x,
      right: TRUSS.right - 20,
      bottom: 236,
      stretch: 1.7,
      ramp: REFLECT_VIOLET,
    },
    {
      letters: luck,
      left: LUCK.x - 6,
      right: LUCK.x + 88,
      bottom: 287,
      stretch: 2.6,
      ramp: REFLECT_YELLOW,
    },
  ]);
  for (const s of ROOF_SPILLS) spill(canvas, s);
  drawRoofPuddle(canvas, PUDDLE_NEON, MEMBRANE_VIOLET, NEON_VIOLET, frameOf('puddleNeon'));
  drawRoofPuddle(canvas, PUDDLE_LUCK, MEMBRANE_YELLOW, NEON_YELLOW, frameOf('puddleLuck'));
  drawTruss(canvas, frameOf('spark'));
  drawRaceway(canvas);
  drawSignBack(canvas, 'ネオン', NEON.x, NEON.y, NEON.scale, NEON_VIOLET);
  drawSpine(canvas);
  drawSignBack(canvas, '大吉', LUCK.x, LUCK.y, LUCK.scale, NEON_YELLOW, true);
  drawTank(canvas);
  UNITS.forEach(({ x, width: unit }, index) => {
    drawUnit(canvas, x, unit, frameOf(`fan${index}`));
  });
  const mast = mastOf(frameOf('mast'));
  drawMast(canvas, mast.quiver, mast.lit);
  drawLaundry(canvas, frameOf('laundry'));
  drawWatcher(canvas, frameOf('watcher'));
  drawHut(canvas);
  drawSteam(canvas, frameOf('steam'));
  const random = streamOf(13, 'tags');
  drawThrowUp(canvas, { x: 56, y: 364, width: 52, height: 22 }, random, SPRAY_RAMPS, TAG.violet);
  drawTag(canvas, { x: 192, y: 286, width: 50, height: 22 }, random, SPRAY_RAMPS);
  drawSheltered(canvas);
  drawSmoker(canvas, frameOf('smoker'));
  drawDeckVent(canvas, frameOf('ventSteam'));
  drawDrone(canvas, frameOf('drone'));
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
