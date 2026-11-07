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
import { checkDrawn, type DrawnRules } from './drawn-rules.ts';
import { decodeIndexedPng, type IndexedImage } from './png.ts';
import type { PixelCanvas } from './raster.ts';
import { drawStrip, drawStripEffects, toPlatine } from './sheet.ts';

export { checkDrawn, type DrawnRules } from './drawn-rules.ts';

/** Where the drawn strips and their Aseprite files live. */
export const DRAWN_ROOT = new URL('../../art-src/', import.meta.url);

/** What is wrong with drawings: the artist's to fix, not a bug of the tools. */
export class DrawingProblems extends Error {
  override name = 'DrawingProblems';
}

/**
 * Runs a tool's `main`, the problems found in drawings shown as they are (the list, without a
 * stack trace: the line to fix stays readable) and the run failed (exit code 1). Any other error
 * is a bug, thrown as it is.
 */
export async function reportingDrawingProblems(main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (error) {
    if (!(error instanceof DrawingProblems)) throw error;
    console.error(error.message);
    process.exitCode = 1;
  }
}

/** The pixels of a strip, wherever they come from (the code or a drawing). */
export type StripPixels = Pick<PixelCanvas, 'width' | 'height' | 'pixels'>;

/** What an image holds: a strip's body (the projectile, for a strip of effects only), or its front effects. */
export type DrawnLayer = 'body' | 'fx';

const GROUNDED: ReadonlySet<string> = new Set(GROUNDED_STRIPS);

/** The strip a drawn image goes with: its own name, or a Remix's special for its effects. */
export function stripOf(fighter: Fighter, name: string): string | undefined {
  if (name in fighter.sheets) return name;
  return fighter.platine[name];
}

/**
 * The bust of the select screen, drawn apart (art-src/<fighter>/portrait.png): a square in the
 * fighter's palette slots, both colorways, in place of the square the game cuts from its guard.
 */
export const PORTRAIT = 'portrait';
export const PORTRAIT_SIZE = 96;

export function portraitRules(fighter: Fighter): DrawnRules {
  return {
    width: PORTRAIT_SIZE,
    height: PORTRAIT_SIZE,
    frames: 1,
    slots: fighter.paletteOf('main').length,
    filled: true,
    margin: 0,
    lowestRow: PORTRAIT_SIZE - 1,
    transparency: 'any',
  };
}

/** The checks of image `layer` of strip (or Remix effects) `name`. */
export function rulesOf(fighter: Fighter, name: string, layer: DrawnLayer): DrawnRules {
  const strip = stripOf(fighter, name);
  const spec = strip === undefined ? undefined : fighter.sheets[strip];
  if (!spec) throw new Error(`${fighter.name} has no strip ${name}`);
  const slots = fighter.paletteOf('main').length;
  const kept = {
    width: CELL_SIZE,
    height: CELL_SIZE,
    frames: spec.frames,
    slots,
    margin: CELL_MARGIN,
    transparency: 'any' as const,
  };
  // Effects may go a little below the ground (dust, floor rings), not off the cell.
  if (layer === 'fx') return { ...kept, filled: false, lowestRow: CELL_SIZE - 1 };
  const body = { ...kept, filled: true, lowestRow: LOWEST_ROW };
  return GROUNDED.has(name) ? { ...body, groundRow: GROUND_ROW } : body;
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
    if (name === PORTRAIT) {
      const portrait = await read(`${name}.png`, portraitRules(fighter));
      if (portrait) drawn.set(name, { body: portrait });
      continue;
    }
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
    throw new DrawingProblems(`Drawn strips of ${fighter.name}:\n${lines}`);
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
export async function listFolder(folder: URL): Promise<string[]> {
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
