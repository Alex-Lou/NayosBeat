/**
 * The far layer (docs/art/decor-dock.md §2.1): what shows over L'Entrepôt's roof and down the alley
 * on the left. The street's night sky, the city's towers with a few windows awake, a smokestack and
 * a water tank on the roofs around; down the alley, the back street: low warehouses, the elevated
 * line on its girders, a lamp. Opaque everywhere. Image pixels (STAGE_SCALE).
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import { BRICK, CLOUD, DISTANT, DISTANT_LIT, SKY, SODIUM, STEAM, STEEL } from './palette.ts';

/** Row where the city's glow is at its brightest, just over the roofs. */
const GLOW = 300;
/** Row of the back street's ground, seen down the alley. */
const STREET = 430;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / GLOW, 0), 1);
  return (SKY.length - 1) * t ** 1.5;
}

/** A bank of low cloud along row `base`, its underside lit by the city. */
function drawCloud(canvas: Canvas, seed: number, base: number, height: number): void {
  for (let x = 0; x < canvas.width; x++) {
    const presence = noise(seed, x, 0, 220);
    if (presence < 0.42) continue;
    const swell = (presence - 0.42) / 0.58;
    const bumps = noise(seed + 1, x, 0, 30) * 0.7 + noise(seed + 2, x, 0, 8) * 0.3;
    const top = Math.round(base - height * swell * (0.35 + bumps * 0.65));
    const bottom = Math.round(base + 3 + noise(seed + 3, x, 0, 20) * 4 * swell);
    for (let y = top; y < bottom; y++) {
      const depth = (y - top) / Math.max(bottom - top, 1);
      const level = 0.6 + skyLevel(y) * 0.25 + (depth > 0.7 ? 1.4 : depth > 0.45 ? 0.7 : 0);
      canvas.set(x, y, tone(CLOUD, level, x, y));
    }
  }
}

/** The city's towers along the horizon: stepped blocks a step off the sky, windows here and there. */
function drawTowers(canvas: Canvas, random: Random): void {
  let x = -10;
  while (x < canvas.width) {
    const width = random.int(36, 84);
    const top = random.int(40, 190);
    const inset = random.chance(0.5) ? random.int(4, 10) : 0;
    const tier = inset > 0 ? random.int(10, 26) : 0;
    const mask = new Mask(canvas.width, canvas.height);
    mask.rect(x, top, width, STREET - top);
    if (tier > 0) mask.rect(x + inset, top - tier, width - inset * 2, tier);
    for (let y = Math.max(0, top - tier); y < STREET; y++) {
      for (let px = x; px < x + width; px++) {
        if (!mask.has(px, y)) continue;
        const edge = !mask.has(px, y - 1) || !mask.has(px + 1, y);
        const level = Math.max(skyLevel(y) * 0.3 - 0.2, 0) + (edge ? 1.3 : 0);
        canvas.set(px, y, tone(DISTANT, level, px, y));
      }
    }
    // Windows floor by floor: most asleep, a few runs awake.
    for (let y = top + 8; y < STREET - 10; y += 9) {
      if (!random.chance(0.35)) continue;
      const from = x + 4 + random.int(0, Math.max(0, width - 20));
      const run = random.int(2, 5);
      for (let w = 0; w < run; w++) {
        const wx = from + w * 6;
        if (wx + 3 >= x + width - 3) break;
        canvas.fill(wx, y, 3, 4, at(DISTANT_LIT, random.int(0, 2)));
      }
    }
    x += width + random.int(-8, 6);
  }
}

/** A brick smokestack on a roof nearer than the towers, a plume of steam bent by the wind. */
function drawStack(canvas: Canvas, x: number, top: number): void {
  const width = 26;
  canvas.paint(x, top, width, STREET - top, (px, py) => {
    const course = Math.floor(py / 4);
    const joint = py % 4 === 3 || (px + (course % 2) * 3) % 6 === 0;
    const side = px - x < 4 ? 1.2 : px - x > width - 5 ? -0.4 : 0.4;
    return tone(BRICK, 1 + side + (joint ? -0.6 : 0), px, py);
  });
  canvas.fill(x - 3, top, width + 6, 5, at(BRICK, 3));
  canvas.hline(x - 3, top, width + 6, at(BRICK, 5));
  // The plume, leaning left with the wind, thinning out.
  for (let y = top - 2; y > top - 70; y--) {
    const rise = top - y;
    const cx = x + width / 2 - rise * 0.9 - Math.sin(rise / 9) * 3;
    const half = 6 + rise * 0.22;
    for (let px = Math.round(cx - half); px < cx + half; px++) {
      const puff = noise(61, px, y, 9) - rise / 120;
      if (puff < 0.38) continue;
      canvas.set(px, y, tone(STEAM, 0.4 + puff * 1.2 - rise / 60, px, y));
    }
  }
}

