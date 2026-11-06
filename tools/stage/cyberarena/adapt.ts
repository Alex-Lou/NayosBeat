/**
 * Adapts the Cyber Arena illustration (art-src/cyberarena/source/cyberarena.png) to the game, with
 * the whole image and no retouching: its moonlit night, its cyan neon and its pixel grain stay as
 * they are. The illustration is drawn for people about 1.6 times Feline's height (its railing, its
 * door): it is laid at HUMAN of the view's own scale, so its people would be the fighters' size,
 * the slab they stand on (FEET) on the game's feet line. Past its edges the layers continue it:
 * the sky's top band repeated upward, the slabs' bottom band downward, its sides mirrored.
 */

import { writeFile } from 'node:fs/promises';
import { encodeTruecolorPng } from '../../sprites/png.ts';
import { readTruecolor } from '../../sprites/truecolor.ts';

const SOURCE = new URL('../../../art-src/cyberarena/source/cyberarena.png', import.meta.url);
const FAR = new URL('../../../art-src/cyberarena/far.png', import.meta.url);
const FLOOR = new URL('../../../art-src/cyberarena/floor.png', import.meta.url);

const VIEW_HEIGHT = 540;
const FAR_WIDTH = 1200;
const FLOOR_WIDTH = 1920;
const FLOOR_HEIGHT = 80;
/** The game's feet line, view px. */
const FEET_LINE = 460;
/** The illustration's own people over Feline's height: its scale, over the view's. */
const HUMAN = 0.62;
/** The source row the fighters stand on: the front slabs, before the kerb. */
const FEET = 800;
/** The bands repeated past the image's top and bottom, source rows. */
const SKY_BAND = 60;
const KERB_BAND = 40;

const source = await readTruecolor(SOURCE);
const SW = source.width;
const SH = source.height;
const scale = (VIEW_HEIGHT / SH) * HUMAN;
const top = FEET_LINE - FEET * scale;
const imageWidth = SW * scale;

function pixel(x: number, y: number): readonly [number, number, number] {
  const sx = Math.max(0, Math.min(SW - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(SH - 1, Math.round(y)));
  const at = (sy * SW + sx) * 4;
  return [source.data[at] ?? 0, source.data[at + 1] ?? 0, source.data[at + 2] ?? 0];
}

/** Source column of a layer column `u` px from the image's left edge, mirrored past its edges. */
function column(u: number): number {
  const period = 2 * imageWidth;
  const v = ((u % period) + period) % period;
  return (v < imageWidth ? v : period - 1 - v) / scale;
}

/** Source row of view row `y`: the image, its sky's top band above, its kerb's band below. */
function row(y: number): number {
  const sy = (y - top) / scale;
  if (sy < 0) return -sy % SKY_BAND;
  if (sy > SH - 1) return SH - 1 - ((sy - SH) % KERB_BAND);
  return sy;
}

function layer(width: number, height: number, firstRow: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const left = (width - imageWidth) / 2;
  for (let y = 0; y < height; y++) {
    const sy = row(firstRow + y);
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(column(x - left), sy);
      const at = (y * width + x) * 4;
      out[at] = r;
      out[at + 1] = g;
      out[at + 2] = b;
      out[at + 3] = 255;
    }
  }
  return out;
}

await writeFile(
  FAR,
  await encodeTruecolorPng(FAR_WIDTH, VIEW_HEIGHT, layer(FAR_WIDTH, VIEW_HEIGHT, 0)),
);
await writeFile(
  FLOOR,
  await encodeTruecolorPng(FLOOR_WIDTH, FLOOR_HEIGHT, layer(FLOOR_WIDTH, FLOOR_HEIGHT, FEET_LINE)),
);
console.log('far and floor written');
