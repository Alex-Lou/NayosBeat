/**
 * Draws Nayo's sprite strips into src/art/nayo/ (game assets) and enlarged copies into
 * tools/sprites/preview/ (to look at, not committed). Run with `npm run sprites`.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { NAYO_SHEETS, type NayoSheet } from '../../src/art/nayo/sheets.ts';
import { PALETTE } from './nayo/look.ts';
import { encodeIndexedPng } from './png.ts';
import { drawSheet } from './sheet.ts';

const ASSETS = new URL('../../src/art/nayo/', import.meta.url);
const PREVIEW = new URL('./preview/', import.meta.url);
const PREVIEW_SCALE = 4;

async function main(): Promise<void> {
  await mkdir(PREVIEW, { recursive: true });
  for (const sheet of Object.keys(NAYO_SHEETS) as NayoSheet[]) {
    const canvas = drawSheet(sheet);
    const { width, height, pixels } = canvas;
    await writeFile(
      new URL(`${sheet}.png`, ASSETS),
      await encodeIndexedPng(width, height, pixels, PALETTE),
    );
    await writeFile(
      new URL(`${sheet}.png`, PREVIEW),
      await encodeIndexedPng(width, height, pixels, PALETTE, PREVIEW_SCALE),
    );
    console.log(`${sheet}: ${NAYO_SHEETS[sheet].frames} frames`);
  }
}

await main();