/** A wooden water tank on its stilts, the roofs' old silhouette. */
function drawTank(canvas: Canvas, cx: number, base: number): void {
  const width = 46;
  const left = cx - width / 2;
  const legs = 30;
  for (const lx of [left + 4, left + width - 7, left + width / 2 - 1]) {
    canvas.fill(lx, base - legs, 3, legs, at(STEEL, 1));
  }
  canvas.line(left + 4, base - legs, left + width - 5, base - 4, at(STEEL, 1));
  canvas.line(left + width - 5, base - legs, left + 4, base - 4, at(STEEL, 1));
  const top = base - legs - 52;
  canvas.paint(left, top, width, 52, (px, py) => {
    const hoop = (py - top) % 13 === 12 ? -0.7 : 0;
    const side = px - left > width - 10 ? 0.9 : px - left < 4 ? -0.3 : 0.2;
    return tone(DISTANT, 1.6 + side + hoop, px, py);
  });
  // The conical roof.
  for (let row = 0; row < 16; row++) {
    const half = (width / 2 + 2) * (row / 15);
    canvas.hline(Math.round(cx - half), top - 16 + row, Math.round(half * 2), at(DISTANT, 2));
  }
  canvas.hline(Math.round(cx - width / 2 - 2), top - 1, width + 4, at(DISTANT, 3));
}

/**
 * The back street down the alley: low warehouses in the dark, the elevated line crossing on its
 * girders, a street lamp, the street's wet glint.
 */
function drawBackStreet(canvas: Canvas, random: Random): void {
  const right = 460;
  // Low warehouses, their sawtooth roofs.
  let x = -6;
  while (x < right) {
    const width = random.int(70, 120);
    const roof = random.int(250, 290);
    canvas.paint(x, roof - 14, width, STREET - roof + 14, (px, py) => {
      const tooth = (px - x) % 28;
      if (py < roof && py < roof - 14 + tooth / 2) return undefined;
      const level = 1.2 + (py - roof) / 220 + (tooth === 0 && py < roof ? 1 : 0);
      return tone(DISTANT, level, px, py);
    });
    for (let wx = x + 10; wx < x + width - 14; wx += 22) {
      if (random.chance(0.25)) canvas.fill(wx, roof + 30, 8, 10, at(DISTANT_LIT, 0));
    }
    x += width + random.int(2, 10);
  }
  // The elevated line on its girders, crossing the back street.
  const deck = 318;
  canvas.paint(0, deck, right, 14, (px, py) => {
    if (py === deck) return at(STEEL, 3);
    if ((px >> 1) % 9 === 0 && py < deck + 10) return at(STEEL, 2);
    return at(STEEL, 1);
  });
  for (const px of [96, 300]) {
    canvas.fill(px, deck + 14, 12, STREET - deck - 14, at(STEEL, 1));
    canvas.vline(px, deck + 14, STREET - deck - 14, at(STEEL, 2));
  }
  // The street, dark and wet, a lamp and its glint.
  canvas.paint(0, STREET, right, canvas.height - STREET, (px, py) =>
    tone(DISTANT, 1 - (py - STREET) / 60 + (noise(19, px, py, 14) - 0.5) * 0.6, px, py),
  );
  // The lamp stands where the alley's gate shows it over the NO PARKING plate (mid.ts), away
  // from the cat on the dumpster.
  const lamp = 84;
  canvas.fill(lamp, 302, 3, STREET - 302, at(STEEL, 1));
  canvas.fill(lamp - 6, 300, 10, 3, at(STEEL, 2));
  canvas.fill(lamp - 5, 303, 6, 2, at(SODIUM, 3));
  canvas.paint(lamp - 30, STREET, 60, 16, (px, py) =>
    (px + py) % 2 === 0 && Math.abs(px - lamp) < 22 - (py - STREET) ? at(SODIUM, 0) : undefined,
  );
}

/** The far layer, `width` × `height` image pixels, from the dock's seed. */
export function drawFar(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => tone(SKY, skyLevel(y), x, y));
  drawCloud(canvas, seed + 1, 70, 22);
  drawCloud(canvas, seed + 5, 150, 30);
  drawTowers(canvas, streamOf(seed, 'towers'));
  drawStack(canvas, 820, 96);
  drawTank(canvas, 1010, 214);
  drawBackStreet(canvas, streamOf(seed, 'back street'));
  // Over the alley, on a warehouse's roof (after it, so it stands in front).
  drawTank(canvas, 150, 262);
  return canvas;
}
