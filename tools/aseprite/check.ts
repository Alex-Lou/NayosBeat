/**
 * Runs the Aseprite extension (extension/nayosbeat.lua) outside Aseprite, end to end, against a
 * stand-in for Aseprite's Lua API (test/aseprite-mock.lua): the templates are written here, the
 * extension makes and exports documents from them as an artist would (test/scenario.lua), and its
 * exports are read back by `npm run sprites`'s own checks and compared with the drawings they
 * started from: a fighter's strips, the title's vinyl and the icons' master. It tests the extension's logic, not Aseprite itself. Needs Lua 5.4 (`lua5.4`, or
 * `lua`). Run with `npm run aseprite:check`; CI runs it too.
 */

import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { STAGE_LAYER_NAMES } from '../../src/art/stage-layers.ts';
import { CELL_SIZE } from '../../src/art/types.ts';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage.ts';
import {
  portraitTemplateOf,
  stageTemplateOf,
  templateOf,
  uiTemplateOf,
} from '../sprites/aseprite-template.ts';
import { rgbaAt } from '../sprites/colors.ts';
import { loadDrawn, PORTRAIT, PORTRAIT_SIZE, type StripPixels } from '../sprites/drawn.ts';
import { frameDataOf } from '../sprites/frame-data.ts';
import { NAYO } from '../sprites/nayo/index.ts';
import type { IndexedImage, Rgba } from '../sprites/png.ts';
import { drawStrip, drawStripEffects, toPlatine } from '../sprites/sheet.ts';
import { largeColorsOf, loadStageDrawn, stageStart } from '../sprites/stage-drawn.ts';
import { loadUiDrawn, uiStart } from '../sprites/ui-drawn.ts';

const ROOT = new URL('./dist/check/', import.meta.url);
const STRIPS = [
  'idle',
  'standLight',
  'projectile',
  'specialBoost',
  'block',
  'crouch',
  'walkForward',
] as const;

/** The vinyl's mark, and the color the scenario paints it in Aseprite's palette. */
const MARK = '0,184,208,255';
const RECOLORED = '255,0,170,255';

const key = ({ r, g, b, a }: Rgba): string => `${r},${g},${b},${a}`;

/**
 * The pixels where an image in a free palette read back differs, by color, from the drawing it
 * started from, once `recolor` is applied to the start.
 */
function colorDifferences(
  read: IndexedImage | undefined,
  start: { readonly pixels: Uint8Array; readonly palette: readonly Rgba[] },
  recolor: (color: string) => string = (color) => color,
): number[] {
  if (!read) return [-1];
  const different: number[] = [];
  read.pixels.forEach((slot, index) => {
    const wanted = start.palette[start.pixels[index] ?? 0];
    if (!wanted || key(rgbaAt(read, slot)) !== recolor(key(wanted))) different.push(index);
  });
  return different;
}

/** A cell back from its runs, as the extension paints it. */
function unrun(runs: readonly number[], width: number, height: number): StripPixels {
  const pixels = new Uint8Array(width * height);
  let at = 0;
  for (let index = 0; index < runs.length; index += 2) {
    const count = runs[index] ?? 0;
    pixels.fill(runs[index + 1] ?? 0, at, at + count);
    at += count;
  }
  return { width, height, pixels };
}

/** The pixels where a strip read back differs from the one it started from. */
function differences(read: StripPixels | undefined, start: StripPixels | undefined): number[] {
  if (!read || !start) return read === start ? [] : [-1];
  if (read.width !== start.width || read.height !== start.height) return [-1];
  const different: number[] = [];
  read.pixels.forEach((slot, index) => {
    if (slot !== start.pixels[index]) different.push(index);
  });
  return different;
}

function lua(): string {
  const found = ['lua5.4', 'lua'].find(
    (command) => spawnSync(command, ['-v'], { stdio: 'ignore' }).status === 0,
  );
  if (found === undefined) throw new Error('Lua 5.4 is needed (lua5.4 or lua on the PATH)');
  return found;
}

