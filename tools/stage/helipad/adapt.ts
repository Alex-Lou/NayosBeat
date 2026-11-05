/**
 * Adapts the helipad illustration (art-src/helipad/source/helipad.png, the GIF's first frame) to
 * the game, with the whole image and no retouching. The far layer is the city and the sky, with
 * the tower repainted behind it; the middle layer is the tower itself, cut out for parallax; the
 * floor is the deck under the fighters' feet. The far side bands mirror the view for the camera.
 */

import { writeFile } from 'node:fs/promises';
import { encodeTruecolorPng } from '../../sprites/png.ts';
import { readTruecolor } from '../../sprites/truecolor.ts';

const SOURCE = new URL('../../../art-src/helipad/source/helipad.png', import.meta.url);
const FAR = new URL('../../../art-src/helipad/far.png', import.meta.url);
const MID = new URL('../../../art-src/helipad/mid.png', import.meta.url);
const FLOOR = new URL('../../../art-src/helipad/floor.png', import.meta.url);

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const FAR_WIDTH = 1200;
const FLOOR_WIDTH = 1920;
const FLOOR_HEIGHT = 80;
/** The view's left edge in the far and middle layers. */
const FAR_SIDE = (FAR_WIDTH - VIEW_WIDTH) / 2;
const MID_SIDE = (1440 - VIEW_WIDTH) / 2;

/** The tower's silhouette, in source pixels: the left building and its foreground pipes. */
const TOWER: readonly (readonly [number, number])[] = [
  [0, 0],
  [252, 0],
  [255, 80],
  [252, 120],
  [252, 380],
  [160, 400],
  [0, 400],
];

function insideTower(x: number, y: number): boolean {
  let inside = false;
  for (let i = 0; i < TOWER.length; i++) {
    const [xi, yi] = TOWER[i] ?? [0, 0];
    const [xj, yj] = TOWER[(i + TOWER.length - 1) % TOWER.length] ?? [0, 0];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const source = await readTruecolor(SOURCE);
const SW = source.width;
const SH = source.height;

function pixel(x: number, y: number): readonly [number, number, number] {
  const sx = Math.max(0, Math.min(SW - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(SH - 1, Math.round(y)));
  const at = (sy * SW + sx) * 4;
  return [source.data[at] ?? 0, source.data[at + 1] ?? 0, source.data[at + 2] ?? 0];
}

/** The view as it is: the whole illustration, resampled to the game's view. */
const view = new Uint8ClampedArray(VIEW_WIDTH * VIEW_HEIGHT * 4);
for (let y = 0; y < VIEW_HEIGHT; y++) {
  const sy = (y * SH) / VIEW_HEIGHT;
  for (let x = 0; x < VIEW_WIDTH; x++) {
    const [r, g, b] = pixel((x * SW) / VIEW_WIDTH, sy);
    const at = (y * VIEW_WIDTH + x) * 4;
    view[at] = r;
    view[at + 1] = g;
    view[at + 2] = b;
    view[at + 3] = 255;
  }
}

/**
 * What lies behind the tower: a clean sky column above the skyline, and a patch of city from the
 * right (no helicopter, no moon), blended near the tower's edge and softened by the night haze.
 */
function behindTower(x: number, y: number): readonly [number, number, number] {
  const t = Math.max(0, Math.min(1, (x - 160) / 80));
  const city = pixel(750 - x, y);
  const edge = pixel(500 - x, y);
  const sky = pixel(300, y);
  const horizon = Math.max(0, Math.min(1, (y - 100) / 60));
  const haze = 0.12;
  const mix = (a: number, b: number) => a + (b - a) * horizon;
  return [
    Math.round(mix(sky[0], city[0] + (edge[0] - city[0]) * t) * (1 - haze) + 26 * haze),
    Math.round(mix(sky[1], city[1] + (edge[1] - city[1]) * t) * (1 - haze) + 34 * haze),
    Math.round(mix(sky[2], city[2] + (edge[2] - city[2]) * t) * (1 - haze) + 64 * haze),
  ];
}

const far = new Uint8ClampedArray(FAR_WIDTH * VIEW_HEIGHT * 4);
const mid = new Uint8ClampedArray(1440 * VIEW_HEIGHT * 4);
for (let y = 0; y < VIEW_HEIGHT; y++) {
  const sy = (y * SH) / VIEW_HEIGHT;
  for (let x = 0; x < VIEW_WIDTH; x++) {
    const sx = (x * SW) / VIEW_WIDTH;
    const tower = insideTower(sx, sy);
    const [vr, vg, vb] = [
      view[(y * VIEW_WIDTH + x) * 4] ?? 0,
      view[(y * VIEW_WIDTH + x) * 4 + 1] ?? 0,
      view[(y * VIEW_WIDTH + x) * 4 + 2] ?? 0,
    ];
    const [fr, fg, fb] = tower ? behindTower(sx, sy) : [vr, vg, vb];
    const fat = (y * FAR_WIDTH + FAR_SIDE + x) * 4;
    far[fat] = fr;
    far[fat + 1] = fg;
    far[fat + 2] = fb;
    far[fat + 3] = 255;
    if (tower) {
      const mat = (y * 1440 + MID_SIDE + x) * 4;
      mid[mat] = vr;
      mid[mat + 1] = vg;
      mid[mat + 2] = vb;
      mid[mat + 3] = 255;
    }
  }
}

// The far side bands mirror the view's edges: only seen when the camera reaches the ends.
for (let y = 0; y < VIEW_HEIGHT; y++) {
  for (let d = 0; d < FAR_SIDE; d++) {
    const leftView = FAR_SIDE - d;
    const rightView = VIEW_WIDTH - 1 - d;
    const leftFrom = (y * VIEW_WIDTH + leftView) * 4;
    const rightFrom = (y * VIEW_WIDTH + rightView) * 4;
    const leftAt = (y * FAR_WIDTH + d) * 4;
    const rightAt = (y * FAR_WIDTH + FAR_SIDE + VIEW_WIDTH + d) * 4;
    far.set(view.subarray(leftFrom, leftFrom + 4), leftAt);
    far.set(view.subarray(rightFrom, rightFrom + 4), rightAt);
  }
}

// The floor: the bottom 80 image rows of the game view — the deck, opaque at its top.
const FLOOR_TOP = Math.round((460 / VIEW_HEIGHT) * SH);
const floor = new Uint8ClampedArray(FLOOR_WIDTH * FLOOR_HEIGHT * 4);
for (let y = 0; y < FLOOR_HEIGHT; y++) {
  const sy = Math.round(FLOOR_TOP + (y * (SH - FLOOR_TOP)) / FLOOR_HEIGHT);
  for (let x = 0; x < FLOOR_WIDTH; x++) {
    const [r, g, b] = pixel((x * SW) / FLOOR_WIDTH, sy);
    const at = (y * FLOOR_WIDTH + x) * 4;
    floor[at] = r;
    floor[at + 1] = g;
    floor[at + 2] = b;
    floor[at + 3] = 255;
  }
}

await writeFile(FAR, await encodeTruecolorPng(FAR_WIDTH, VIEW_HEIGHT, far));
await writeFile(MID, await encodeTruecolorPng(1440, VIEW_HEIGHT, mid));
await writeFile(FLOOR, await encodeTruecolorPng(FLOOR_WIDTH, FLOOR_HEIGHT, floor));
console.log('far, mid and floor written');
