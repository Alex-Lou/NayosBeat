/**
 * The far layer (docs/art/decor-rue.md §3.1): the night sky, the city's towers, the elevated line
 * and the rooftops nearest it. Opaque everywhere: nothing is behind it. Image pixels (STAGE_SCALE).
 */

import { Canvas, Mask, at, tone } from './canvas.ts';
import { CLOUD, DISTANT, DISTANT_LIT, SKY, STEEL } from './palette.ts';
import { noise, streamOf, type Random } from './random.ts';

/** Image row of the ground line, under the floor: nothing below it shows. */
const GROUND = 460;

/** Row where the city's glow is at its brightest, just over the rooftops. */
const GLOW = 270;

/** The sky's step at row y: long dark bands up high, the city's glow packed near the rooftops. */
function skyLevel(y: number): number {
  const t = Math.min(Math.max(y / GLOW, 0), 1);
  return (SKY.length - 1) * t ** 1.6;
}

function drawSky(canvas: Canvas): void {
  canvas.paint(0, 0, canvas.width, canvas.height, (x, y) => tone(SKY, skyLevel(y), x, y));
}

/**
 * A bank of low cloud along row `base`: a bumpy top, a flatter underside lit by the city below
 * (a step or two lighter), drifting in and out along the width.
 */
function drawCloud(canvas: Canvas, seed: number, base: number, height: number): void {
  for (let x = 0; x < canvas.width; x++) {
    const presence = noise(seed, x, 0, 260);
    if (presence < 0.45) continue;
    const swell = (presence - 0.45) / 0.55;
    const bumps = noise(seed + 1, x, 0, 34) * 0.7 + noise(seed + 2, x, 0, 9) * 0.3;
    const top = Math.round(base - height * swell * (0.35 + bumps * 0.65));
    const bottom = Math.round(base + 3 + noise(seed + 3, x, 0, 22) * 4 * swell);
    for (let y = top; y < bottom; y++) {
      const depth = (y - top) / Math.max(bottom - top, 1);
      const level = 0.6 + skyLevel(y) * 0.25 + (depth > 0.7 ? 1.4 : depth > 0.45 ? 0.7 : 0);
      canvas.set(x, y, tone(CLOUD, level, x, y));
    }
  }
}

interface Tower {
  readonly left: number;
  readonly width: number;
  readonly top: number;
  /** Narrower tiers on top, each as [inset, height]. */
  readonly tiers: readonly (readonly [number, number])[];
  readonly spire: number;
}

/** A distant tower: a stepped silhouette, a step darker than the sky, a few windows awake. */
function drawTower(canvas: Canvas, tower: Tower, random: Random): void {
  const { left, width, top, tiers, spire } = tower;
  const mask = new Mask(canvas.width, canvas.height);
  mask.rect(left, top, width, GROUND - top);
  let tierTop = top;
  for (const [inset, height] of tiers) {
    tierTop -= height;
    mask.rect(left + inset, tierTop, width - inset * 2, height);
  }
  if (spire > 0) mask.rect(left + Math.floor(width / 2) - 1, tierTop - spire, 2, spire);
  for (let y = 0; y < GROUND; y++) {
    for (let x = left; x < left + width; x++) {
      if (!mask.has(x, y)) continue;
      // Haze: the lower, the closer to the glowing sky behind.
      const level = Math.max(skyLevel(y) * 0.32 - 0.2, 0);
      // The edges facing the glow catch it: the roofline, and a strip down the right side.
      const edge = !mask.has(x, y - 1) || !mask.has(x + 1, y) || !mask.has(x + 2, y);
      const shade = !mask.has(x - 1, y) ? -0.4 : 0;
      canvas.set(x, y, tone(DISTANT, level + (edge ? 1.4 : 0) + shade, x, y));
    }
  }
  // Windows floor by floor: most floors asleep, some with a run of lit rooms, an office floor
  // lit end to end now and then.
  for (let y = top + 8; y < GROUND - 8; y += 9) {
    const office = random.chance(0.08);
    if (!office && !random.chance(0.45)) continue;
    const awake = office ? 0.95 : random.next() * 0.55;
    const bright = office || random.chance(0.2) ? 1 : 0;
    for (let x = left + 5; x < left + width - 6; x += 7) {
      if (random.chance(awake)) canvas.fill(x, y, 3, 3, at(DISTANT_LIT, bright));
    }
  }
  // An aircraft warning light on the tallest: steady, never blinking.
  if (top + Math.max(0, ...tiers.map(([, h]) => h)) < 150) {
    const tipY = tierTop - spire - 2;
    canvas.fill(left + Math.floor(width / 2) - 1, tipY, 2, 2, at(DISTANT_LIT, 2));
  }
}

