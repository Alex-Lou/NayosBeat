/**
 * Adapts the helipad illustration (art-src/helipad/source/helipad.png, the GIF's first frame) to
 * the game: the whole image, no retouching. The far layer is the full illustration, its side bands
 * mirrored for the camera; the floor is the deck under the fighters' feet, opaque from its top row.
 */

import { writeFile } from 'node:fs/promises';
import { encodeTruecolorPng } from '../../sprites/png.ts';
import { readTruecolor } from '../../sprites/truecolor.ts';

const SOURCE = new URL('../../../art-src/helipad/source/helipad.png', import.meta.url);
const FAR = new URL('../../../art-src/helipad/far.png', import.meta.url);
const FLOOR = new URL('../../../art-src/helipad/floor.png', import.meta.url);

const FAR_WIDTH = 1200;
const FAR_HEIGHT = 540;
const FLOOR_WIDTH = 1920;
const FLOOR_HEIGHT = 80;

const source = await readTruecolor(SOURCE);
const SW = source.width;
const SH = source.height;
const scale = FAR_HEIGHT / SH;
const viewWidth = Math.round(SW * scale);
const side = Math.floor((FAR_WIDTH - viewWidth) / 2);

function pixel(x: number, y: number): readonly [number, number, number] {
  const sx = Math.max(0, Math.min(SW - 1, x));
  const sy = Math.max(0, Math.min(SH - 1, y));
  const at = (sy * SW + sx) * 4;
  return [source.data[at] ?? 0, source.data[at + 1] ?? 0, source.data[at + 2] ?? 0];
}

const far = new Uint8ClampedArray(FAR_WIDTH * FAR_HEIGHT * 4);
for (let y = 0; y < FAR_HEIGHT; y++) {
  const sy = Math.round(y / scale);
  for (let x = 0; x < FAR_WIDTH; x++) {
    // The image centered; the side bands mirror its edges, so the city continues instead of
    // stretching one column (the bands are only seen when the camera reaches the ends).
    const u = x - side;
    const sx =
      u < 0
        ? Math.round(-u / scale)
        : u >= viewWidth
          ? Math.round((viewWidth - 1 - (u - viewWidth)) / scale)
          : Math.round(u / scale);
    const [r, g, b] = pixel(sx, sy);
    const at = (y * FAR_WIDTH + x) * 4;
    far[at] = r;
    far[at + 1] = g;
    far[at + 2] = b;
    far[at + 3] = 255;
  }
}

// The floor: the bottom 80 image rows of the game view — the deck, opaque at its top.
const FLOOR_TOP = Math.round(460 / scale);
const floor = new Uint8ClampedArray(FLOOR_WIDTH * FLOOR_HEIGHT * 4);
for (let y = 0; y < FLOOR_HEIGHT; y++) {
  const sy = Math.round(FLOOR_TOP + (y * (SH - FLOOR_TOP)) / FLOOR_HEIGHT);
  for (let x = 0; x < FLOOR_WIDTH; x++) {
    const sx = Math.round((x * SW) / FLOOR_WIDTH);
    const [r, g, b] = pixel(sx, sy);
    const at = (y * FLOOR_WIDTH + x) * 4;
    floor[at] = r;
    floor[at + 1] = g;
    floor[at + 2] = b;
    floor[at + 3] = 255;
  }
}

await writeFile(FAR, await encodeTruecolorPng(FAR_WIDTH, FAR_HEIGHT, far));
await writeFile(FLOOR, await encodeTruecolorPng(FLOOR_WIDTH, FLOOR_HEIGHT, floor));
console.log('far and floor written');
