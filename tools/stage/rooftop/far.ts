/**
 * The far layer (docs/art/decor-rooftop.md §2.1): the megacity past the roof's edge. A night of deep
 * blue, two banks of low cloud lit violet from below, the farthest towers half gone in the haze,
 * the nearer ones darker than their sky, their windows in tall strips, a few small signs, a sky
 * bridge, the far lanes of traffic as points of light; the flying cars and the blimp glide over it
 * (index.ts). Opaque everywhere. Image pixels (STAGE_SCALE).
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

/** Row where the city's glow is at its brightest, just over the towers' feet. */
const GLOW = 360;
/** Last row: the towers stand on it. */
const FOOT = 540;

function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / GLOW, 0), 1);
  return (SKY.length - 1) * t ** 1.4;
}

/** A bank of low cloud along row `base`, its belly lit by the city. */
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
      const level = 0.4 + skyLevel(y) * 0.2 + (depth > 0.72 ? 1.6 : depth > 0.45 ? 0.8 : 0);
      canvas.set(x, y, tone(CLOUD, level, x, y));
    }
  }
}

/** A tower's outline: its shaft, an inset crown, maybe a spire. */
interface Tower {
  readonly x: number;
  readonly width: number;
  readonly top: number;
  readonly crown: number;
  readonly spire: number;
}

function towerMask(canvas: Canvas, { x, width, top, crown, spire }: Tower): Mask {
  const mask = new Mask(canvas.width, canvas.height);
  mask.rect(x, top, width, FOOT - top);
  if (crown > 0) mask.rect(x + 6, top - crown, width - 12, crown);
  if (spire > 0) mask.rect(x + Math.floor(width / 2) - 1, top - crown - spire, 2, spire);
  return mask;
}

/**
 * A row of towers in `ramp`: each a step off the sky, its lit edge on the right (the city's glow),
 * its windows in tall strips, most asleep. Returns the towers, for their lights.
 */
function drawTowers(
  canvas: Canvas,
  random: Random,
  ramp: readonly number[],
  heights: readonly [number, number],
  widths: readonly [number, number],
  windows: number,
): Tower[] {
  const towers: Tower[] = [];
  let x = random.int(-30, 0);
  while (x < canvas.width) {
    const width = random.int(widths[0], widths[1]);
    const top = random.int(heights[0], heights[1]);
    const tower: Tower = {
      x,
      width,
      top,
      crown: random.chance(0.5) ? random.int(10, 30) : 0,
      spire: random.chance(0.3) ? random.int(16, 40) : 0,
    };
    towers.push(tower);
    const mask = towerMask(canvas, tower);
    const from = Math.max(0, top - tower.crown - tower.spire);
    for (let y = from; y < FOOT; y++) {
      for (let px = x; px < x + width; px++) {
        if (!mask.has(px, y)) continue;
        const edge = !mask.has(px + 1, y) || !mask.has(px, y - 1);
        const level = 0.6 + skyLevel(y) * 0.12 + (edge ? 1.4 : 0) - (px - x < 3 ? 0.5 : 0);
        canvas.set(px, y, tone(ramp, level, px, y));
      }
    }
    // Windows in strips, floor by floor: most asleep (the dim step), a few awake.
    for (let column = x + 5; column < x + width - 6; column += 6) {
      if (!random.chance(windows)) continue;
      const awake = random.chance(0.25);
      for (let y = top + 6; y < FOOT - 4; y += 7) {
        if (!random.chance(0.7)) continue;
        canvas.fill(column, y, 3, 4, at(WINDOW, awake && random.chance(0.4) ? 1 : 0));
      }
    }
    x += width + random.int(4, 22);
  }
  return towers;
}

/** The small signs on the nearer towers: short vertical strips of tube, never cyan or magenta. */
function drawTowerSigns(canvas: Canvas, towers: readonly Tower[], random: Random): void {
  const ramps = [NEON_ORANGE, NEON_GREEN, NEON_VIOLET, NEON_YELLOW];
  for (const tower of towers) {
    if (tower.width < 40 || !random.chance(0.5)) continue;
    const ramp = random.pick(ramps);
    const x = tower.x + (random.chance(0.5) ? 3 : tower.width - 7);
    const y = tower.top + random.int(30, 120);
    const height = random.int(30, 70);
    canvas.fill(x - 1, y - 1, 6, height + 2, at(ramp, 0));
    canvas.fill(x, y, 4, height, at(ramp, 1));
    for (let py = y + 2; py < y + height - 2; py += 6) canvas.fill(x + 1, py, 2, 4, at(ramp, 2));
  }
}