function drawTowers(canvas: Canvas, random: Random): void {
  const towers: Tower[] = [
    { left: 40, width: 74, top: 150, tiers: [[8, 22]], spire: 0 },
    { left: 150, width: 52, top: 214, tiers: [], spire: 0 },
    {
      left: 268,
      width: 96,
      top: 120,
      tiers: [
        [10, 26],
        [24, 18],
      ],
      spire: 24,
    },
    { left: 404, width: 60, top: 176, tiers: [[6, 16]], spire: 0 },
    {
      left: 520,
      width: 118,
      top: 92,
      tiers: [
        [12, 30],
        [30, 20],
        [46, 14],
      ],
      spire: 34,
    },
    { left: 690, width: 70, top: 160, tiers: [], spire: 12 },
    { left: 800, width: 88, top: 128, tiers: [[10, 18]], spire: 0 },
    { left: 932, width: 58, top: 196, tiers: [[8, 12]], spire: 0 },
    {
      left: 1030,
      width: 104,
      top: 138,
      tiers: [
        [14, 24],
        [30, 16],
      ],
      spire: 20,
    },
  ];
  for (const tower of towers) drawTower(canvas, tower, random);
}

/** Top and bottom rows of the elevated line's plate girder. */
const DECK_TOP = 152;
const DECK_BOTTOM = 176;
/** Spacing of its bents: one column every so many pixels. */
const BENT_SPACING = 300;

/**
 * The elevated line: a riveted plate girder lit on its top edge, on columns braced to it by
 * knees. Wide and sparse: no fine lattice to shimmer when the screen shakes.
 */
function drawViaduct(canvas: Canvas): void {
  const { width } = canvas;
  // The girder: its lit top lip, its face, the shadow under its bottom flange.
  canvas.fill(0, DECK_TOP - 4, width, 2, at(STEEL, 2));
  canvas.fill(0, DECK_TOP - 2, width, 2, at(STEEL, 4));
  canvas.fill(0, DECK_TOP, width, DECK_BOTTOM - DECK_TOP, at(STEEL, 1));
  canvas.fill(0, DECK_TOP, width, 2, at(STEEL, 3));
  canvas.fill(0, DECK_BOTTOM - 3, width, 3, at(STEEL, 0));
  // Stiffeners and rivets along the face, every 30 px.
  for (let x = 6; x < width; x += 30) {
    canvas.fill(x, DECK_TOP + 3, 2, DECK_BOTTOM - DECK_TOP - 6, at(STEEL, 2));
    canvas.set(x + 8, DECK_TOP + 6, at(STEEL, 3));
    canvas.set(x + 20, DECK_TOP + 6, at(STEEL, 3));
  }
  // The guard rail on top: posts every 30 px under a rail.
  canvas.fill(0, DECK_TOP - 14, width, 2, at(STEEL, 2));
  for (let x = 14; x < width; x += 30) canvas.fill(x, DECK_TOP - 12, 2, 8, at(STEEL, 1));
  // Bents: a column, its two knee braces, its foot hidden by the rooftops.
  for (let x = 120; x < width; x += BENT_SPACING) {
    canvas.fill(x - 7, DECK_BOTTOM, 14, GROUND - DECK_BOTTOM, at(STEEL, 1));
    canvas.fill(x - 7, DECK_BOTTOM, 2, GROUND - DECK_BOTTOM, at(STEEL, 3));
    canvas.fill(x + 5, DECK_BOTTOM, 2, GROUND - DECK_BOTTOM, at(STEEL, 0));
    for (const side of [-1, 1]) {
      canvas.line(x + side * 7, DECK_BOTTOM + 34, x + side * 40, DECK_BOTTOM, at(STEEL, 1), 3);
    }
    // The cap plate under the girder.
    canvas.fill(x - 12, DECK_BOTTOM, 24, 4, at(STEEL, 2));
  }
}

