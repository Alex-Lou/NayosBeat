/**
 * Strips drawn by hand (in Aseprite, docs/art/aseprite.md), which take the place of the ones
 * drawn by code, strip by strip:
 *
 * - art-src/<fighter>/<strip>.png: the strip; its front effects in art-src/<fighter>/fx/<strip>.png
 *   (a drawn strip without that file has none);
 * - art-src/<fighter>/fx/<name>.png: the platine effects of a Remix (`Fighter.platine`), drawn
 *   apart; without it, the code redraws its special's effects in platine, as before.
 *
 * Each is one row of full cells (CELL_SIZE), the feet on ANCHOR, saved as an 8-bit indexed PNG
 * whose pixels are the fighter's palette slots and whose palette is its main colorway: the second
 * colorway swaps the palette, as for the strips drawn by code. Several slots share a color in the
 * main colorway and differ in the other one (outlines): only the indices tell them apart, which is
 * why the file's colors are checked against the fighter's, never used to find a slot.
 */

import { readdir, readFile } from 'node:fs/promises';
import { CELL_SIZE } from '../../src/art/types.ts';
import { CELL_MARGIN, cellBoxOf, GROUND_ROW, GROUNDED_STRIPS, LOWEST_ROW } from './cell.ts';
import type { ShownStrike } from './clips.ts';
import type { Fighter } from './fighter.ts';
import { decodeIndexedPng, type IndexedImage, type Rgba } from './png.ts';
import type { PixelCanvas } from './raster.ts';
import { drawStrip, drawStripEffects, toPlatine } from './sheet.ts';

/** Where the drawn strips and their Aseprite files live. */
export const DRAWN_ROOT = new URL('../../art-src/', import.meta.url);

/** The pixels of a strip, wherever they come from (the code or a drawing). */
export type StripPixels = Pick<PixelCanvas, 'width' | 'height' | 'pixels'>;

/** What an image holds: a strip's body (the projectile, for a strip of effects only), or its front effects. */
export type DrawnLayer = 'body' | 'fx';

/**
 * The checks a drawn image passes, the cell's contract that the strips drawn by code keep too
 * (cell.ts, tests/tools): written in the Aseprite templates as well, so the extension warns
 * before it exports.
 */
export interface DrawnRules {
  readonly frames: number;
  /** The fighter's palette slots: an index at or past it is none of its colors (a guide's). */
  readonly slots: number;
  /** Every frame draws something. */
  readonly filled: boolean;
  /** Empty sprite pixels kept along the left, right and top edges of every cell. */
  readonly margin: number;
  /** The lowest row a cell may draw on. */
  readonly lowestRow: number;
  /** The row every frame's lowest pixel reaches at least (the feet on the ground), if any. */
  readonly groundRow?: number;
}

const GROUNDED: ReadonlySet<string> = new Set(GROUNDED_STRIPS);

/** The strip a drawn image goes with: its own name, or a Remix's special for its effects. */
export function stripOf(fighter: Fighter, name: string): string | undefined {
  if (name in fighter.sheets) return name;
  return fighter.platine[name];
}

/** The checks of image `layer` of strip (or Remix effects) `name`. */
export function rulesOf(fighter: Fighter, name: string, layer: DrawnLayer): DrawnRules {
  const strip = stripOf(fighter, name);
  const spec = strip === undefined ? undefined : fighter.sheets[strip];
  if (!spec) throw new Error(`${fighter.name} has no strip ${name}`);
  const slots = fighter.paletteOf('main').length;
  const kept = { frames: spec.frames, slots, margin: CELL_MARGIN };
  // Effects may go a little below the ground (dust, floor rings), not off the cell.
  if (layer === 'fx') return { ...kept, filled: false, lowestRow: CELL_SIZE - 1 };
  const body = { ...kept, filled: true, lowestRow: LOWEST_ROW };
  return GROUNDED.has(name) ? { ...body, groundRow: GROUND_ROW } : body;
}

/**
 * What is wrong with a drawn image (`label` names it in the messages, its frames numbered from 1
 * as Aseprite does), against its rules and the fighter's main palette: nothing when the list is
 * empty.
 */
