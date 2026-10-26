/**
 * Draws Nayo's sprite strips into src/art/nayo/<colorway>/ (game assets) and enlarged copies
 * into tools/sprites/preview/ (to look at, not committed). Run with `npm run sprites`.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { NAYO_SHEETS, type NayoSheet } from '../../src/art/nayo/sheets.ts';
import { paletteOf, type Colorway } from './nayo/look.ts';
import { encodeIndexedPng } from './png.ts';
import { drawSheet } from './sheet.ts';

const ASSETS = new URL('../../src/art/nayo/', import.meta.url);
const PREVIEW = new URL('./preview/', import.meta.url);
const PREVIEW_SCALE = 4;
const COLORWAYS: readonly Colorway[] = ['main', 'alt'];

async function main(): Promise<void> {
  for (const colorway of COLORWAYS) {
    await mkdir(new URL(`${colorway}/`, ASSETS), { recursive: true });
    await mkdir(new URL(`${colorway}/`, PREVIEW), { recursive: true });
  }
  for (const sheet of Object.keys(NAYO_SHEETS) as NayoSheet[]) {
    const { width, height, pixels } = drawSheet(sheet);
    for (const colorway of COLORWAYS) {
      const palette = paletteOf(colorway);
      const file = `${colorway}/${sheet}.png`;
      await writeFile(
        new URL(file, ASSETS),
        await encodeIndexedPng(width, height, pixels, palette),
      );
      await writeFile(
        new URL(file, PREVIEW),
        await encodeIndexedPng(width, height, pixels, palette, PREVIEW_SCALE),
      );
    }
    console.log(`${sheet}: ${NAYO_SHEETS[sheet].frames} frames`);
  }
}

await main();
