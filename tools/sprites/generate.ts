/**
 * Draws every fighter's sprite strips into src/art/<fighter>/<colorway>/ (game assets), their
 * front effects into src/art/<fighter>/<colorway>/fx/, each image with its atlas (`<strip>.json`:
 * its frames cut to what they draw and packed, tools/sprites/atlas.ts), the size and anchor of
 * their cropped cells and what each frame draws into src/art/<fighter>/cells.ts, enlarged copies
 * of the cropped cells side by side into tools/sprites/preview/ (to look at, not committed), the
 * installed game's icons into public/icons/ and the title's vinyl into src/ui/title-vinyl.png.
 * Run with `npm run sprites`; `npm run sprites -- riff` draws one fighter only (Nayo's run also
 * draws the icons and the vinyl).
 *
 * A strip drawn by hand (art-src/<fighter>/, see drawn.ts) takes the place of the code's, and is
 * cut and packed into its atlas just the same. The title's vinyl and the icons' master may be
 * drawn too (art-src/ui/, see ui-drawn.ts). A fighter's portrait (drawn.ts) and the stage
 * (art-src/entrepot/, see stage-drawn.ts) are drawn by hand only and saved whole, one image each:
 * no atlas. Nayo's run also writes the stage, src/art/entrepot/. Every drawing is checked first,
 * and nothing is written when one is wrong.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { ANCHOR, CELL_SIZE, type Atlas, type Cell } from '../../src/art/types.ts';
import { atlasJson, packStrip } from './atlas.ts';
import { strikeOf } from './clips.ts';
import {
  loadDrawn,
  platinePixels,
  PORTRAIT,
  reportingDrawingProblems,
  stripPixels,
  unseenStrikes,
  type Drawn,
  type StripPixels,
} from './drawn.ts';
import type { Fighter } from './fighter.ts';
import { FIGHTERS } from './fighters.ts';
import { frameDataOf } from './frame-data.ts';
import { drawIcons } from './icons.ts';
import { NAYO } from './nayo/index.ts';
import type { Colorway } from './palette.ts';
import { encodeIndexedPng } from './png.ts';
import { loadStageDrawn, writeStage } from './stage-drawn.ts';
import { loadUiDrawn } from './ui-drawn.ts';
import { drawVinyl } from './vinyl.ts';

const ART = new URL('../../src/art/', import.meta.url);
const PREVIEW = new URL('./preview/', import.meta.url);
const PREVIEW_SCALE = 2;
const COLORWAYS: readonly Colorway[] = ['main', 'alt'];
/** Empty pixels kept around what a strip draws, so the outline never touches a cell edge. */
const MARGIN = 2;
/** Prettier's line length (.prettierrc.json), which the cells module is formatted to. */
const PRINT_WIDTH = 100;

