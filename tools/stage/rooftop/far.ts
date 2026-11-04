/**
 * The far layer (docs/art/decor-rooftop.md §2.1): the megacity of Néon Underground (2090) past the
 * roof's edge, in high-detail pixel art and 3D perspective (docs/art/proprete.md). Three depth
 * planes of skyscrapers with curtain walls, pyramidal arcologies, diagonal exosframes, rooftop
 * cranes, multi-tier sky bridges, vertical & horizontal neon signs, traffic streams, and the blimp
 * and flying cars gliding across (index.ts).
 */

import { Canvas, Mask, at, dithered } from '../kit/canvas.ts';
import { spell, spellHan } from '../kit/font.ts';
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
  SODIUM,
  STEEL,
  TOWER,
  WINDOW,
} from './palette.ts';

const GLOW = 390;
const FOOT = 540;

function hdTone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const step = dithered(fraction, x >> 1, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? 0;
}

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / GLOW, 0), 1);
  return (SKY.length - 1) * t ** 1.3;
}

function drawSkyDome(canvas: Canvas): void {
  const { width, height } = canvas;
  const cx = 620;
  const cy = 240;
  canvas.paint(0, 0, width, height, (x, y) => {
    const d = Math.hypot((x - cx) / 480, (y - cy) / 220);
    const dome = d < 1 ? (1 - d * d) * 1.25 : 0;
    return hdTone(SKY, skyLevel(y) + dome, x, y);
  });
  const mx = 196;
  const my = 62;
  for (let y = my - 32; y <= my + 32; y++) {
    for (let x = mx - 32; x <= mx + 32; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d > 30) continue;
      if (d > 17) {
        if (dithered((30 - d) / 13, x >> 1, y)) canvas.set(x, y, at(CLOUD, d < 22 ? 3 : 2));
        continue;
      }
      const cut = Math.hypot(x - (mx - 6), y - (my - 3)) < 14.5;
      if (!cut) canvas.set(x, y, at(WINDOW, d < 11 ? 3 : d < 15 ? 2 : 1));
    }
  }
}

function drawCloud(canvas: Canvas, seed: number, base: number, height: number): void {
  for (let x = 0; x < canvas.width; x++) {
    const presence = noise(seed, x, 0, 210);
    if (presence < 0.32) continue;
    const swell = (presence - 0.32) / 0.68;
    const bumps = noise(seed + 1, x, 0, 36) * 0.7 + noise(seed + 2, x, 0, 10) * 0.3;
    const top = Math.round(base - height * swell * (0.35 + bumps * 0.65));
    const bottom = Math.round(base + 4 + noise(seed + 3, x, 0, 24) * 5 * swell);
    for (let y = top; y < bottom; y++) {
      const depth = (y - top) / Math.max(bottom - top, 1);
      const level = depth * 3.4;
      canvas.set(x, y, hdTone(CLOUD, level, x, y));
    }
    if (bottom > top + 4) {
      canvas.hline(x, bottom - 1, 1, at(NEON_VIOLET, 0));
    }
  }
}

function drawArcology(canvas: Canvas, cx: number, top: number, baseWidth: number): void {
  const height = FOOT - top;
  for (let y = top; y < FOOT; y++) {
    const t = (y - top) / height;
    const half = Math.round(18 + (baseWidth / 2 - 18) * t ** 0.88);
    const left = cx - half;
    const right = cx + half;
    const tier = (y - top) % 28 === 0;
    for (let x = left; x < right; x++) {
      const u = (x - cx) / Math.max(1, half);
      if (x <= left + 2) {
        canvas.set(x, y, at(HAZE, 0));
      } else if (x >= right - 3 || y === top) {
        canvas.set(x, y, at(HAZE, 3));
      } else if (tier) {
        canvas.set(x, y, at(NEON_VIOLET, 0));
      } else {
        canvas.set(x, y, hdTone(HAZE, 1.2 + (u > 0.35 ? 1.1 : 0) + t * 0.8, x, y));
      }
    }
    if (y - top > 16 && (y - top) % 10 === 0) {
      for (let wx = left + 10; wx < right - 12; wx += 8) {
        if ((wx + y) % 16 < 10) {
          canvas.fill(wx, y, 4, 2, at(WINDOW, (wx + y) % 5 === 0 ? 1 : 0));
        }
      }
    }
  }
  canvas.vline(cx, top - 34, 34, at(STEEL, 3));
  canvas.fill(cx - 1, top - 36, 3, 3, at(AVIATION, 1));
}

interface Tower {
  readonly x: number;
  readonly width: number;
  readonly top: number;
  readonly crown: number;
  readonly spire: number;
  readonly bevel: boolean;
  readonly exo: boolean;
}