export function checkDrawn(
  label: string,
  image: IndexedImage,
  rules: DrawnRules,
  palette: readonly Rgba[],
): string[] {
  const width = CELL_SIZE * rules.frames;
  if (image.width !== width || image.height !== CELL_SIZE) {
    return [
      `${label}: ${image.width}x${image.height} px, expected ${width}x${CELL_SIZE} (${rules.frames} cells of ${CELL_SIZE} px in a row)`,
    ];
  }
  const problems: string[] = [];
  const seen = new Set<number>();
  const extents = Array.from({ length: rules.frames }, () => ({
    top: CELL_SIZE,
    bottom: -1,
    left: CELL_SIZE,
    right: -1,
  }));
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const slot = image.pixels[y * image.width + x] ?? 0;
      if (slot === 0) continue;
      const frame = Math.floor(x / CELL_SIZE);
      const column = x % CELL_SIZE;
      if (!seen.has(slot)) {
        seen.add(slot);
        const problem = slotProblem(slot, image, rules, palette);
        if (problem)
          problems.push(`${label}: frame ${frame + 1}, pixel ${column},${y}: ${problem}`);
      }
      const extent = extents[frame];
      if (!extent) continue;
      extent.top = Math.min(extent.top, y);
      extent.bottom = Math.max(extent.bottom, y);
      extent.left = Math.min(extent.left, column);
      extent.right = Math.max(extent.right, column);
    }
  }
  if (extents.every(({ bottom }) => bottom < 0) && !rules.filled) {
    problems.push(`${label} draws nothing (no file means no effects)`);
  }
  extents.forEach(({ top, bottom, left, right }, frame) => {
    const at = `${label}: frame ${frame + 1}`;
    if (bottom < 0) {
      if (rules.filled) problems.push(`${at} is empty`);
      return;
    }
    const edge = Math.min(top, left, CELL_SIZE - 1 - right);
    if (edge < rules.margin) {
      problems.push(`${at} comes ${edge} px from the cell's edge (${rules.margin} at least)`);
    }
    if (bottom > rules.lowestRow) {
      problems.push(
        `${at} draws under the ground, down to row ${bottom} (${rules.lowestRow} at most)`,
      );
    }
    if (rules.groundRow !== undefined && bottom < rules.groundRow) {
      problems.push(
        `${at}: the feet float, its lowest pixel is on row ${bottom} (${rules.groundRow} at least)`,
      );
    }
  });
  return problems;
}

/** Why a slot drawn in an image is wrong, if it is: none of the fighter's, or recolored. */
function slotProblem(
  slot: number,
  image: IndexedImage,
  rules: DrawnRules,
  palette: readonly Rgba[],
): string | undefined {
  const expected = palette[slot];
  if (slot >= rules.slots || !expected) {
    return `color ${slot} is none of the fighter's ${rules.slots} (a guide's?)`;
  }
  const color = image.colors[slot] ?? 0;
  const alpha = image.alpha[slot] ?? 255;
  const wanted = (expected.r << 16) | (expected.g << 8) | expected.b;
  if (color === wanted && alpha === expected.a) return undefined;
  return `color ${slot} is ${hex(color, alpha)} in the file, ${hex(wanted, expected.a)} in the fighter's palette (colors change in its palette.ts, not in a drawing)`;
}

function hex(color: number, alpha: number): string {
  const rgb = color.toString(16).padStart(6, '0');
  return `#${rgb}${alpha === 255 ? '' : alpha.toString(16).padStart(2, '0')}`;
}

/** A drawn strip: its body, and its front effects (a Remix's effects have only those). */
export interface Drawn {
  readonly body?: StripPixels;
  readonly fx?: StripPixels;
}

/**
 * Every image drawn for `fighter` under `root`, checked: throws with every problem found, so
 * nothing is generated from a drawing the game would play wrong. The other files there (the
 * Aseprite ones) are left alone.
 */
