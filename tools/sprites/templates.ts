/**
 * Writes the Aseprite templates (see aseprite-template.ts) into art-src/gabarits/<folder>/
 * <name>.json, not committed: one per strip, per Remix's platine effects and per fighter's
 * portrait, one per UI image (the title's vinyl, the icons' master: art-src/gabarits/ui/), and one
 * per layer of the stage (art-src/gabarits/entrepot/). The Aseprite extension (tools/aseprite/)
 * builds a new drawing from one. Run again whenever the frame data or the palette change: the
 * guides follow.
 *
 *   npm run sprites:templates                     # all of them
 *   npm run sprites:templates -- riff             # one fighter's
 *   npm run sprites:templates -- nayo idle super  # some of one fighter's (portrait: its portrait)
 *   npm run sprites:templates -- ui               # the UI images (-- ui vinyl: one)
 *   npm run sprites:templates -- entrepot         # the stage's layers (-- entrepot far: one)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { STAGE_LAYER_NAMES, STAGE_NAME } from '../../src/art/stage-layers.ts';
import {
  portraitTemplateOf,
  stageTemplateOf,
  templateOf,
  uiTemplateOf,
  type Template,
} from './aseprite-template.ts';
import { DRAWN_ROOT, loadDrawn, PORTRAIT } from './drawn.ts';
import type { Fighter } from './fighter.ts';
import { frameDataOf } from './frame-data.ts';
import { NAYO } from './nayo/index.ts';
import { RIFF } from './riff/index.ts';
import { isStageLayer, loadStageDrawn } from './stage-drawn.ts';
import { isUiArt, loadUiDrawn, UI_ARTS, UI_FOLDER } from './ui-drawn.ts';

const FIGHTERS: readonly Fighter[] = [NAYO, RIFF];
const TEMPLATES = new URL('gabarits/', DRAWN_ROOT);

async function write(fighter: Fighter, names: readonly string[]): Promise<void> {
  const all = [...Object.keys(fighter.sheets), ...Object.keys(fighter.platine), PORTRAIT];
  const unknown = names.filter((name) => !all.includes(name));
  if (unknown.length > 0) {
    throw new Error(`${fighter.name} has no strip ${unknown.join(', ')}: ${all.join(', ')}`);
  }
  const twice = [...Object.keys(fighter.platine), PORTRAIT].filter(
    (name) => name in fighter.sheets,
  );
  if (twice.length > 0) {
    throw new Error(`${fighter.name}: named like a strip: ${twice.join(', ')}`);
  }
  const drawn = await loadDrawn(fighter);
  for (const name of names.length > 0 ? names : all) {
    const template =
      name === PORTRAIT
        ? portraitTemplateOf(fighter, drawn)
        : templateOf(fighter, frameDataOf(fighter), name, drawn);
    await save(template, drawn.has(name) ? 'the drawing' : 'the code');
  }
}

async function save(template: Template, from: string): Promise<void> {
  const folder = new URL(`${template.folder}/`, TEMPLATES);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL(`${template.name}.json`, folder), JSON.stringify(template));
  console.log(
    `art-src/gabarits/${template.folder}/${template.name}.json (${template.frames} frames, from ${from})`,
  );
}

async function writeUi(names: readonly string[]): Promise<void> {
  const unknown = names.filter((name) => !isUiArt(name));
  if (unknown.length > 0) {
    throw new Error(`No UI image ${unknown.join(', ')}: ${Object.keys(UI_ARTS).join(', ')}`);
  }
  const drawn = await loadUiDrawn();
  const chosen = (names.length > 0 ? names : Object.keys(UI_ARTS)).filter(isUiArt);
  for (const name of chosen) {
    await save(uiTemplateOf(name, drawn[name]), drawn[name] ? 'the drawing' : 'the code');
  }
}

async function writeStage(names: readonly string[]): Promise<void> {
  const unknown = names.filter((name) => !isStageLayer(name));
  if (unknown.length > 0) {
    throw new Error(`No stage layer ${unknown.join(', ')}: ${STAGE_LAYER_NAMES.join(', ')}`);
  }
  const drawn = await loadStageDrawn();
  const chosen = (names.length > 0 ? names : STAGE_LAYER_NAMES).filter(isStageLayer);
  for (const layer of chosen) {
    await save(stageTemplateOf(layer, drawn[layer]), drawn[layer] ? 'the drawing' : 'the grey box');
  }
}

async function main(): Promise<void> {
  const [first, ...rest] = process.argv.slice(2);
  if (first === UI_FOLDER) {
    await writeUi(rest);
    return;
  }
  if (first === STAGE_NAME) {
    await writeStage(rest);
    return;
  }
  const fighter = FIGHTERS.find((candidate) => candidate.name === first);
  if (first !== undefined && !fighter) {
    const known = [...FIGHTERS.map(({ name }) => name), UI_FOLDER, STAGE_NAME].join(', ');
    throw new Error(`Unknown fighter ${first}: ${known}`);
  }
  if (fighter) {
    await write(fighter, rest);
    return;
  }
  for (const each of FIGHTERS) await write(each, []);
  await writeUi([]);
  await writeStage([]);
}

await main();