function towerMask(canvas: Canvas, { x, width, top, crown, spire, bevel }: Tower): Mask {
  const mask = new Mask(canvas.width, canvas.height);
  if (bevel) {
    const cut = Math.min(16, Math.floor(width * 0.24));
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
    mask.rect(x + 6, top - crown, width - 12, crown);
    if (crown > 16) mask.rect(x + 14, top - crown - 10, Math.max(8, width - 28), 10);
  }
  if (spire > 0) {
    mask.rect(x + Math.floor(width / 2) - 1, top - crown - spire, 2, spire);
    mask.rect(
      x + Math.floor(width / 2) - 3,
      top - crown - Math.floor(spire * 0.4),
      6,
      Math.floor(spire * 0.4),
    );
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
  detailed: boolean,
): Tower[] {
  const towers: Tower[] = [];
  const center = canvas.width / 2;
  let x = random.int(-24, 0);
  while (x < canvas.width) {
    const width = random.int(widths[0], widths[1]);
    const top = random.int(heights[0], heights[1]);
    const tower: Tower = {
      x,
      width,
      top,
      crown: random.chance(0.65) ? random.int(12, 32) : 0,
      spire: random.chance(0.45) ? random.int(18, 44) : 0,
      bevel: random.chance(0.4),
      exo: detailed && width >= 64 && random.chance(0.55),
    };
    towers.push(tower);
    const mask = towerMask(canvas, tower);
    const from = Math.max(0, top - tower.crown - tower.spire - 12);
    const sideW = Math.max(6, Math.round(width * 0.18));
    const litRight = x + width / 2 < center;
    for (let y = from; y < FOOT; y++) {
      const hgrad = ((y - top) / Math.max(1, FOOT - top)) * 1.3;
      const spandrel = detailed && y - top > 4 && (y - top) % 8 === 0;
      for (let px = x; px < x + width; px++) {
        if (!mask.has(px, y)) continue;
        const topEdge = !mask.has(px, y - 1);
        const outerRight = !mask.has(px + 1, y);
        const outerLeft = !mask.has(px - 1, y);
        const inSide = litRight ? px >= x + width - sideW : px < x + sideW;
        if (topEdge || (litRight ? outerRight : outerLeft)) {
          canvas.set(px, y, at(ramp, ramp.length - 1));
          continue;
        }
        if (litRight ? outerLeft : outerRight) {
          canvas.set(px, y, at(ramp, 0));
          continue;
        }
        if (inSide) {
          canvas.set(px, y, hdTone(ramp, Math.min(ramp.length - 1, 2.3 + hgrad * 0.7), px, y));
          continue;
        }
        const level = (spandrel ? 0.35 : 1.15) + hgrad * 0.65;
        canvas.set(px, y, hdTone(ramp, level, px, y));
      }
    }
    if (tower.exo) {
      const fl = litRight ? x + 4 : x + sideW + 2;
      const fr = litRight ? x + width - sideW - 2 : x + width - 4;
      for (let by = top + 12; by < FOOT - 40; by += 44) {
        canvas.line(fl, by, fr, by + 44, at(STEEL, 2), 2);
        canvas.line(fr, by, fl, by + 44, at(STEEL, 2), 2);
        canvas.hline(fl, by, fr - fl, at(STEEL, 3));
      }
    }
    const faceLeft = litRight ? x + 4 : x + sideW + 3;
    const faceRight = litRight ? x + width - sideW - 4 : x + width - 5;
    for (let column = faceLeft; column < faceRight - 3; column += 6) {
      if (!random.chance(windows)) continue;
      const awake = random.chance(0.36);
      for (let y = top + 10; y < FOOT - 6; y += 8) {
        if (!random.chance(0.76)) continue;
        const wStep = awake && random.chance(0.45) ? (random.chance(0.25) ? 2 : 1) : 0;
        canvas.fill(column, y, 3, 4, at(WINDOW, wStep));
      }
    }
    if (detailed && random.chance(0.4) && top > 110) {
      const bandY = top + 6;
      const bandRamp = random.chance(0.5) ? NEON_VIOLET : NEON_ORANGE;
      canvas.hline(faceLeft, bandY, faceRight - faceLeft, at(bandRamp, 2));
      canvas.hline(faceLeft, bandY + 1, faceRight - faceLeft, at(bandRamp, 0));
    }
    x += width + random.int(2, 14);
  }
  return towers;
}

function drawTowerSigns(canvas: Canvas, towers: readonly Tower[], random: Random): void {
  const ramps = [NEON_ORANGE, NEON_GREEN, NEON_VIOLET, NEON_YELLOW];
  const glyphs = ['ネ', 'オ', 'ン', '大', '吉', '衣'];
  for (const tower of towers) {
    if (tower.width < 42 || !random.chance(0.72)) continue;
    const ramp = random.pick(ramps);
    const x = tower.x + (random.chance(0.5) ? 4 : tower.width - 14);
    const y = tower.top + random.int(22, 96);
    const chars = random.int(2, 3);
    const height = chars * 12 + 6;
    canvas.fill(x - 2, y - 2, 14, height + 4, at(ramp, 0));
    canvas.fill(x - 1, y - 1, 12, height + 2, at(STEEL, 0));
    canvas.hline(x - 1, y - 1, 12, at(STEEL, 3));
    canvas.hline(x - 1, y + height, 12, at(STEEL, 3));
    for (let c = 0; c < chars; c++) {
      const ch = glyphs[(tower.x + c) % glyphs.length] ?? '大';
      spellHan(ch, 1, 0, (px, py) => {
        canvas.set(x + 1 + px, y + 2 + c * 12 + py, at(ramp, py % 3 === 0 ? 3 : 2));
      });
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
  canvas.fill(left, y - 3, right - left, 2, at(STEEL, 2));
  canvas.fill(left, y, right - left, 14, at(TOWER, 2));
  canvas.hline(left, y, right - left, at(TOWER, 4));
  canvas.hline(left, y + 13, right - left, at(NEON_VIOLET, 1));
  for (let x = left + 4; x < right - 6; x += 12) {
    canvas.line(x, y + 14, x + 6, y + 20, at(STEEL, 1));
    canvas.line(x + 6, y + 20, x + 12, y + 14, at(STEEL, 1));
  }
  canvas.hline(left, y + 20, right - left, at(STEEL, 2));
  for (let x = left + 4; x < right - 4; x += 6) {
    canvas.fill(x, y + 4, 3, 5, at(WINDOW, (x >> 1) % 3 === 0 ? 2 : 1));
  }
}

function drawTraffic(canvas: Canvas, random: Random): void {
  for (const y of [246, 280, 314, 344]) {
    for (let x = 0; x < canvas.width; x += random.int(8, 22)) {
      const ramp = random.chance(0.5) ? NEON_ORANGE : PALE;
      const ly = y + random.int(-1, 1);
      canvas.fill(x, ly, 4, 1, at(ramp, 1));
      canvas.fill(x + 1, ly, 2, 1, at(ramp, ramp === NEON_ORANGE ? 2 : 1));
    }
  }
  for (let x = 20; x < canvas.width; x += 48) {
    canvas.fill(x, 356, 6, 2, at(SODIUM, 1));
    canvas.set(x + 2, 356, at(SODIUM, 2));
  }
}

export function drawFar(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  drawSkyDome(canvas);
  drawCloud(canvas, seed + 1, 58, 26);
  drawArcology(canvas, 610, 28, 210);
  drawArcology(canvas, 1020, 48, 160);
  drawTowers(canvas, streamOf(seed, 'haze'), HAZE, [36, 170], [28, 62], 0.36, false);
  drawCloud(canvas, seed + 5, 156, 30);
  drawTraffic(canvas, streamOf(seed, 'traffic'));
  const near = drawTowers(
    canvas,
    streamOf(seed, 'towers'),
    TOWER,
    [96, 256],
    [50, 108],
    0.54,
    true,
  );
  drawBridge(canvas, 250, 440, 224);
  drawBridge(canvas, 730, 940, 262);
  drawBridge(canvas, 40, 210, 302);
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
  const gondola = { x: cx - 28, y: belly - 4, width: 50, height: 14 };
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
    const rib = Math.abs(v + 0.35) < 0.05 || Math.abs(v - 0.35) < 0.05 ? 0.5 : 0;
    const seam = Math.round(x - left) % 20 === 0 ? -0.7 : 0;
    const level = 2.8 - v * 2.1 - (u > 0.65 ? 0.6 : 0) + (v < -0.75 ? 1.2 : 0) + rib + seam;
    return hdTone(HULL, level, x, y);
  });
  const tail = left + length - 26;
  for (let row = 0; row < 18; row++) {
    canvas.hline(tail + row, top - 6 + row, 14 - Math.floor(row / 2), at(HULL, 3));
    canvas.hline(tail + row, belly + 6 - row, 14 - Math.floor(row / 2), at(HULL, 1));
  }
  canvas.hline(tail, top - 6, 14, at(HULL, 5));
  const panel = { x: cx - 54, y: top + 17, width: 96, height: 15 };
  canvas.fill(panel.x - 1, panel.y - 1, panel.width + 2, panel.height + 2, at(STEEL, 3));
  canvas.fill(panel.x, panel.y, panel.width, panel.height, at(HULL, 0));
  canvas.hline(panel.x + 1, panel.y + 1, panel.width - 2, at(NEON_VIOLET, 2));
  canvas.hline(panel.x + 1, panel.y + panel.height - 2, panel.width - 2, at(NEON_VIOLET, 2));
  for (let bx = panel.x + 4; bx < panel.x + 22; bx += 3) {
    const bh = 3 + ((bx * 5) % 7);
    canvas.fill(bx, panel.y + panel.height - 3 - bh, 2, bh, at(NEON_GREEN, 2));
  }
  spell('TONIGHT', 1, 1, (x, y) => {
    canvas.set(panel.x + 28 + x, panel.y + 4 + y, at(NEON_YELLOW, 3));
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