async function main(): Promise<void> {
  await rm(ROOT, { recursive: true, force: true });
  await mkdir(new URL('gabarits/nayo/', ROOT), { recursive: true });
  await mkdir(new URL('nayo/fx/', ROOT), { recursive: true });
  await mkdir(new URL('gabarits/ui/', ROOT), { recursive: true });
  await mkdir(new URL('ui/', ROOT), { recursive: true });
  await mkdir(new URL('gabarits/entrepot/', ROOT), { recursive: true });
  await mkdir(new URL('entrepot/', ROOT), { recursive: true });
  for (const name of STRIPS) {
    const template = templateOf(NAYO, frameDataOf(NAYO), name, new Map());
    await writeFile(new URL(`gabarits/nayo/${name}.json`, ROOT), JSON.stringify(template));
  }
  for (const name of ['vinyl', 'icon'] as const) {
    await writeFile(
      new URL(`gabarits/ui/${name}.json`, ROOT),
      JSON.stringify(uiTemplateOf(name, undefined)),
    );
  }
  const portrait = portraitTemplateOf(NAYO, new Map());
  await writeFile(new URL(`gabarits/nayo/${PORTRAIT}.json`, ROOT), JSON.stringify(portrait));
  for (const layer of STAGE_LAYER_NAMES) {
    await writeFile(
      new URL(`gabarits/entrepot/${layer}.json`, ROOT),
      JSON.stringify(stageTemplateOf(layer, undefined)),
    );
  }
  const path = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));
  const run = spawnSync(
    lua(),
    [
      path('./test/scenario.lua'),
      fileURLToPath(ROOT).replace(/[\\/]$/, ''),
      path('./test/aseprite-mock.lua'),
      path('./extension/nayosbeat.lua'),
    ],
    { stdio: 'inherit' },
  );
  if (run.status !== 0) throw new Error('The extension failed its scenario (above)');

  // What it exported passes `npm run sprites`'s checks, and is what it started from.
  const drawn = await loadDrawn(NAYO, ROOT);
  const failures: string[] = [];
  const expect = (what: string, found: number[], wanted: number[]): void => {
    if (found.join() !== wanted.join()) {
      failures.push(`${what}: pixels ${found.slice(0, 5).join(', ')} differ`);
    }
  };
  expect('idle', differences(drawn.get('idle')?.body, drawStrip(NAYO, 'idle')), []);
  const jab = drawStrip(NAYO, 'standLight');
  // The retouch: one pixel at 200,100 of frame 2, nothing from the hidden sketch.
  expect('standLight', differences(drawn.get('standLight')?.body, jab), [
    100 * jab.width + CELL_SIZE + 200,
  ]);
  expect(
    'fx/standLight',
    differences(drawn.get('standLight')?.fx, drawStripEffects(NAYO, 'standLight')),
    [],
  );
  expect(
    'projectile',
    differences(drawn.get('projectile')?.body, drawStrip(NAYO, 'projectile')),
    [],
  );
  expect(
    'fx/specialBoost',
    differences(drawn.get('specialBoost')?.fx, drawStripEffects(NAYO, 'special', toPlatine)),
    [],
  );
  expect('block', differences(drawn.get('block')?.body, drawStrip(NAYO, 'block')), []);
  if (drawn.get('block')?.fx) failures.push('fx/block: emptied effects were kept');
  for (const name of ['crouch', 'walkForward']) {
    if (drawn.has(name)) failures.push(`${name}: a refused strip was exported`);
  }
  // The UI images, in their free palettes: the vinyl's mark recolored, nothing else.
  const ui = await loadUiDrawn(ROOT);
  expect(
    'ui/vinyl',
    colorDifferences(ui.vinyl, uiStart('vinyl', undefined), (color) =>
      color === MARK ? RECOLORED : color,
    ),
    [],
  );
  expect('ui/icon', colorDifferences(ui.icon, uiStart('icon', undefined)), []);
  // The portrait, in Nayo's slots: as its template started it.
  const start = unrun(portrait.layers[0]?.frames[0] ?? [], PORTRAIT_SIZE, PORTRAIT_SIZE);
  expect('nayo/portrait', differences(drawn.get(PORTRAIT)?.body, start), []);
  // The stage exported as the grey box it starts from, without its empty middle layer: its large
  // colors are then the grey box's.
  const stage = await loadStageDrawn(ROOT);
  expect('entrepot/far', colorDifferences(stage.far, stageStart('far', undefined)), []);
  expect('entrepot/floor', colorDifferences(stage.floor, stageStart('floor', undefined)), []);
  if (stage.mid) failures.push('entrepot/mid: an empty layer was exported');
  const colors = largeColorsOf([stage.far, stage.floor].filter((layer) => layer !== undefined));
  if (colors.join() !== GREYBOX_COLORS.join()) {
    failures.push(`entrepot: large colors ${colors.join(', ')}, not the grey box's`);
  }
  if (failures.length > 0) throw new Error(`Aseprite extension:\n  ${failures.join('\n  ')}`);
  const count = drawn.size + Object.keys(ui).length + Object.keys(stage).length;
  console.log(`Aseprite extension: ${count} exports read back as drawn`);
}

await main();
