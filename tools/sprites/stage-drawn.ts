/**
 * The stages (src/art/stage-layers.ts, docs/art/aseprite.md, docs/art/decor-rue.md): each drawn by
 * the code (tools/stage/<stage>/). The street's layers (STAGE_NAME) may each be drawn by hand
 * instead, in art-src/rue/ far.png, mid.png and floor.png, one image each, in free palettes.
 * `npm run stages` installs each stage's layers in src/art/<stage>/ with the props laid on them
 * (stage-props.ts), and writes their large colors there (colors.ts): the flash veils are set on
 * them, and the flash measures taken over the darkest (docs/flashs.md §3). A stage's other
 * atmospheres (the same stage, another palette) go in a folder each, src/art/<stage>/<moment>-
 * <weather>/, the code's layers recolored: a layer drawn by hand is the base atmosphere's only.
 * A stage marked `rgba` keeps truecolor PNGs under art-src/<stage>/: `writeRgbaStage` copies them
 * as they are (Sakura), so the illustration's colors are not quantized.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import {
  atmosphereName,
  BASE_ATMOSPHERE,
  STAGE_LAYER_NAMES,
  STAGE_LAYERS,
  STAGE_NAME,
  STAGE_SCALE,
  type StageLayer,
} from '../../src/art/stage-layers.ts';
import { VIEW_SIZE } from '../../src/render/view.ts';
import type { CodeMap } from '../stage/kit/stage.ts';
import { drawRue } from '../stage/rue/index.ts';
import { compactImage, paletteBuilder, rgbaAt } from './colors.ts';
import { checkDrawn, DRAWN_ROOT, DrawingProblems, listFolder, type DrawnRules } from './drawn.ts';
import { decodeIndexedPng, encodeIndexedPng, type IndexedImage, type Rgba } from './png.ts';
import { format, resolveConfig } from 'prettier';
import { liftedLayers, packProps, propsModule } from './stage-props.ts';
import { quantizeRgba } from './quantize.ts';
import { readTruecolor } from './truecolor.ts';

/** Where the game finds a stage's images: src/art/<stage>/. */
function artOf(name: string): URL {
  return new URL(`../../src/art/${name}/`, import.meta.url);
}

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
  return loadStageDrawnFrom(STAGE_NAME, root);
}

/**
 * The layers of stage `stage` drawn by hand under `root` (art-src/<stage>/), checked. A stage with
 * no folder there has none: its code's layers are used.
 */
