/**
 * Writes the Aseprite templates (see aseprite-template.ts) into art-src/gabarits/<fighter>/
 * <name>.json, not committed: one per strip, and one per Remix's platine effects. The Aseprite
 * extension (tools/aseprite/) builds a new drawing from one. Run again whenever the frame data or
 * the palette change: the guides follow.
 *
 *   npm run sprites:templates                     # every strip of both fighters
 *   npm run sprites:templates -- riff             # one fighter
 *   npm run sprites:templates -- nayo idle super  # some strips of one fighter
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { templateOf } from './aseprite-template.ts';
import { DRAWN_ROOT, loadDrawn } from './drawn.ts';
import type { Fighter } from './fighter.ts';
import { frameDataOf } from './frame-data.ts';
import { NAYO } from './nayo/index.ts';
import { RIFF } from './riff/index.ts';

const FIGHTERS: readonly Fighter[] = [NAYO, RIFF];
const TEMPLATES = new URL('gabarits/', DRAWN_ROOT);

async function write(fighter: Fighter, names: readonly string[]): Promise<void> {
  const all = [...Object.keys(fighter.sheets), ...Object.keys(fighter.platine)];
  const unknown = names.filter((name) => !all.includes(name));
  if (unknown.length > 0) {
    throw new Error(`${fighter.name} has no strip ${unknown.join(', ')}: ${all.join(', ')}`);
  }
  const twice = Object.keys(fighter.platine).filter((name) => name in fighter.sheets);
  if (twice.length > 0) {
    throw new Error(`${fighter.name}: Remix effects named like a strip: ${twice.join(', ')}`);
  }
  const drawn = await loadDrawn(fighter);
  const folder = new URL(`${fighter.name}/`, TEMPLATES);
  await mkdir(folder, { recursive: true });
  for (const name of names.length > 0 ? names : all) {
    const template = templateOf(fighter, frameDataOf(fighter), name, drawn);
    await writeFile(new URL(`${name}.json`, folder), JSON.stringify(template));
    const from = drawn.has(name) ? 'the drawing' : 'the code';
    console.log(
      `art-src/gabarits/${fighter.name}/${name}.json (${template.frames} frames, from ${from})`,
    );
  }
}

async function main(): Promise<void> {
  const [first, ...rest] = process.argv.slice(2);
  const fighter = FIGHTERS.find((candidate) => candidate.name === first);
  if (first !== undefined && !fighter) {
    throw new Error(`Unknown fighter ${first}: ${FIGHTERS.map(({ name }) => name).join(', ')}`);
  }
  if (fighter) await write(fighter, rest);
  else for (const each of FIGHTERS) await write(each, []);
}

await main();