export async function loadDrawn(
  fighter: Fighter,
  root: URL = DRAWN_ROOT,
): Promise<ReadonlyMap<string, Drawn>> {
  const folder = new URL(`${fighter.name}/`, root);
  const palette = fighter.paletteOf('main');
  const problems: string[] = [];
  const drawn = new Map<string, Drawn>();
  const read = async (path: string, rules: DrawnRules): Promise<IndexedImage | undefined> => {
    const label = `art-src/${fighter.name}/${path}`;
    try {
      const image = await decodeIndexedPng(await readFile(new URL(path, folder)));
      const found = checkDrawn(label, image, rules, palette);
      problems.push(...found);
      return found.length === 0 ? image : undefined;
    } catch (error) {
      problems.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  };
  const strips = pngNames(await listFolder(folder));
  for (const name of strips) {
    if (!(name in fighter.sheets)) {
      problems.push(`art-src/${fighter.name}/${name}.png: ${fighter.name} has no strip ${name}`);
      continue;
    }
    const body = await read(`${name}.png`, rulesOf(fighter, name, 'body'));
    if (body) drawn.set(name, { body });
  }
  for (const name of pngNames(await listFolder(new URL('fx/', folder)))) {
    const path = `fx/${name}.png`;
    const remix = name in fighter.platine;
    if (!remix && !(name in fighter.sheets)) {
      problems.push(`art-src/${fighter.name}/${path}: ${fighter.name} has no strip ${name}`);
      continue;
    }
    if (!remix && !strips.includes(name)) {
      problems.push(
        `art-src/${fighter.name}/${path}: front effects without their strip (${name}.png)`,
      );
      continue;
    }
    const fx = await read(path, rulesOf(fighter, name, 'fx'));
    if (fx) drawn.set(name, { ...drawn.get(name), fx });
  }
  if (problems.length > 0) {
    const lines = problems.map((line) => `  ${line}`).join('\n');
    throw new Error(`Drawn strips of ${fighter.name}:\n${lines}`);
  }
  return drawn;
}

/** The names of the PNG files of a folder listing, in order. */
function pngNames(files: readonly string[]): string[] {
  return files
    .filter((file) => file.endsWith('.png'))
    .map((file) => file.slice(0, -'.png'.length))
    .sort();
}

/** The files of a folder; none when it does not exist (nothing drawn yet). */
async function listFolder(folder: URL): Promise<string[]> {
  try {
    return await readdir(folder);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * The body and front effects of a strip as the game gets them: the drawing when there is one
 * (with its effects, or none), the code's otherwise.
 */
export function stripPixels(
  fighter: Fighter,
  sheet: string,
  drawn: ReadonlyMap<string, Drawn>,
): { body: StripPixels; fx: StripPixels | undefined; drawn: boolean } {
  const own = drawn.get(sheet);
  if (own?.body) return { body: own.body, fx: own.fx, drawn: true };
  return { body: drawStrip(fighter, sheet), fx: drawStripEffects(fighter, sheet), drawn: false };
}

/** A Remix's platine effects: drawn apart, or its special's redrawn in platine by the code. */
export function platinePixels(
  fighter: Fighter,
  name: string,
  drawn: ReadonlyMap<string, Drawn>,
): { fx: StripPixels | undefined; drawn: boolean } {
  const own = drawn.get(name)?.fx;
  if (own) return { fx: own, drawn: true };
  const sheet = fighter.platine[name];
  if (sheet === undefined) throw new Error(`${fighter.name} has no Remix effects ${name}`);
  return { fx: drawStripEffects(fighter, sheet, toPlatine), drawn: false };
}

/**
 * The active frames of `strike` where nothing drawn (body or front effects) lies in its hitbox:
 * a blow that would hit where nothing is seen.
 */
export function unseenStrikes(
  strike: ShownStrike,
  layers: readonly (StripPixels | undefined)[],
): number[] {
  // The pixels the guides outline in red (aseprite-template.ts), clipped to the cell.
  const box = cellBoxOf(strike.box);
  const left = Math.max(0, box.left);
  const right = Math.min(CELL_SIZE - 1, box.right);
  const top = Math.max(0, box.top);
  const bottom = Math.min(CELL_SIZE - 1, box.bottom);
  return strike.frames.filter((frame) =>
    layers.every((layer) => {
      if (!layer) return true;
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if ((layer.pixels[y * layer.width + frame * CELL_SIZE + x] ?? 0) !== 0) return false;
        }
      }
      return true;
    }),
  );
}
