/**
 * Renders strips to look at while drawing them: on the stage background, with the ground line,
 * the pushbox edges (dashed) and, on the active frames of an attack, its hitbox (red frame).
 * Writes tools/sprites/preview/<sheet>.png (not committed).
 *
 *   node tools/sprites/preview.ts idle standHeavy      # main colorway
 *   node tools/sprites/preview.ts --alt idle           # second colorway
 *   node tools/sprites/preview.ts --all
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { NAYO_CLIPS } from '../../src/art/nayo/clips.ts';
import { NAYO_SHEETS, type NayoSheet } from '../../src/art/nayo/sheets.ts';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types.ts';
import { MOVE_IDS, type MoveId } from '../../src/core/config.ts';
import { POLYVALENT } from '../../src/data/fighters.ts';
import { activeFrames, isV2Sheet, NAYO_V2_STRIPS } from './nayo/combat-v2.ts';
import { paletteOf, type Colorway } from './nayo/look.ts';
import { encodeIndexedPng, type Rgba } from './png.ts';
import { drawSheet } from './sheet.ts';

const PREVIEW = new URL('./preview/', import.meta.url);
const ZOOM = 2;
const BACKGROUND: Rgba = { r: 0x1b, g: 0x1b, b: 0x2f, a: 255 };
const GROUND: Rgba = { r: 0x3a, g: 0x3a, b: 0x5c, a: 255 };
const GUIDE: Rgba = { r: 0x6a, g: 0x3a, b: 0x3a, a: 255 };
const HITBOX: Rgba = { r: 0xff, g: 0x3b, b: 0x3b, a: 255 };
const SEPARATOR: Rgba = { r: 0x2a, g: 0x2a, b: 0x44, a: 255 };

/**
 * Hitbox of the move a strip plays, in cell pixels, on each of its active frames: from the spec
 * for a combat v2 strike, not played yet (tools/sprites/nayo/combat-v2.ts).
 */
function hitboxes(
  sheet: NayoSheet,
): Map<number, { left: number; right: number; top: number; bottom: number }> {
  const boxes = new Map<number, { left: number; right: number; top: number; bottom: number }>();
  if (isV2Sheet(sheet)) {
    const { ticks, strike } = NAYO_V2_STRIPS[sheet];
    if (!ticks || !strike) return boxes;
    for (const frame of activeFrames(ticks, strike)) {
      boxes.set(frame, {
        left: ANCHOR.x + strike.x[0] * ART_SCALE,
        right: ANCHOR.x + strike.x[1] * ART_SCALE,
        top: ANCHOR.y - strike.y[1] * ART_SCALE,
        bottom: ANCHOR.y - strike.y[0] * ART_SCALE,
      });
    }
    return boxes;
  }
  if (!(MOVE_IDS as readonly string[]).includes(sheet)) return boxes;
  const move = POLYVALENT.moves[sheet as MoveId];
  const box = move.hitbox;
  if (!box) return boxes;
  const clip = NAYO_CLIPS[sheet as MoveId];
  let tick = 0;
  clip.ticks.forEach((ticks, index) => {
    const active = tick < move.startup + move.active && tick + ticks > move.startup;
    tick += ticks;
    const frame = clip.frames[index];
    if (!active || frame === undefined) return;
    const px = (sub: number): number => (sub / 100) * ART_SCALE;
    boxes.set(frame, {
      left: ANCHOR.x + px(box.x),
      right: ANCHOR.x + px(box.x + box.width),
      top: ANCHOR.y - px(box.y + box.height),
      bottom: ANCHOR.y - px(box.y),
    });
  });
  return boxes;
}

async function render(sheet: NayoSheet, colorway: Colorway): Promise<void> {
  const canvas = drawSheet(sheet);
  const palette = [...paletteOf(colorway)];
  const slot = (color: Rgba): number => palette.push(color) - 1;
  const background = slot(BACKGROUND);
  const ground = slot(GROUND);
  const guide = slot(GUIDE);
  const hitbox = slot(HITBOX);
  const separator = slot(SEPARATOR);

  const halfPushbox = (POLYVALENT.standingPushbox.width / 200) * ART_SCALE;
  const boxes = hitboxes(sheet);
  const pixels = new Uint8Array(canvas.width * canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = y * canvas.width + x;
      const sprite = canvas.pixels[index] ?? 0;
      if (sprite !== 0) {
        pixels[index] = sprite;
        continue;
      }
      const cellX = x % CELL_SIZE;
      const frame = Math.floor(x / CELL_SIZE);
      let color = y > ANCHOR.y ? ground : background;
      if (cellX === 0) color = separator;
      const fromAnchor = Math.abs(cellX + 0.5 - ANCHOR.x);
      if (Math.abs(fromAnchor - halfPushbox) < 0.6 && y % 6 < 3) color = guide;
      const box = boxes.get(frame);
      if (box) {
        const onX =
          (cellX === Math.round(box.left) || cellX === Math.round(box.right)) &&
          y >= box.top &&
          y <= box.bottom;
        const onY =
          (y === Math.round(box.top) || y === Math.round(box.bottom)) &&
          cellX >= box.left &&
          cellX <= box.right;
        if (onX || onY) color = hitbox;
      }
      pixels[index] = color;
    }
  }
  const name = colorway === 'main' ? sheet : `${sheet}-alt`;
  await writeFile(
    new URL(`${name}.png`, PREVIEW),
    await encodeIndexedPng(canvas.width, canvas.height, pixels, palette, ZOOM),
  );
  console.log(`tools/sprites/preview/${name}.png (${NAYO_SHEETS[sheet].frames} frames)`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const colorway: Colorway = args.includes('--alt') ? 'alt' : 'main';
  const all = Object.keys(NAYO_SHEETS) as NayoSheet[];
  const sheets = args.includes('--all') ? all : all.filter((sheet) => args.includes(sheet));
  if (sheets.length === 0) throw new Error(`Name at least one strip: ${all.join(', ')}`);
  await mkdir(PREVIEW, { recursive: true });
  for (const sheet of sheets) await render(sheet, colorway);
}

await main();
