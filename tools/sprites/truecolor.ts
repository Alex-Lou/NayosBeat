/**
 * A truecolor PNG's pixels, for a stage that keeps its illustration's colors (Sakura). The
 * project's own decoder reads it: no image dependency, and no palette.
 */

import { readFile } from 'node:fs/promises';
import { decodeTruecolorPng, type TruecolorImage } from './png.ts';

export type { TruecolorImage };

export async function readTruecolor(url: URL): Promise<TruecolorImage> {
  return decodeTruecolorPng(await readFile(url));
}