export async function loadStageDrawnFrom(
  stage: string,
  root: URL = DRAWN_ROOT,
): Promise<DrawnStage> {
  const folder = new URL(`${stage}/`, root);
  const problems: string[] = [];
  const drawn: DrawnStage = {};
  const files = (await listFolder(folder)).filter((file) => file.endsWith('.png')).sort();
  for (const file of files) {
    const name = file.slice(0, -'.png'.length);
    const label = `art-src/${stage}/${file}`;
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

/** The layers the game shows: each drawn by hand when it is, the code's (the street's) otherwise. */
export function installedLayers(
  drawn: DrawnStage,
  code: Readonly<Record<StageLayer, IndexedImage>> = drawRue().layers,
): Record<StageLayer, IndexedImage> {
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

/** `image`, its slots shown in `palette` (an atmosphere's, slot for slot with the street's). */
export function recolored(image: IndexedImage, palette: readonly Rgba[]): IndexedImage {
  return {
    ...image,
    colors: palette.map(({ r, g, b }) => (r << 16) | (g << 8) | b),
    alpha: palette.map(({ a }) => a),
  };
}

/** Writes `layers` and the props' `sheet` in `folder`, the sheet removed when there is none. */
async function writeLayers(
  folder: URL,
  layers: Readonly<Record<StageLayer, IndexedImage>>,
  sheet: IndexedImage | undefined,
  noMid = false,
): Promise<void> {
  await mkdir(folder, { recursive: true });
  for (const layer of STAGE_LAYER_NAMES) {
    if (noMid && layer === 'mid') {
      await rm(new URL('mid.png', folder), { recursive: true, force: true });
      continue;
    }
    await writeImage(new URL(`${layer}.png`, folder), layers[layer]);
  }
  const file = new URL('props.png', folder);
  if (sheet) await writeImage(file, sheet);
  else await rm(file, { recursive: true, force: true });
}

/**
 * Writes `map` as the game shows it, in src/art/<its name>/: each layer (drawn by hand, else the
 * code's) in the smallest palette that holds it, the props still laid right on them and their
 * sheet, and the layers' large colors; then each other atmosphere of the stage, the code's layers
 * and the same sheet in its palette, in its folder, its large colors with the base's.
 */
export async function writeStage(map: CodeMap, drawn: DrawnStage = {}): Promise<StageWritten> {
  const art = artOf(map.name);
  const code = map.draw();
  const layers = installedLayers(drawn, code.layers);
  const packed = packProps(code.props, layers);
  await writeLayers(art, packed.layers, packed.sheet, map.noMid === true);
  const module = new URL('props.ts', art);
  await writeFile(module, await propsModule(packed.props, module));
  // The base atmosphere, the first (midnight's for most): its images in the stage's folder.
  const base = atmosphereName(map.atmospheres[0]?.atmosphere ?? BASE_ATMOSPHERE);
  const large: Record<string, number[]> = {
    [base]: largeColorsOf(Object.values(packed.layers)),
  };
  const lifted = liftedLayers(code.props, code.layers);
  for (const { atmosphere, palette } of map.atmospheres) {
    const name = atmosphereName(atmosphere);
    if (name === base) continue;
    const shown = {
      far: recolored(lifted.far, palette),
      mid: recolored(lifted.mid, palette),
      floor: recolored(lifted.floor, palette),
    };
    const sheet = packed.sheet && recolored(packed.sheet, palette);
    await writeLayers(new URL(`${name}/`, art), shown, sheet, map.noMid === true);
    large[name] = largeColorsOf(Object.values(shown));
  }
  const colors = new URL('colors.ts', art);
  await writeFile(colors, await colorsModule(large, colors));
  return {
    drawn: STAGE_LAYER_NAMES.filter((layer) => drawn[layer] !== undefined),
    props: packed.props.length,
    dropped: packed.dropped,
  };
}

/**
 * Installs a stage whose layers are truecolor PNGs (art-src/<name>/): copies them as they are, so
 * the game keeps every color of the illustration, lays the code's overlay props over them, and
 * writes its large colors from a coarse palette (the flash measures' regions).
 */
async function writeRgbaStage(map: CodeMap): Promise<StageWritten> {
  const folder = new URL(`../../art-src/${map.name}/`, import.meta.url);
  const art = artOf(map.name);
  const code = map.draw();
  await mkdir(art, { recursive: true });
  const shown = STAGE_LAYER_NAMES.filter((layer) => !(map.noMid === true && layer === 'mid'));
  for (const layer of STAGE_LAYER_NAMES) {
    if (!shown.includes(layer)) {
      await rm(new URL(`${layer}.png`, art), { recursive: true, force: true });
      continue;
    }
    await writeFile(new URL(`${layer}.png`, art), await readFile(new URL(`${layer}.png`, folder)));
  }
  const module = new URL('props.ts', art);
  if (map.animations) {
    await writeFile(
      new URL('props.png', art),
      await readFile(new URL(map.animations.sheet, folder)),
    );
    await writeFile(module, await propsModule(map.animations.props, module));
  } else {
    const packed = packProps(code.props, code.layers);
    if (packed.sheet) await writeImage(new URL('props.png', art), packed.sheet);
    else await rm(new URL('props.png', art), { recursive: true, force: true });
    await writeFile(module, await propsModule(packed.props, module));
  }
  const layers: IndexedImage[] = [];
  for (const layer of shown) {
    const image = await readTruecolor(new URL(`${layer}.png`, folder));
    const { palette, slots } = quantizeRgba(image.data, 64);
    layers.push({
      width: image.width,
      height: image.height,
      pixels: slots,
      colors: palette.map(({ r, g, b }) => (r << 16) | (g << 8) | b),
      alpha: palette.map(({ a }) => a),
    });
  }
  const base = atmosphereName(map.atmospheres[0]?.atmosphere ?? BASE_ATMOSPHERE);
  const large = { [base]: largeColorsOf(layers) };
  const colors = new URL('colors.ts', art);
  await writeFile(colors, await colorsModule(large, colors));
  return {
    drawn: STAGE_LAYER_NAMES,
    props: map.animations?.props.length ?? 0,
    dropped: [],
  };
}

/**
 * Writes every stage of `maps` (`writeStage`), the street (STAGE_NAME) with its layers `drawn` by
 * hand, and says on the console what each holds.
 */
export async function writeStages(maps: readonly CodeMap[], drawn: DrawnStage): Promise<void> {
  for (const map of maps) {
    // A truecolor stage (Sakura) keeps its PNGs as they are; the others are indexed.
    if (map.rgba) {
      const written = await writeRgbaStage(map);
      console.log(`stage ${map.name}: drawn by hand (rgba), ${written.props} props`);
      for (const line of written.dropped) console.warn(`stage ${map.name}, prop left out: ${line}`);
      continue;
    }
    // The street's layers are passed in (checked once); any other stage may have its own, under
    // art-src/<its name>/.
    const handDrawn = map.name === STAGE_NAME ? drawn : await loadStageDrawnFrom(map.name);
    const written = await writeStage(map, handDrawn);
    const by =
      written.drawn.length > 0
        ? `drawn by hand (${written.drawn.join(', ')}), the code's elsewhere`
        : "the code's";
    console.log(`stage ${map.name}: ${by}, ${written.props} props`);
    for (const line of written.dropped) console.warn(`stage ${map.name}, prop left out: ${line}`);
  }
}

/**
 * The large colors of each atmosphere (by name) as a TypeScript module, formatted by Prettier with
 * the repository's settings.
 */
export async function colorsModule(
  colors: Readonly<Record<string, readonly number[]>>,
  file: URL,
): Promise<string> {
  const entries = Object.entries(colors).map(([name, list]) => {
    const items = list.map((color) => `0x${color.toString(16).padStart(6, '0')}`);
    return `  '${name}': [${items.join(', ')}],`;
  });
  const text = [
    '// Generated by `npm run sprites` (tools/sprites/stage-drawn.ts): do not edit.',
    '',
    '/**',
    ' * The large colors of the stage in each of its atmospheres (docs/flashs.md §3): those one of',
    ' * its layers covers 1 % of the screen with, the most covering first.',
    ' */',
    'export const STAGE_COLORS: Readonly<Record<string, readonly number[]>> = {',
    ...entries,
    '};',
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