/** The aviation lights on the spires and the tallest crowns: a lamp, its glow. */
function drawAviation(canvas: Canvas, towers: readonly Tower[]): void {
  for (const { x, width, top, crown, spire } of towers) {
    if (spire === 0 && top > 140) continue;
    const cx = x + Math.floor(width / 2) - 1;
    const y = top - crown - spire - 2;
    canvas.fill(cx - 1, y - 1, 4, 4, at(AVIATION, 0));
    canvas.fill(cx, y, 2, 2, at(AVIATION, 1));
  }
}

/** A sky bridge between two towers, its windows lit in a band. */
function drawBridge(canvas: Canvas, left: number, right: number, y: number): void {
  canvas.fill(left, y, right - left, 12, at(TOWER, 2));
  canvas.hline(left, y, right - left, at(TOWER, 4));
  for (let x = left + 3; x < right - 4; x += 5) canvas.fill(x, y + 4, 3, 4, at(WINDOW, 1));
}

/** The far lanes of traffic: lines of tiny lights between the towers, too far to move. */
function drawTraffic(canvas: Canvas, random: Random): void {
  for (const y of [252, 284, 318]) {
    for (let x = 0; x < canvas.width; x += random.int(6, 26)) {
      canvas.set(x, y + random.int(-1, 1), at(random.chance(0.5) ? NEON_ORANGE : PALE, 1));
    }
  }
}

/** The far layer, `width` × `height` image pixels, from the rooftop's seed. */
export function drawFar(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  canvas.paint(0, 0, width, height, (x, y) => tone(SKY, skyLevel(y), x, y));
  drawCloud(canvas, seed + 1, 66, 26);
  drawTowers(canvas, streamOf(seed, 'haze'), HAZE, [60, 220], [24, 54], 0.3);
  drawCloud(canvas, seed + 5, 170, 30);
  drawTraffic(canvas, streamOf(seed, 'traffic'));
  const near = drawTowers(canvas, streamOf(seed, 'towers'), TOWER, [150, 300], [44, 96], 0.45);
  drawBridge(canvas, 300, 420, 232);
  drawTowerSigns(canvas, near, streamOf(seed, 'tower signs'));
  drawAviation(canvas, near);
  return canvas;
}

// --- What glides over it (index.ts). ------------------------------------------------------------

/**
 * The blimp as drawn, centered on x, its hull's top at y: low enough to fly under the HUD at the
 * fight's closest framing (world y 71 down, mid.ts NEON), over the fighters' heads. Its beam
 * reaches BEAM_LENGTH down.
 */
export const BLIMP = { x: 600, y: 192, length: 200, height: 54 } as const;
export const BEAM_LENGTH = 230;
/** The searchlight's angles from straight down (radians), one frame each, left to right. */
export const BEAM_ANGLES = [-0.3, -0.15, 0, 0.15, 0.3] as const;
/**
 * The blimp's cycle: every 40 s (so a match sees it once at least), it comes in past the right end
 * at PASS_AT and is gone past the left one PASS steps later; what it shakes loops with it (mid.ts).
 */
export const BLIMP_CYCLE = 2400;
export const PASS_AT = 300;
export const PASS = 1500;
/** Half the beam's spread. */
const BEAM_SPREAD = 0.09;

/**
 * The blimp, nose to the left (it flies leftward): a long hull lit along its top by the city, its
 * fins, its gondola's windows, a lit panel along its side, its lights; under it, the searchlight's
 * beam at `angle`, sparse over what is behind, the rain caught in it.
 */
