/**
 * The stage drawn by hand (src/art/stage-layers.ts, docs/art/aseprite.md): art-src/entrepot/
 * far.png, mid.png and floor.png, one image each, in free palettes. The fights show it instead of
 * the grey box once its far layer and its floor are drawn. `npm run sprites` copies the layers into
 * src/art/entrepot/ and writes their large colors there (colors.ts): the flash veils are set on
 * them, and the flash measures taken over the darkest (docs/flashs.md §3).
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import {
  STAGE_LAYER_NAMES,
  STAGE_LAYERS,
  STAGE_NAME,
  type StageLayer,
} from '../../src/art/stage-layers.ts';
import { GREYBOX } from '../../src/render/greybox-stage.ts';
import { VIEW_SIZE } from '../../src/render/view.ts';
import { compactImage, rgbaAt } from './colors.ts';
import { checkDrawn, DRAWN_ROOT, listFolder, type DrawnRules } from './drawn.ts';
import { decodeIndexedPng, encodeIndexedPng, type IndexedImage, type Rgba } from './png.ts';

const ART = new URL(`../../src/art/${STAGE_NAME}/`, import.meta.url);

/** A color is one of the stage's large colors when a layer covers this share of the screen with it. */
export const LARGE_SHARE = 0.01;

export type DrawnStage = Partial<Record<StageLayer, IndexedImage>>;

export function isStageLayer(name: string): name is StageLayer {
  return name in STAGE_LAYERS;
}

/**
 * The checks of a layer drawn: its size, drawn when the stage needs it (the others may stay
 * empty: no file, no layer), whole pixels only (they are laid over one another, and their colors
 * must be the ones the screen shows), and the far one opaque everywhere (nothing is behind it).
 */
export function stageRulesOf(layer: StageLayer): DrawnRules {
  const { width, height, required, opaque } = STAGE_LAYERS[layer];
  return {
    width,
    height,
    frames: 1,
    slots: 256,
    filled: required,
    margin: 0,
    lowestRow: height - 1,
    transparency: opaque ? 'none' : 'whole',
  };
}

/**
 * The layers drawn under `root`, checked: throws with every problem found, so nothing is generated
 * from a stage the game would show wrong. A stage is drawn whole (its far layer and its floor) or
 * not at all. The other files there (the Aseprite ones) are left alone.
 */
export async function loadStageDrawn(root: URL = DRAWN_ROOT): Promise<DrawnStage> {
  const folder = new URL(`${STAGE_NAME}/`, root);
  const problems: string[] = [];
  const drawn: DrawnStage = {};
  const files = (await listFolder(folder)).filter((file) => file.endsWith('.png')).sort();
  for (const file of files) {
    const name = file.slice(0, -'.png'.length);
    const label = `art-src/${STAGE_NAME}/${file}`;
    if (!isStageLayer(name)) {
      problems.push(`${label}: no such layer (${STAGE_LAYER_NAMES.join(', ')})`);
      continue;
    }
    try {
      const image = await decodeIndexedPng(await readFile(new URL(file, folder)));
      const found = checkDrawn(label, image, stageRulesOf(name), undefined);
      problems.push(...found);
      if (found.length === 0) drawn[name] = image;
    } catch (error) {
      problems.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const missing = STAGE_LAYER_NAMES.filter(
    (layer) => STAGE_LAYERS[layer].required && !files.includes(`${layer}.png`),
  );
  if (files.length > 0 && missing.length > 0) {
    problems.push(
      `art-src/${STAGE_NAME}: the stage needs its ${missing.join(' and ')} too (or none of it)`,
    );
  }
  if (problems.length > 0) {
    throw new Error(`Drawn stage:\n${problems.map((line) => `  ${line}`).join('\n')}`);
  }
  return drawn;
}

/**
 * The stage's large colors (0xRRGGBB): those a layer covers LARGE_SHARE of the screen with, the
 * most covering first. Each is a backdrop the flashes are measured over.
 */
export function largeColorsOf(layers: readonly IndexedImage[]): number[] {
  const least = LARGE_SHARE * VIEW_SIZE.width * VIEW_SIZE.height;
  const covered = new Map<number, number>();
  for (const layer of layers) {
    const counts = new Map<number, number>();
    for (const slot of layer.pixels) {
      const { r, g, b, a } = rgbaAt(layer, slot);
      if (a === 0) continue;
      const color = (r << 16) | (g << 8) | b;
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
    for (const [color, count] of counts) {
      if (count >= least) covered.set(color, Math.max(covered.get(color) ?? 0, count));
    }
  }
  return [...covered].sort(([, a], [, b]) => b - a).map(([color]) => color);
}

/**
 * Writes the stage as the game shows it: the layers drawn in the smallest palettes that hold
 * them (none: the grey box), and their large colors.
 */
export async function writeStage(drawn: DrawnStage): Promise<void> {
  await mkdir(ART, { recursive: true });
  const layers: IndexedImage[] = [];
  for (const layer of STAGE_LAYER_NAMES) {
    const file = new URL(`${layer}.png`, ART);
    const image = drawn[layer];
    if (!image) {
      await rm(file, { recursive: true, force: true });
      continue;
    }
    layers.push(image);
    const { pixels, palette } = compactImage(image);
    await writeFile(file, await encodeIndexedPng(image.width, image.height, pixels, palette));
  }
  await writeFile(new URL('colors.ts', ART), colorsModule(largeColorsOf(layers)));
}

/** The large colors as a TypeScript module, formatted the way Prettier would. */
export function colorsModule(colors: readonly number[]): string {
  const items = colors.map((color) => `0x${color.toString(16).padStart(6, '0')}`);
  const declaration = 'export const STAGE_COLORS: readonly number[] = ';
  const inline = `${declaration}[${items.join(', ')}];`;
  const list =
    inline.length <= 100
      ? inline
      : [`${declaration}[`, ...items.map((item) => `  ${item},`), '];'].join('\n');
  return [
    '// Generated by `npm run sprites` (tools/sprites/stage-drawn.ts): do not edit.',
    '',
    '/**',
    ' * The large colors of the stage drawn (docs/flashs.md §3): those one of its layers covers 1 % of',
    " * the screen with, the most covering first. None while it is not drawn: the grey box's then.",
    ' */',
    list,
    '',
  ].join('\n');
}

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

function rgb(color: number): Rgba {
  return { r: (color >> 16) & 0xff, g: (color >> 8) & 0xff, b: color & 0xff, a: 255 };
}

/**
 * Where a layer's drawing starts: the one drawn, or the grey box as the fights show it (its sky
 * far, nothing in the middle, its ground and its marks on the floor).
 */
export function stageStart(
  layer: StageLayer,
  drawn: IndexedImage | undefined,
): { pixels: Uint8Array; palette: readonly Rgba[] } {
  if (drawn) {
    return { pixels: drawn.pixels, palette: drawn.colors.map((_, slot) => rgbaAt(drawn, slot)) };
  }
  const { width, height } = STAGE_LAYERS[layer];
  const { colors, markSpacing, markSize } = GREYBOX;
  const palette = [TRANSPARENT, rgb(colors.background), rgb(colors.ground), rgb(colors.groundMark)];
  const pixels = new Uint8Array(width * height);
  if (layer === 'far') pixels.fill(1);
  if (layer === 'floor') {
    pixels.fill(2);
    for (let x = 0; x < width; x += markSpacing) {
      for (let dy = 0; dy < markSize; dy++) {
        for (let dx = 0; dx < markSize && x + dx < width; dx++) {
          pixels[(markSize + dy) * width + x + dx] = 3;
        }
      }
    }
  }
  return { pixels, palette };
}
