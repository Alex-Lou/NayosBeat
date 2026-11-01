/**
 * The stage (src/art/stage-layers.ts, docs/art/aseprite.md, docs/art/decor-rue.md): drawn by the
 * code (tools/stage/rue/), each layer of which may be drawn by hand instead, in art-src/rue/
 * far.png, mid.png and floor.png, one image each, in free palettes. `npm run sprites` installs
 * the layers in src/art/rue/ with the props laid on them (stage-props.ts), and writes their large
 * colors there (colors.ts): the flash veils are set on them, and the flash measures taken over the
 * darkest (docs/flashs.md §3).
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import {
  STAGE_LAYER_NAMES,
  STAGE_LAYERS,
  STAGE_NAME,
  STAGE_SCALE,
  type StageLayer,
} from '../../src/art/stage-layers.ts';
import { VIEW_SIZE } from '../../src/render/view.ts';
import { drawRue } from '../stage/rue/index.ts';
import { compactImage, paletteBuilder, rgbaAt } from './colors.ts';
import { checkDrawn, DRAWN_ROOT, DrawingProblems, listFolder, type DrawnRules } from './drawn.ts';
import { decodeIndexedPng, encodeIndexedPng, type IndexedImage, type Rgba } from './png.ts';
import { format, resolveConfig } from 'prettier';
import { packProps, propsModule } from './stage-props.ts';

const ART = new URL(`../../src/art/${STAGE_NAME}/`, import.meta.url);

/** A color is one of the stage's large colors when a layer covers this share of the screen with it. */
export const LARGE_SHARE = 0.01;

export type DrawnStage = Partial<Record<StageLayer, IndexedImage>>;

export function isStageLayer(name: string): name is StageLayer {
  return name in STAGE_LAYERS;
}

/**
 * The checks of a layer drawn: its size (STAGE_SCALE image pixels a world pixel, as fine as the
 * fighters), drawn when the stage needs it (the others may stay empty: no file, the code's layer),
 * whole pixels only (they are laid over one another, and their colors must be the ones the
 * screen shows), and the far one opaque everywhere (nothing is behind it).
 */
export function stageRulesOf(layer: StageLayer): DrawnRules {
  const { width, height, required, opaque } = STAGE_LAYERS[layer];
  return {
    width: width * STAGE_SCALE,
    height: height * STAGE_SCALE,
    frames: 1,
    slots: 256,
    filled: required,
    margin: 0,
    lowestRow: height * STAGE_SCALE - 1,
    transparency: opaque ? 'none' : 'whole',
  };
}

/**
 * The layers drawn by hand under `root`, checked: throws with every problem found, so nothing is
 * generated from a stage the game would show wrong. Each takes the place of the code's layer; the
 * other files there (the Aseprite ones) are left alone.
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
  if (problems.length > 0) {
    throw new DrawingProblems(`Drawn stage:\n${problems.map((line) => `  ${line}`).join('\n')}`);
  }
  return drawn;
}

/**
 * The stage's large colors (0xRRGGBB): those a layer covers LARGE_SHARE of the screen with (its
 * image pixels counted in world pixels), the most covering first. Each is a backdrop the flashes
 * are measured over.
 */
export function largeColorsOf(layers: readonly IndexedImage[]): number[] {
  const least = LARGE_SHARE * VIEW_SIZE.width * VIEW_SIZE.height * STAGE_SCALE ** 2;
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

/** The layers the game shows: each drawn by hand when it is, the code's otherwise. */
export function installedLayers(drawn: DrawnStage): Record<StageLayer, IndexedImage> {
  const code = drawRue().layers;
  return {
    far: drawn.far ?? code.far,
    mid: drawn.mid ?? code.mid,
    floor: drawn.floor ?? code.floor,
  };
}

/** What `writeStage` installed: the layers drawn by hand, the props it left out and why. */
export interface StageWritten {
  readonly drawn: readonly StageLayer[];
  readonly props: number;
  readonly dropped: readonly string[];
}

async function writeImage(file: URL, image: IndexedImage): Promise<void> {
  const { pixels, palette } = compactImage(image);
  await writeFile(file, await encodeIndexedPng(image.width, image.height, pixels, palette));
}

/**
 * Writes the stage as the game shows it: each layer (drawn by hand, else the code's) in the
 * smallest palette that holds it, the props still laid right on them and their sheet, and the
 * layers' large colors.
 */
export async function writeStage(drawn: DrawnStage): Promise<StageWritten> {
  await mkdir(ART, { recursive: true });
  const layers = installedLayers(drawn);
  for (const layer of STAGE_LAYER_NAMES)
    await writeImage(new URL(`${layer}.png`, ART), layers[layer]);
  const packed = packProps(drawRue().props, layers);
  const sheet = new URL('props.png', ART);
  if (packed.sheet) await writeImage(sheet, packed.sheet);
  else await rm(sheet, { recursive: true, force: true });
  const module = new URL('props.ts', ART);
  await writeFile(module, await propsModule(packed.props, module));
  const colors = new URL('colors.ts', ART);
  await writeFile(colors, await colorsModule(largeColorsOf(Object.values(layers)), colors));
  return {
    drawn: STAGE_LAYER_NAMES.filter((layer) => drawn[layer] !== undefined),
    props: packed.props.length,
    dropped: packed.dropped,
  };
}

/** The large colors as a TypeScript module, formatted by Prettier with the repository's settings. */
export async function colorsModule(colors: readonly number[], file: URL): Promise<string> {
  const items = colors.map((color) => `0x${color.toString(16).padStart(6, '0')}`);
  const text = [
    '// Generated by `npm run sprites` (tools/sprites/stage-drawn.ts): do not edit.',
    '',
    '/**',
    ' * The large colors of the stage (docs/flashs.md §3): those one of its layers covers 1 % of the',
    ' * screen with, the most covering first.',
    ' */',
    `export const STAGE_COLORS: readonly number[] = [${items.join(', ')}];`,
    '',
  ].join('\n');
  const options = (await resolveConfig(file)) ?? {};
  return format(text, { ...options, parser: 'typescript' });
}

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/**
 * Where a layer's drawing starts: the one drawn, or the code's, in the smallest palette that holds
 * it, slot 0 transparent (as Aseprite has it).
 */
export function stageStart(
  layer: StageLayer,
  drawn: IndexedImage | undefined,
): { pixels: Uint8Array; palette: readonly Rgba[] } {
  if (drawn) {
    return { pixels: drawn.pixels, palette: drawn.colors.map((_, slot) => rgbaAt(drawn, slot)) };
  }
  const image = drawRue().layers[layer];
  const { palette, slotOf } = paletteBuilder([TRANSPARENT]);
  const pixels = image.pixels.map((slot) => slotOf(rgbaAt(image, slot)));
  return { pixels, palette };
}
