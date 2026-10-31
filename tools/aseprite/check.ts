/**
 * Runs the Aseprite extension (extension/nayosbeat.lua) outside Aseprite, end to end, against a
 * stand-in for Aseprite's Lua API (test/aseprite-mock.lua): the templates are written here, the
 * extension makes and exports documents from them as an artist would (test/scenario.lua), and its
 * exports are read back by `npm run sprites`'s own checks and compared with the strips they
 * started from. It tests the extension's logic, not Aseprite itself. Needs Lua 5.4 (`lua5.4`, or
 * `lua`). Run with `npm run aseprite:check`; CI runs it too.
 */

import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CELL_SIZE } from '../../src/art/types.ts';
import { templateOf } from '../sprites/aseprite-template.ts';
import { loadDrawn, type StripPixels } from '../sprites/drawn.ts';
import { frameDataOf } from '../sprites/frame-data.ts';
import { NAYO } from '../sprites/nayo/index.ts';
import { drawStrip, drawStripEffects, toPlatine } from '../sprites/sheet.ts';

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
  for (const name of STRIPS) {
    const template = templateOf(NAYO, frameDataOf(NAYO), name, new Map());
    await writeFile(new URL(`gabarits/nayo/${name}.json`, ROOT), JSON.stringify(template));
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
  if (failures.length > 0) throw new Error(`Aseprite extension:\n  ${failures.join('\n  ')}`);
  console.log(`Aseprite extension: ${drawn.size} exports read back as drawn`);
}

await main();
