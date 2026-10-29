/**
 * Renders strips to look at while drawing them: on the stage background, with the ground line,
 * the pushbox edges (dashed), the front effects over the body (as the game draws them) and, on
 * the active frames of an attack, its hitbox (red frame). Writes tools/sprites/preview/
 * <sheet>.png, tools/sprites/preview/riff/<sheet>.png for Riff (not committed), and prints each
 * frame's ticks, the active ones in [ ].
 *
 *   npm run sprites:preview -- idle standHeavy          # Nayo, main colorway
 *   npm run sprites:preview -- --alt idle               # second colorway
 *   npm run sprites:preview -- --riff idle              # Riff (also: riff/idle)
 *   npm run sprites:preview -- --all                    # every strip (with --riff: hers)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { NAYO_CLIPS } from '../../src/art/nayo/clips.ts';
import { RIFF_CLIPS } from '../../src/art/riff/clips.ts';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types.ts';
import type { FighterTemplate } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo.ts';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff.ts';
import { strikeOf, type Clips } from './clips.ts';
import type { Fighter, Strike } from './fighter.ts';
import { NAYO } from './nayo/index.ts';
import type { Colorway } from './palette.ts';
import { encodeIndexedPng, type Rgba } from './png.ts';
import { RIFF } from './riff/index.ts';
import { drawStrip, drawStripEffects } from './sheet.ts';

const PREVIEW = new URL('./preview/', import.meta.url);
const ZOOM = 2;
const BACKGROUND: Rgba = { r: 0x1b, g: 0x1b, b: 0x2f, a: 255 };
const GROUND: Rgba = { r: 0x3a, g: 0x3a, b: 0x5c, a: 255 };
const GUIDE: Rgba = { r: 0x6a, g: 0x3a, b: 0x3a, a: 255 };
const HITBOX: Rgba = { r: 0xff, g: 0x3b, b: 0x3b, a: 255 };
const SEPARATOR: Rgba = { r: 0x2a, g: 0x2a, b: 0x44, a: 255 };

/** What the preview draws over a fighter's strips. */
interface Guides {
  /** Half width of the standing pushbox, in world pixels. */
  readonly pushboxHalf: number;
  /** The hitbox of a strip's attack (world pixels) and its active frames. */
  readonly strike: (sheet: string) => Strike | undefined;
}

/** A fighter's moves (src/data/fighters/), played by its clips (src/art/<name>/clips.ts). */
function guidesOf(template: FighterTemplate, clips: Clips): Guides {
  return {
    pushboxHalf: toPx(template.standingPushbox.width) / 2,
    strike: (sheet) => strikeOf(clips, template, sheet),
  };
}

const NAYO_GUIDES = guidesOf(NAYO_TEMPLATE, NAYO_CLIPS);
const RIFF_GUIDES = guidesOf(RIFF_TEMPLATE, RIFF_CLIPS);

interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Hitbox of the move a strip plays, in cell pixels, on each of its active frames. */
function hitboxes(guides: Guides, sheet: string): Map<number, Box> {
  const boxes = new Map<number, Box>();
  const strike = guides.strike(sheet);
  if (!strike) return boxes;
  const { box } = strike;
  for (const frame of strike.frames) {
    boxes.set(frame, {
      left: ANCHOR.x + box.x * ART_SCALE,
      right: ANCHOR.x + (box.x + box.width) * ART_SCALE,
      top: ANCHOR.y - (box.y + box.height) * ART_SCALE,
      bottom: ANCHOR.y - box.y * ART_SCALE,
    });
  }
  return boxes;
}

async function render(
  fighter: Fighter,
  guides: Guides,
  sheet: string,
  colorway: Colorway,
): Promise<void> {
  const canvas = drawStrip(fighter, sheet);
  // The front effects go over both fighters in the game: over the body here.
  const front = drawStripEffects(fighter, sheet);
  const palette = [...fighter.paletteOf(colorway)];
  const slot = (color: Rgba): number => palette.push(color) - 1;
  const background = slot(BACKGROUND);
  const ground = slot(GROUND);
  const guide = slot(GUIDE);
  const hitbox = slot(HITBOX);
  const separator = slot(SEPARATOR);

  const halfPushbox = guides.pushboxHalf * ART_SCALE;
  const boxes = hitboxes(guides, sheet);
  const pixels = new Uint8Array(canvas.width * canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = y * canvas.width + x;
      const sprite = front?.pixels[index] || canvas.pixels[index] || 0;
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
  const folder = fighter === NAYO ? '' : `${fighter.name}/`;
  const name = `${folder}${colorway === 'main' ? sheet : `${sheet}-alt`}`;
  await mkdir(new URL(folder, PREVIEW), { recursive: true });
  await writeFile(
    new URL(`${name}.png`, PREVIEW),
    await encodeIndexedPng(canvas.width, canvas.height, pixels, palette, ZOOM),
  );
  const { ticks } = fighter.timing(sheet);
  const timing = ticks.map((tick, frame) => (boxes.has(frame) ? `[${tick}]` : `${tick}`));
  const frames = canvas.width / CELL_SIZE;
  console.log(`tools/sprites/preview/${name}.png (${frames} frames, ticks ${timing.join(' ')})`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const colorway: Colorway = args.includes('--alt') ? 'alt' : 'main';
  const riffOnly = args.includes('--riff');
  const names = args.filter((arg) => !arg.startsWith('--'));
  const jobs: { fighter: Fighter; guides: Guides; sheet: string }[] = [];
  const add = (fighter: Fighter, guides: Guides, sheets: readonly string[]): void => {
    for (const sheet of sheets) {
      if (!(sheet in fighter.sheets)) {
        const all = Object.keys(fighter.sheets).join(', ');
        throw new Error(`${fighter.name} has no strip ${sheet}: ${all}`);
      }
      jobs.push({ fighter, guides, sheet });
    }
  };
  const riffNames = names.filter((name) => name.startsWith('riff/')).map((name) => name.slice(5));
  const plain = names.filter((name) => !name.startsWith('riff/'));
  const all = args.includes('--all');
  if (riffOnly) {
    add(RIFF, RIFF_GUIDES, all ? Object.keys(RIFF.sheets) : [...plain, ...riffNames]);
  } else {
    add(NAYO, NAYO_GUIDES, all ? Object.keys(NAYO.sheets) : plain);
    add(RIFF, RIFF_GUIDES, riffNames);
  }
  if (jobs.length === 0) {
    throw new Error(
      `Name at least one strip: ${Object.keys(NAYO.sheets).join(', ')}; Riff's with --riff`,
    );
  }
  for (const { fighter, guides, sheet } of jobs) await render(fighter, guides, sheet, colorway);
}

await main();