interface Rooftop {
  readonly left: number;
  readonly width: number;
  readonly top: number;
  /** Where a water tower stands on it, if one does (its left edge). */
  readonly tank?: number;
}

/** A water tower: a wooden barrel on a steel stand, its conical cap, lit on its left. */
function drawWaterTower(canvas: Canvas, left: number, roof: number): void {
  const legs = 22;
  const barrel = 40;
  const width = 30;
  const top = roof - legs - barrel;
  for (const x of [left + 3, left + width - 5]) canvas.fill(x, roof - legs, 2, legs, at(STEEL, 1));
  canvas.line(left + 4, roof - 2, left + width - 4, roof - legs + 2, at(STEEL, 1));
  canvas.line(left + 4, roof - legs + 2, left + width - 4, roof - 2, at(STEEL, 1));
  canvas.fill(left, top, width, barrel, at(DISTANT, 0));
  canvas.fill(left, top, 3, barrel, at(DISTANT, 2));
  // Its hoops.
  for (const y of [top + 9, top + 20, top + 31]) canvas.hline(left, y, width, at(STEEL, 0));
  // The cone: rows narrowing to a point.
  for (let row = 0; row < 14; row++) {
    const inset = Math.round((row / 14) * (width / 2 - 1));
    canvas.hline(
      left + inset - 2 + 2,
      top - 1 - row,
      width - inset * 2,
      at(DISTANT, row < 3 ? 1 : 0),
    );
  }
  canvas.fill(left + width / 2 - 1, top - 18, 2, 4, at(STEEL, 2));
}

/** The rooftops nearest the line: dark flat masses, one step under the haze, a tank or two. */
function drawRooftops(canvas: Canvas): void {
  const roofs: Rooftop[] = [
    { left: 0, width: 160, top: 300 },
    { left: 150, width: 140, top: 270, tank: 200 },
    { left: 290, width: 170, top: 320 },
    { left: 450, width: 150, top: 236, tank: 520 },
    { left: 600, width: 120, top: 290 },
    { left: 720, width: 180, top: 254, tank: 840 },
    { left: 900, width: 150, top: 310 },
    { left: 1040, width: 160, top: 262, tank: 1110 },
  ];
  for (const { left, width, top, tank } of roofs) {
    canvas.fill(left, top, width, canvas.height - top, at(DISTANT, 0));
    // The parapet's coping catches the glow behind: a lighter top row.
    canvas.hline(left, top, width, at(DISTANT, 2));
    canvas.hline(left, top + 1, width, at(DISTANT, 1));
    if (tank !== undefined) drawWaterTower(canvas, tank, top);
  }
}

/** The far layer, `width` × `height` image pixels, from the street's seed. */
export function drawFar(width: number, height: number, seed: number): Canvas {
  const canvas = new Canvas(width, height);
  drawSky(canvas);
  drawCloud(canvas, seed + 11, 70, 26);
  drawCloud(canvas, seed + 23, 132, 18);
  drawTowers(canvas, streamOf(seed, 'towers'));
  drawViaduct(canvas);
  drawRooftops(canvas);
  return canvas;
}