interface Image {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/**
 * Crops every cell of a strip to the box that all its frames draw in: most of a 256 px cell is
 * empty, and video memory is precious on phones. `anchor` is the pixel that goes on the
 * fighter's position in the full cell.
 */
function crop(canvas: StripPixels, anchor: Cell['anchor']): { image: Image; cell: Cell } {
  const frames = canvas.width / CELL_SIZE;
  let left = CELL_SIZE;
  let right = -1;
  let top = CELL_SIZE;
  let bottom = -1;
  for (let y = 0; y < CELL_SIZE; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (canvas.pixels[y * canvas.width + x] === 0) continue;
      const cellX = x % CELL_SIZE;
      left = Math.min(left, cellX);
      right = Math.max(right, cellX);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error('Empty strip');
  left = Math.max(0, left - MARGIN);
  top = Math.max(0, top - MARGIN);
  right = Math.min(CELL_SIZE - 1, right + MARGIN);
  bottom = Math.min(CELL_SIZE - 1, bottom + MARGIN);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const pixels = new Uint8Array(width * frames * height);
  for (let frame = 0; frame < frames; frame++) {
    for (let y = 0; y < height; y++) {
      const from = (top + y) * canvas.width + frame * CELL_SIZE + left;
      pixels.set(canvas.pixels.subarray(from, from + width), y * width * frames + frame * width);
    }
  }
  return {
    image: { width: width * frames, height, pixels },
    cell: { width, height, anchor: { x: anchor.x - left, y: anchor.y - top } },
  };
}

/** Nayo's previews stay where they always were; the other fighters' go in their own folder. */
function previewOf(fighter: Fighter): URL {
  return fighter === NAYO ? PREVIEW : new URL(`${fighter.name}/`, PREVIEW);
}

/** A strip as saved: its atlas, and its cropped cells side by side (the preview, to look at). */
interface Atlased {
  readonly page: Image;
  readonly atlas: Atlas;
  readonly preview: Image;
  /** The cropped cell, with what each frame draws. */
  readonly cell: Cell;
}

/**
 * A strip in full cells (`canvas`), drawn by code or by hand, cropped (`crop`) and saved as an
 * atlas named `file` (tools/sprites/atlas.ts): each frame cut to what it draws, the cuts packed.
 */
function atlased(canvas: StripPixels, file: string): Atlased {
  const { image, cell } = crop(canvas, ANCHOR);
  // The cropped cell in the full one: cropping moved the anchor by as much.
  const box = {
    left: ANCHOR.x - cell.anchor.x,
    top: ANCHOR.y - cell.anchor.y,
    width: cell.width,
    height: cell.height,
  };
  const name = `${file.slice(file.lastIndexOf('/') + 1)}.png`;
  const { image: page, atlas, extents } = packStrip(canvas, box, name);
  return { page, atlas, preview: image, cell: { ...cell, frames: extents } };
}

/**
 * Writes `image` as `file` (no extension) in each colorway, and `preview` enlarged beside the
 * other previews (to look at).
 */
async function savePng(
  fighter: Fighter,
  image: Image,
  file: string,
  preview: Image = image,
): Promise<void> {
  const assets = new URL(`${fighter.name}/`, ART);
  for (const colorway of COLORWAYS) {
    // Only the colors the image may use: the Boost's platine where it draws in it.
    const palette = fighter.paletteOf(colorway, image.pixels);
    const path = `${colorway}/${file}.png`;
    await writeFile(
      new URL(path, assets),
      await encodeIndexedPng(image.width, image.height, image.pixels, palette),
    );
    await writeFile(
      new URL(path, previewOf(fighter)),
      await encodeIndexedPng(preview.width, preview.height, preview.pixels, palette, PREVIEW_SCALE),
    );
  }
}

/** Writes `strip` as `file` (no extension): its image and its atlas, in each colorway. */
async function save(fighter: Fighter, strip: Atlased, file: string): Promise<void> {
  await savePng(fighter, strip.page, file, strip.preview);
  const json = new TextEncoder().encode(atlasJson(strip.atlas));
  for (const colorway of COLORWAYS) {
    await writeFile(new URL(`${fighter.name}/${colorway}/${file}.json`, ART), json);
  }
}

/** The cells as a TypeScript module, formatted the way Prettier would. */
function cellsModule(fighter: Fighter, cells: ReadonlyMap<string, Cell>): string {
  const lines = [...cells].flatMap(([name, cell]) => cellLines(name, cell));
  return [
    '// Generated by `npm run sprites` (tools/sprites/generate.ts): do not edit.',
    "import type { Cell } from '../types';",
    '',
    '/**',
    ' * Cropped cells of each strip (and of its front effects, `fx/`), with their anchor and what',
    ' * each frame draws.',
    ' */',
    `export const ${fighter.name.toUpperCase()}_CELLS: Readonly<Record<string, Cell>> = {`,
    ...lines,
    '};',
    '',
  ].join('\n');
}

/** One cell of the cells module, on one line when it fits, the way Prettier would. */
function cellLines(name: string, { width, height, anchor, frames = [] }: Cell): string[] {
  const key = /^\w+$/.test(name) ? name : `'${name}'`;
  const head = [
    `width: ${width}`,
    `height: ${height}`,
    `anchor: { x: ${anchor.x}, y: ${anchor.y} }`,
  ];
  const boxes = frames.map(
    (f) => `{ x: ${f.x}, y: ${f.y}, width: ${f.width}, height: ${f.height} }`,
  );
  // Prettier breaks an array of two objects or more, one per line.
  const list = boxes.length > 1 ? ['frames: [', ...boxes.map((box) => `  ${box},`), ']'] : [];
  const fields = boxes.length === 1 ? [...head, `frames: [${boxes.join('')}]`] : head;
  const line = `  ${key}: { ${fields.join(', ')} },`;
  if (list.length === 0 && line.length <= PRINT_WIDTH) return [line];
  return [
    `  ${key}: {`,
    ...fields.map((field) => `    ${field},`),
    ...list.map((part, index) => `    ${part}${index === list.length - 1 ? ',' : ''}`),
    '  },',
  ];
}

async function generate(fighter: Fighter, drawn: ReadonlyMap<string, Drawn>): Promise<void> {
  const assets = new URL(`${fighter.name}/`, ART);
  const { template, clips } = frameDataOf(fighter);
  for (const colorway of COLORWAYS) {
    // Effects are rewritten from scratch: a strip that lost its effects must not keep old ones.
    await rm(new URL(`${colorway}/fx/`, assets), { recursive: true, force: true });
    for (const root of [assets, previewOf(fighter)]) {
      await mkdir(new URL(`${colorway}/fx/`, root), { recursive: true });
    }
  }
  const cells = new Map<string, Cell>();
  // Each strip cropped, then saved as an atlas named `file`, its cell kept under the same name.
  const keep = async (canvas: StripPixels, file: string): Promise<Atlased> => {
    const strip = atlased(canvas, file);
    await save(fighter, strip, file);
    cells.set(file, strip.cell);
    return strip;
  };
  for (const [sheet, { frames }] of Object.entries(fighter.sheets)) {
    const strip = stripPixels(fighter, sheet, drawn);
    const body = await keep(strip.body, sheet);
    if (strip.fx) await keep(strip.fx, `fx/${sheet}`);
    const { width, height } = body.cell;
    const { w, h } = body.atlas.meta.size;
    const notes = `${strip.fx ? ' + fx' : ''}${strip.drawn ? ' (drawn)' : ''}`;
    console.log(`${fighter.name} ${sheet}: ${frames} x ${width}x${height} in ${w}x${h}${notes}`);
    // The code's strips are measured by the tests; a drawing, here.
    const strike = strip.drawn ? strikeOf(clips, template, sheet) : undefined;
    const unseen = strike ? unseenStrikes(strike, [strip.body, strip.fx]) : [];
    if (unseen.length > 0) {
      // Numbered from 1, as Aseprite does.
      const listed = unseen.map((frame) => frame + 1).join(', ');
      console.warn(`  warning: nothing drawn in the hitbox on frame(s) ${listed} (from 1)`);
    }
  }
  // The effects a clip names (a Remix's): drawn apart, or its strip's redrawn in platine.
  for (const [name, sheet] of Object.entries(fighter.platine)) {
    const platine = platinePixels(fighter, name, drawn);
    if (!platine.fx) {
      throw new Error(`${fighter.name} ${name}: strip ${sheet} has no effects to redraw`);
    }
    await keep(platine.fx, `fx/${name}`);
    const how = platine.drawn ? 'drawn' : `the effects of ${sheet} in platine`;
    console.log(`${fighter.name} ${name}: ${how}`);
  }
  // The select screen's bust, drawn apart; without it, the game cuts one from the guard. One
  // image shown whole, not a strip of cells: no atlas.
  const portrait = drawn.get(PORTRAIT)?.body;
  if (portrait) {
    await savePng(fighter, portrait, PORTRAIT);
    console.log(`${fighter.name} ${PORTRAIT}: drawn`);
  } else {
    for (const colorway of COLORWAYS) {
      await rm(new URL(`${colorway}/${PORTRAIT}.png`, assets), { force: true, recursive: true });
    }
  }
  await writeFile(
    new URL('cells.ts', assets),
    new TextEncoder().encode(cellsModule(fighter, cells)),
  );
}

async function main(): Promise<void> {
  const names = process.argv.slice(2);
  const unknown = names.filter((name) => !FIGHTERS.some((fighter) => fighter.name === name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown fighter ${unknown.join(', ')}: ${FIGHTERS.map((f) => f.name).join(', ')}`,
    );
  }
  const chosen = names.length === 0 ? FIGHTERS : FIGHTERS.filter((f) => names.includes(f.name));
  // Every drawing first: a wrong one stops the run before anything is erased or written.
  const drawnOf = new Map<Fighter, ReadonlyMap<string, Drawn>>();
  for (const fighter of chosen) drawnOf.set(fighter, await loadDrawn(fighter));
  const ui = chosen.includes(NAYO) ? await loadUiDrawn() : undefined;
  const stage = chosen.includes(NAYO) ? await loadStageDrawn() : undefined;
  for (const fighter of chosen) await generate(fighter, drawnOf.get(fighter) ?? new Map());
  if (ui) {
    await drawIcons(ui.icon);
    console.log(`icons: ${ui.icon ? 'from the master drawn (art-src/ui/icon.png)' : "the code's"}`);
    await drawVinyl(ui.vinyl);
    console.log(`title vinyl: ${ui.vinyl ? 'drawn (art-src/ui/vinyl.png)' : "the code's"}`);
  }
  if (stage) {
    await writeStage(stage);
    const layers = Object.keys(stage);
    console.log(`stage: ${layers.length > 0 ? `drawn (${layers.join(', ')})` : 'the grey box'}`);
  }
}

await reportingDrawingProblems(main);
