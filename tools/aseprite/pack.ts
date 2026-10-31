/**
 * Packs the Aseprite extension (tools/aseprite/extension/) into
 * tools/aseprite/dist/nayosbeat-sprites.aseprite-extension, not committed: Aseprite installs it
 * from Edit > Preferences > Extensions > Add Extension (docs/art/aseprite.md). Run with
 * `npm run aseprite:extension`.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { zip } from './zip.ts';

const EXTENSION = new URL('./extension/', import.meta.url);
const DIST = new URL('./dist/', import.meta.url);
const FILES = ['package.json', 'nayosbeat.lua'];
const NAME = 'nayosbeat-sprites.aseprite-extension';

const entries = await Promise.all(
  FILES.map(async (name) => ({ name, data: await readFile(new URL(name, EXTENSION)) })),
);
await mkdir(DIST, { recursive: true });
await writeFile(new URL(NAME, DIST), zip(entries));
console.log(`tools/aseprite/dist/${NAME} (${FILES.join(', ')})`);
