/**
 * The far layer (docs/art/decor-rooftop.md §2.1): the megacity of Néon Underground (2090) past the
 * roof's edge, in clean flat tones and 3D perspective (docs/art/proprete.md). Layered skyscrapers
 * with 3D side returns, beveled crowns, sky bridges, vertical neon billboards, traffic lanes, and
 * the blimp and flying cars gliding across (index.ts). Opaque everywhere.
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { spell } from '../kit/font.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import {
  AVIATION,
  BEAM,
  BEAM_DROP,
  CLOUD,
  HAZE,
  HULL,
  NEON_GREEN,
  NEON_ORANGE,
  NEON_VIOLET,
  NEON_YELLOW,
  PALE,
  SKY,
  STEEL,
  TOWER,
  WINDOW,
} from './palette.ts';

const GLOW = 360;
const FOOT = 540;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / GLOW, 0), 1);
  return (SKY.length - 1) * t ** 1.4;
}

function drawCloud(canvas: Canvas, seed: number, base: number, height: number): void {
  for (let x = 0; x < canvas.width; x++) {
    const presence = noise(seed, x, 0, 200);
    if (presence < 0.38) continue;
    const swell = (presence - 0.38) / 0.62;
    const bumps = noise(seed + 1, x, 0, 34) * 0.7 + noise(seed + 2, x, 0, 9) * 0.3;
    const top = Math.round(base - height * swell * (0.35 + bumps * 0.65));
    const bottom = Math.round(base + 3 + noise(seed + 3, x, 0, 22) * 5 * swell);
    for (let y = top; y < bottom; y++) {
      const depth = (y - top) / Math.max(bottom - top, 1);
      const step = depth > 0.74 ? 3 : depth > 0.48 ? 2 : depth > 0.22 ? 1 : 0;
      canvas.set(x, y, at(CLOUD, step));
    }
  }
}

interface Tower {
  readonly x: number;
  readonly width: number;
  readonly top: number;
  readonly crown: number;
  readonly spire: number;
  readonly bevel: boolean;
}

function towerMask(canvas: Canvas, { x, width, top, crown, spire, bevel }: Tower): Mask {
  const mask = new Mask(canvas.width, canvas.height);
  if (bevel) {
    const cut = Math.min(14, Math.floor(width * 0.24));
    mask.polygon([
      [x, top + cut],
      [x + cut, top],
      [x + width - cut, top],
      [x + width, top + cut],
      [x + width, FOOT],
      [x, FOOT],
    ]);
  } else {
    mask.rect(x, top, width, FOOT - top);
  }
  if (crown > 0) {
    mask.rect(x + 7, top - crown, width - 14, crown);
    if (crown > 16) mask.rect(x + 14, top - crown - 8, Math.max(6, width - 28), 8);
  }
  if (spire > 0) {
    mask.rect(x + Math.floor(width / 2) - 1, top - crown - spire, 2, spire);
  }
  return mask;
}

function drawTowers(
  canvas: Canvas,
  random: Random,
  ramp: readonly number[],
  heights: readonly [number, number],
  widths: readonly [number, number],
  windows: number,
): Tower[] {
  const towers: Tower[] = [];
  const center = canvas.width / 2;
  let x = random.int(-30, 0);
  while (x < canvas.width) {
    const width = random.int(widths[0], widths[1]);
    const top = random.int(heights[0], heights[1]);
    const tower: Tower = {
      x,
      width,
      top,
      crown: random.chance(0.55) ? random.int(10, 28) : 0,
      spire: random.chance(0.35) ? random.int(16, 40) : 0,
      bevel: random.chance(0.35),
    };
    towers.push(tower);
    const mask = towerMask(canvas, tower);
    const from = Math.max(0, top - tower.crown - tower.spire - 8);
    const sideW = Math.max(5, Math.round(width * 0.16));
    const litRight = x + width / 2 < center;
    for (let y = from; y < FOOT; y++) {
      const lowBand = y > 310 ? 1 : 0;
      for (let px = x; px < x + width; px++) {
        if (!mask.has(px, y)) continue;
        const topEdge = !mask.has(px, y - 1);
        const outerRight = !mask.has(px + 1, y);
        const outerLeft = !mask.has(px - 1, y);
        const inSide = litRight ? px >= x + width - sideW : px < x + sideW;
        let step = 1 + lowBand;
        if (topEdge || (litRight ? outerRight : outerLeft)) {
          step = ramp.length - 1;
        } else if (inSide) {
          step = Math.min(ramp.length - 1, 2 + lowBand);
        } else if (litRight ? outerLeft : outerRight) {
          step = 0;
        }
        canvas.set(px, y, at(ramp, step));
      }
    }
    const faceLeft = litRight ? x + 4 : x + sideW + 3;
    const faceRight = litRight ? x + width - sideW - 4 : x + width - 5;
    for (let column = faceLeft; column < faceRight - 3; column += 6) {
      if (!random.chance(windows)) continue;
      const awake = random.chance(0.26);
      for (let y = top + 10; y < FOOT - 6; y += 7) {
        if (!random.chance(0.68)) continue;
        canvas.fill(column, y, 3, 4, at(WINDOW, awake && random.chance(0.4) ? 1 : 0));
      }
    }
    x += width + random.int(4, 20);
  }
  return towers;
}

function drawTowerSigns(canvas: Canvas, towers: readonly Tower[], random: Random): void {
  const ramps = [NEON_ORANGE, NEON_GREEN, NEON_VIOLET, NEON_YELLOW];
  for (const tower of towers) {
    if (tower.width < 42 || !random.chance(0.55)) continue;
    const ramp = random.pick(ramps);
    const x = tower.x + (random.chance(0.5) ? 4 : tower.width - 9);
    const y = tower.top + random.int(26, 110);
    const height = random.int(34, 72);
    canvas.fill(x - 2, y - 2, 8, height + 4, at(ramp, 0));
    canvas.fill(x - 1, y, 6, height, at(STEEL, 0));
    canvas.fill(x, y, 4, height, at(ramp, 1));
    for (let py = y + 2; py < y + height - 3; py += 6) {
      canvas.fill(x + 1, py, 2, 4, at(ramp, 2));
      canvas.set(x + 1, py + 1, at(ramp, 3));
    }
  }
}

function drawAviation(canvas: Canvas, towers: readonly Tower[]): void {
  for (const { x, width, top, crown, spire } of towers) {
    if (spire === 0 && top > 140) continue;
    const cx = x + Math.floor(width / 2) - 1;
    const y = top - crown - spire - 2;
    canvas.fill(cx - 1, y - 1, 4, 4, at(AVIATION, 0));
    canvas.fill(cx, y, 2, 2, at(AVIATION, 1));
  }
}

function drawBridge(canvas: Canvas, left: number, right: number, y: number): void {
  canvas.fill(left, y - 2, right - left, 2, at(STEEL, 2));
  canvas.fill(left, y, right - left, 12, at(TOWER, 2));
  canvas.hline(left, y, right - left, at(TOWER, 4));
  canvas.hline(left, y + 11, right - left, at(TOWER, 0));
  for (let x = left + 4; x < right - 4; x += 6) {
    canvas.fill(x, y + 4, 3, 4, at(WINDOW, 1));
  }
}

function drawTraffic(canvas: Canvas, random: Random): void {
  for (const y of [252, 284, 318]) {
    for (let x = 0; x < canvas.width; x += random.int(8, 26)) {
      const ramp = random.chance(0.5) ? NEON_ORANGE : PALE;
      const ly = y + random.int(-1, 1);
      canvas.fill(x, ly, 3, 1, at(ramp, 1));
    }
  }
}

export function drawFar(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => {
    if (y >= 196 && y <= 462) return at(SKY, Math.round(skyLevel(y)));
    return tone(SKY, skyLevel(y), x, y);
  });
  drawCloud(canvas, seed + 1, 66, 26);
  drawTowers(canvas, streamOf(seed, 'haze'), HAZE, [60, 220], [26, 56], 0.3);
  drawCloud(canvas, seed + 5, 170, 30);
  drawTraffic(canvas, streamOf(seed, 'traffic'));
  const near = drawTowers(canvas, streamOf(seed, 'towers'), TOWER, [146, 296], [46, 98], 0.45);
  drawBridge(canvas, 290, 430, 232);
  drawBridge(canvas, 760, 910, 266);
  drawTowerSigns(canvas, near, streamOf(seed, 'tower signs'));
  drawAviation(canvas, near);
  return canvas;
}

export const BLIMP = { x: 600, y: 192, length: 200, height: 54 } as const;
export const BEAM_LENGTH = 230;
export const BEAM_ANGLES = [-0.3, -0.15, 0, 0.15, 0.3] as const;
export const BLIMP_CYCLE = 2400;
export const PASS_AT = 300;
export const PASS = 1500;
const BEAM_SPREAD = 0.09;

export function drawBlimp(canvas: Canvas, angle: number): void {
  const { x: cx, y: top, length, height } = BLIMP;
  const left = cx - length / 2;
  const belly = top + height;
  const gondola = { x: cx - 26, y: belly - 4, width: 46, height: 14 };
  const root = { x: gondola.x + gondola.width / 2, y: gondola.y + gondola.height };
  for (let y = root.y; y < root.y + BEAM_LENGTH; y++) {
    const depth = (y - root.y) / BEAM_LENGTH;
    const center = root.x + Math.tan(angle) * (y - root.y);
    const half = 2 + Math.tan(BEAM_SPREAD) * (y - root.y) * (1 + Math.abs(angle));
    for (let x = Math.floor(center - half); x <= Math.ceil(center + half); x++) {
      const off = Math.abs(x - center) / half;
      if (off > 1) continue;
      const density = (1 - off ** 2) * (1 - depth * 0.7) * 1.15;
      const grain = noise(83, x, y, 3) * 0.5 + ((x * 7 + y * 13) % 9) / 18;
      if (grain > density) continue;
      canvas.set(x, y, at(BEAM, off < 0.3 && depth < 0.3 ? 2 : off < 0.7 ? 1 : 0));
    }
    for (let x = Math.floor(center - half); x <= Math.ceil(center + half); x++) {
      if (Math.abs(x - center) > half * 0.8 || noise(89, x, y, 1) < 0.985) continue;
      for (let drop = 0; drop < 6; drop++) {
        canvas.set(x - Math.round((drop * 4) / 14), y - drop, at(BEAM_DROP, depth < 0.6 ? 2 : 1));
      }
    }
  }
  canvas.paint(left, top, length, height, (x, y) => {
    const u = (x + 0.5 - cx) / (length / 2);
    const v = (y + 0.5 - (top + height / 2)) / (height / 2);
    const shape = u < 0 ? u * u : (u * 1.08) ** 2;
    if (shape + v * v > 1) return undefined;
    if (v < -0.78) return at(HULL, 5);
    if (v < -0.42) return at(HULL, 4);
    const seam = Math.round(x - left) % 22 === 0;
    if (v < 0.15) return at(HULL, seam ? 2 : 3);
    if (v < 0.58) return at(HULL, seam ? 1 : 2);
    return at(HULL, 0);
  });
  const tail = left + length - 26;
  for (let row = 0; row < 18; row++) {
    canvas.hline(tail + row, top - 6 + row, 14 - Math.floor(row / 2), at(HULL, 3));
    canvas.hline(tail + row, belly + 6 - row, 14 - Math.floor(row / 2), at(HULL, 1));
  }
  canvas.hline(tail, top - 6, 14, at(HULL, 5));
  const panel = { x: cx - 52, y: top + 18, width: 92, height: 13 };
  canvas.fill(panel.x - 1, panel.y - 1, panel.width + 2, panel.height + 2, at(STEEL, 2));
  canvas.fill(panel.x, panel.y, panel.width, panel.height, at(HULL, 0));
  canvas.hline(panel.x, panel.y, panel.width, at(NEON_YELLOW, 1));
  canvas.hline(panel.x, panel.y + panel.height - 1, panel.width, at(NEON_YELLOW, 0));
  spell('TONIGHT', 1, 1, (x, y) => {
    canvas.set(panel.x + 26 + x, panel.y + 3 + y, at(NEON_YELLOW, 3));
  });
  canvas.fill(gondola.x - 2, gondola.y, 3, gondola.height - 2, at(STEEL, 1));
  canvas.fill(gondola.x, gondola.y, gondola.width, gondola.height, at(STEEL, 2));
  canvas.hline(gondola.x, gondola.y, gondola.width, at(STEEL, 4));
  for (let x = gondola.x + 4; x < gondola.x + gondola.width - 4; x += 6) {
    canvas.fill(x, gondola.y + 4, 4, 5, at(NEON_YELLOW, 2));
    canvas.hline(x, gondola.y + 4, 4, at(NEON_YELLOW, 3));
  }
  canvas.fill(root.x - 3, root.y - 2, 6, 3, at(STEEL, 3));
  canvas.fill(root.x - 1, root.y, 2, 1, at(PALE, 1));
  canvas.fill(tail + 12, belly - 2, 3, 3, at(AVIATION, 1));
  canvas.fill(left + 4, top + height / 2 - 1, 2, 2, at(PALE, 1));
}

export function blimpRect(): { x: number; y: number; width: number; height: number } {
  const reach = Math.ceil(Math.tan(Math.max(...BEAM_ANGLES.map(Math.abs)) + 0.2) * BEAM_LENGTH);
  const x = BLIMP.x - Math.max(BLIMP.length / 2 + 2, reach);
  return {
    x,
    y: BLIMP.y - 8,
    width: (BLIMP.x - x) * 2,
    height: BLIMP.height + 12 + BEAM_LENGTH + 8,
  };
}

export function drawFlyingCar(canvas: Canvas, x: number, y: number, facing: -1 | 1): void {
  canvas.fill(x, y, 16, 4, at(STEEL, 2));
  canvas.hline(x + 1, y, 14, at(STEEL, 4));
  canvas.fill(x + 4, y - 2, 8, 2, at(STEEL, 4));
  canvas.hline(x + 5, y - 2, 6, at(STEEL, 5));
  const nose = facing > 0 ? x + 16 : x - 2;
  const tail = facing > 0 ? x - 2 : x + 16;
  canvas.fill(nose, y + 1, 2, 2, at(PALE, 1));
  canvas.fill(tail, y + 1, 2, 2, at(NEON_ORANGE, 3));
  const back = facing > 0 ? -1 : 1;
  for (let step = 1; step <= 4; step++) {
    canvas.set(tail + (facing > 0 ? 0 : 1) + back * step, y + 2, at(NEON_ORANGE, step < 3 ? 2 : 0));
  }
}
