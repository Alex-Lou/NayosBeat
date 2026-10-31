/**
 * The title's vinyl and the icons' master drawn by hand (in Aseprite, docs/art/aseprite.md):
 * art-src/ui/vinyl.png and art-src/ui/icon.png take the place of the code's drawings
 * (vinyl.ts, icons.ts). They never change colorway, so their colors are free (256 at most):
 * `npm run sprites` rebuilds their palette.
 */

import { readFile } from 'node:fs/promises';
import { rgbaAt } from './colors.ts';
import { checkDrawn, DRAWN_ROOT, listFolder, type DrawnRules } from './drawn.ts';
import { codeIconPixels, iconPalette, ICON_MASTER, MASTER_START } from './icons.ts';
import { decodeIndexedPng, type IndexedImage, type Rgba } from './png.ts';
import { VINYL_CELLS, VINYL_FRAMES, vinylPixels } from './vinyl.ts';

/** Where they live in art-src/, beside the fighters' folders. */
export const UI_FOLDER = 'ui';

export interface UiArt {
  /** Square cells, in a row. */
  readonly cell: number;
  readonly frames: number;
  /** Seconds each frame shows, for Aseprite's preview, and whether they loop. */
  readonly seconds: number;
  readonly loops: boolean;
  /** Laid over a background (the icons'): a half-transparent pixel cannot be. */
  readonly opaque: boolean;
}

export const UI_ARTS = {
  // The format and the pace of the title's CSS (src/styles.css, .title-vinyl: steps(8), 1.8s).
  vinyl: {
    cell: VINYL_CELLS,
    frames: VINYL_FRAMES,
    seconds: 1.8 / VINYL_FRAMES,
    loops: true,
    opaque: false,
  },
  icon: { cell: ICON_MASTER, frames: 1, seconds: 1, loops: false, opaque: true },
} as const satisfies Record<string, UiArt>;

export type UiArtName = keyof typeof UI_ARTS;

export function isUiArt(name: string): name is UiArtName {
  return name in UI_ARTS;
}

/** The checks of a drawn one: its format, every frame drawn, any colors. */
export function uiRulesOf(name: UiArtName): DrawnRules {
  const { cell, frames } = UI_ARTS[name];
  return { cell, frames, slots: 256, filled: true, margin: 0, lowestRow: cell - 1 };
}

/** What is wrong with a drawn one (nothing when the list is empty). */
export function checkUiDrawn(label: string, image: IndexedImage, name: UiArtName): string[] {
  const problems = checkDrawn(label, image, uiRulesOf(name), undefined);
  if (problems.length > 0 || !UI_ARTS[name].opaque) return problems;
  const index = image.pixels.findIndex((slot) => {
    const { a } = rgbaAt(image, slot);
    return a !== 0 && a !== 255;
  });
  if (index < 0) return problems;
  const x = index % image.width;
  const y = Math.floor(index / image.width);
  return [`${label}: pixel ${x},${y} is half transparent (only fully opaque or fully transparent)`];
}

/**
 * The ones drawn under `root`, checked: throws with every problem found, so nothing is generated
 * from a drawing the game would show wrong. The other files there (the Aseprite ones) are left
 * alone.
 */
export async function loadUiDrawn(
  root: URL = DRAWN_ROOT,
): Promise<Partial<Record<UiArtName, IndexedImage>>> {
  const folder = new URL(`${UI_FOLDER}/`, root);
  const problems: string[] = [];
  const drawn: Partial<Record<UiArtName, IndexedImage>> = {};
  for (const file of (await listFolder(folder)).filter((name) => name.endsWith('.png')).sort()) {
    const name = file.slice(0, -'.png'.length);
    const label = `art-src/${UI_FOLDER}/${file}`;
    if (!isUiArt(name)) {
      problems.push(`${label}: no such image (${Object.keys(UI_ARTS).join(', ')})`);
      continue;
    }
    try {
      const image = await decodeIndexedPng(await readFile(new URL(file, folder)));
      const found = checkUiDrawn(label, image, name);
      problems.push(...found);
      if (found.length === 0) drawn[name] = image;
    } catch (error) {
      problems.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Drawn ${UI_FOLDER} images:\n${problems.map((line) => `  ${line}`).join('\n')}`,
    );
  }
  return drawn;
}

/** What a drawing starts from: the one drawn when there is one, the code's otherwise. */
export function uiStart(
  name: UiArtName,
  drawn: IndexedImage | undefined,
): { pixels: Uint8Array; palette: readonly Rgba[] } {
  if (drawn) {
    return { pixels: drawn.pixels, palette: drawn.colors.map((_, slot) => rgbaAt(drawn, slot)) };
  }
  if (name === 'vinyl') return vinylPixels();
  const { size, zoom, ring } = MASTER_START;
  return { pixels: codeIconPixels(size, zoom, ring), palette: iconPalette() };
}