export function drawBlimp(canvas: Canvas, angle: number): void {
  const { x: cx, y: top, length, height } = BLIMP;
  const left = cx - length / 2;
  const belly = top + height;
  const gondola = { x: cx - 26, y: belly - 4, width: 46, height: 14 };
  // The beam first: the hull hides its root.
  const root = { x: gondola.x + gondola.width / 2, y: gondola.y + gondola.height };
  for (let y = root.y; y < root.y + BEAM_LENGTH; y++) {
    const depth = (y - root.y) / BEAM_LENGTH;
    const center = root.x + Math.tan(angle) * (y - root.y);
    const half = 2 + Math.tan(BEAM_SPREAD) * (y - root.y) * (1 + Math.abs(angle));
    for (let x = Math.floor(center - half); x <= Math.ceil(center + half); x++) {
      const off = Math.abs(x - center) / half;
      if (off > 1) continue;
      // Sparser toward its edges and its end: a beam of light in the air, not a cone of paint.
      const density = (1 - off ** 2) * (1 - depth * 0.7) * 1.15;
      const grain = noise(83, x, y, 3) * 0.5 + ((x * 7 + y * 13) % 9) / 18;
      if (grain > density) continue;
      canvas.set(x, y, at(BEAM, off < 0.3 && depth < 0.3 ? 2 : off < 0.7 ? 1 : 0));
    }
    // The rain in the beam: short streaks leaning with the wind (src/render/stage-rain.ts).
    for (let x = Math.floor(center - half); x <= Math.ceil(center + half); x++) {
      if (Math.abs(x - center) > half * 0.8 || noise(89, x, y, 1) < 0.985) continue;
      for (let drop = 0; drop < 6; drop++) {
        canvas.set(x - Math.round((drop * 4) / 14), y - drop, at(BEAM_DROP, depth < 0.6 ? 2 : 1));
      }
    }
  }
  // The hull: an ellipse, its top lit by the city's glow, its belly dark.
  canvas.paint(left, top, length, height, (x, y) => {
    const u = (x + 0.5 - cx) / (length / 2);
    const v = (y + 0.5 - (top + height / 2)) / (height / 2);
    // Blunter at the nose (left), tapering to the tail.
    const shape = u < 0 ? u * u : (u * 1.08) ** 2;
    if (shape + v * v > 1) return undefined;
    const level = 2.6 - v * 2 - (u > 0.6 ? 0.6 : 0) + (v < -0.8 ? 1 : 0);
    const seam = Math.round(x - left) % 22 === 0 ? -0.6 : 0;
    return tone(HULL, level + seam, x, y);
  });
  // The fins at the tail.
  const tail = left + length - 26;
  for (let row = 0; row < 18; row++) {
    canvas.hline(tail + row, top - 6 + row, 14 - Math.floor(row / 2), at(HULL, 3));
    canvas.hline(tail + row, belly + 6 - row, 14 - Math.floor(row / 2), at(HULL, 1));
  }
  canvas.hline(tail, top - 6, 14, at(HULL, 5));
  // The lit panel along its side: a dark band, a word in yellow, never a brand.
  const panel = { x: cx - 52, y: top + 18, width: 92, height: 13 };
  canvas.fill(panel.x, panel.y, panel.width, panel.height, at(HULL, 0));
  canvas.hline(panel.x, panel.y, panel.width, at(NEON_YELLOW, 0));
  spell('TONIGHT', 1, 1, (x, y) => {
    canvas.set(panel.x + 26 + x, panel.y + 3 + y, at(NEON_YELLOW, 2));
  });
  // The gondola, its windows lit.
  canvas.fill(gondola.x, gondola.y, gondola.width, gondola.height, at(STEEL, 2));
  canvas.hline(gondola.x, gondola.y, gondola.width, at(STEEL, 4));
  for (let x = gondola.x + 4; x < gondola.x + gondola.width - 4; x += 6) {
    canvas.fill(x, gondola.y + 4, 4, 5, at(NEON_YELLOW, 1));
  }
  // The searchlight's housing and lens, its lights: red at the tail, a pale one at the nose.
  canvas.fill(root.x - 3, root.y - 2, 6, 3, at(STEEL, 3));
  canvas.fill(root.x - 1, root.y, 2, 1, at(PALE, 1));
  canvas.fill(tail + 12, belly - 2, 3, 3, at(AVIATION, 1));
  canvas.fill(left + 4, top + height / 2 - 1, 2, 2, at(PALE, 0));
}

/** The rectangle the blimp and its beam take as drawn, at any of its angles. */
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

/** A flying car far off, `facing` its way: a dark body, a pale headlight, an orange tail. */
export function drawFlyingCar(canvas: Canvas, x: number, y: number, facing: -1 | 1): void {
  canvas.fill(x, y, 16, 4, at(STEEL, 3));
  canvas.fill(x + 4, y - 2, 8, 2, at(STEEL, 4));
  canvas.hline(x + 5, y - 2, 6, at(STEEL, 5));
  const nose = facing > 0 ? x + 16 : x - 2;
  const tail = facing > 0 ? x - 2 : x + 16;
  canvas.fill(nose, y + 1, 2, 2, at(PALE, 1));
  canvas.fill(tail, y + 1, 2, 2, at(NEON_ORANGE, 3));
  // Its tail light's streak in the wet air.
  const back = facing > 0 ? -1 : 1;
  for (let step = 1; step <= 4; step++) {
    canvas.set(tail + (facing > 0 ? 0 : 1) + back * step, y + 2, at(NEON_ORANGE, step < 3 ? 1 : 0));
  }
}
