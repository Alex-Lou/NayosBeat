/**
 * Renders the stages the code draws as the fight shows them (docs/art/passation-decors.md): the
 * three layers laid over one another at a camera position, in an atmosphere, one image pixel a
 * pixel (960 × 540, what the closest framing crops is still there). Writes
 * tools/sprites/preview/stages/<stage>-<atmosphere>-<camera>.png (not committed).
 *
 *   npm run stages:preview                     # every stage, every atmosphere, camera centered
 *   npm run stages:preview -- gym              # the gym only
 *   npm run stages:preview -- gym --ends       # its left end, center and right end
 *
 * The props show at their first frame: the still layers as the fight starts.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import {
  atmosphereName,
  STAGE_LAYER_NAMES,
  STAGE_LAYERS,
  STAGE_SCALE,
} from '../../src/art/stage-layers.ts';
import { VIEW_SIZE } from '../../src/render/view.ts';
import { CODE_MAPS } from '../stage/maps.ts';
import type { CodeMap } from '../stage/kit/stage.ts';
import { encodeIndexedPng } from './png.ts';
import { liftedLayers } from './stage-props.ts';

const OUT = new URL('./preview/stages/', import.meta.url);
/** How far the camera may go each way: the floor's width less the view's, in world pixels. */
const TRAVEL = STAGE_LAYERS.floor.width - VIEW_SIZE.width;

/** The stage at `camera` (0: its left end, 1: its right end), as palette slots. */
function composite(map: CodeMap, camera: number): Uint8Array {
  const { layers, props } = map.draw();
  const shown = liftedLayers(props, layers);
  const width = VIEW_SIZE.width * STAGE_SCALE;
  const height = VIEW_SIZE.height * STAGE_SCALE;
  const pixels = new Uint8Array(width * height);
  const draw = (
    name: (typeof STAGE_LAYER_NAMES)[number],
    image: { width: number; height: number; pixels: Uint8Array },
    dx: number,
    dy: number,
  ) => {
    const shift = Math.round(TRAVEL * camera * STAGE_LAYERS[name].scroll * STAGE_SCALE) - dx;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < width; x++) {
        const slot = image.pixels[y * image.width + x + shift] ?? 0;
        if (slot !== 0 && x + shift >= 0 && x + shift < image.width)
          pixels[(y + dy) * width + x] = slot;
      }
    }
  };
  for (const name of STAGE_LAYER_NAMES) {
    const top = STAGE_LAYERS[name].y * STAGE_SCALE;
    draw(name, shown[name], 0, top);
    // Each prop at its first frame, over its layer.
    for (const prop of props) {
      if (prop.layer !== name) continue;
      const first = prop.frames[0];
      if (first) draw(name, first, prop.rect.x, top + prop.rect.y);
    }
  }
  return pixels;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const ends = args.includes('--ends');
  const names = args.filter((arg) => !arg.startsWith('--'));
  const unknown = names.filter((name) => !CODE_MAPS.some((map) => map.name === name));
  if (unknown.length > 0) {
    throw new Error(
      `No stage ${unknown.join(', ')}: ${CODE_MAPS.map(({ name }) => name).join(', ')}`,
    );
  }
  const maps = names.length > 0 ? CODE_MAPS.filter(({ name }) => names.includes(name)) : CODE_MAPS;
  await mkdir(OUT, { recursive: true });
  for (const map of maps) {
    for (const camera of ends ? [0, 0.5, 1] : [0.5]) {
      const pixels = composite(map, camera);
      for (const { atmosphere, palette } of map.atmospheres) {
        const file = new URL(`${map.name}-${atmosphereName(atmosphere)}-${camera}.png`, OUT);
        const png = await encodeIndexedPng(
          VIEW_SIZE.width * STAGE_SCALE,
          VIEW_SIZE.height * STAGE_SCALE,
          pixels,
          palette,
        );
        await writeFile(file, png);
        console.log(file.pathname);
      }
    }
  }
}

await main();
