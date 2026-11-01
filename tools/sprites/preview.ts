/**
 * Renders strips to look at while drawing them: on the stage background, with the ground line,
 * the pushbox edges (dashed), the front effects over the body (as the game draws them) and, on
 * the active frames of an attack, its hitbox (red frame). The frames come in the order the
 * strip's clip plays them, a bar over each: yellow for a key, blue for an in-between
 * (inbetweens.ts); the frames no clip plays come last. Writes tools/sprites/preview/<sheet>.png,
 * tools/sprites/preview/riff/<sheet>.png for Riff (not committed), and prints each key's ticks,
 * the active ones in [ ].
 *
 * `--ticks`: the strip's clip tick by tick instead, one cell per tick of 60 Hz, its keys alone
 * on the top row (the animation of before) and played with its in-betweens under them; a
 * drawing that stays from the tick before is dimmed: where the movement holds
 * (<sheet>-ticks.png).
 *
 *   npm run sprites:preview -- idle standHeavy          # Nayo, main colorway
 *   npm run sprites:preview -- --alt idle               # second colorway
 *   npm run sprites:preview -- --riff idle              # Riff (also: riff/idle)
 *   npm run sprites:preview -- --all                    # every strip (with --riff: hers)
 *   npm run sprites:preview -- --ticks ko riff/ko       # tick by tick, before and after
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { NAYO_CLIPS } from '../../src/art/nayo/clips.ts';
import { RIFF_CLIPS } from '../../src/art/riff/clips.ts';
import { ANCHOR, ART_SCALE, CELL_SIZE, playedClips, type Clip } from '../../src/art/types.ts';
import type { FighterTemplate } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo.ts';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff.ts';
import { clipFrameAt } from '../../src/render/animation.ts';
import { strikeOf, type Clips } from './clips.ts';
import { loadDrawn, reportingDrawingProblems, stripPixels, type Drawn } from './drawn.ts';
import type { Fighter, Strike } from './fighter.ts';
import { NAYO } from './nayo/index.ts';
import type { Colorway } from './palette.ts';
import { encodeIndexedPng, type Rgba } from './png.ts';
import { RIFF } from './riff/index.ts';

const PREVIEW = new URL('./preview/', import.meta.url);
const ZOOM = 2;
const BACKGROUND: Rgba = { r: 0x1b, g: 0x1b, b: 0x2f, a: 255 };
const GROUND: Rgba = { r: 0x3a, g: 0x3a, b: 0x5c, a: 255 };
const GUIDE: Rgba = { r: 0x6a, g: 0x3a, b: 0x3a, a: 255 };
const HITBOX: Rgba = { r: 0xff, g: 0x3b, b: 0x3b, a: 255 };
const SEPARATOR: Rgba = { r: 0x2a, g: 0x2a, b: 0x44, a: 255 };
const KEY: Rgba = { r: 0xff, g: 0xd2, b: 0x3f, a: 255 };
const INBETWEEN: Rgba = { r: 0x3f, g: 0x9c, b: 0xff, a: 255 };
const HELD: Rgba = { r: 0x2e, g: 0x2e, b: 0x44, a: 255 };
/** Height of the bar over each cell, in cell pixels. */
const BAR = 4;

/** What the preview draws over a fighter's strips. */
interface Guides {
  /** Half width of the standing pushbox, in world pixels. */
  readonly pushboxHalf: number;
  /** The hitbox of a strip's attack (world pixels) and its active frames. */
  readonly strike: (sheet: string) => Strike | undefined;
  /** The clips of the keys (src/art/<name>/clips.ts). */
  readonly clips: Clips;
}

/** A fighter's moves (src/data/fighters/), played by its clips (src/art/<name>/clips.ts). */
function guidesOf(template: FighterTemplate, clips: Clips): Guides {
  return {
    pushboxHalf: toPx(template.standingPushbox.width) / 2,
    strike: (sheet) => strikeOf(clips, template, sheet),
    clips,
  };
}

const NAYO_GUIDES = guidesOf(NAYO_TEMPLATE, NAYO_CLIPS);
const RIFF_GUIDES = guidesOf(RIFF_TEMPLATE, RIFF_CLIPS);

/** The clip a strip is looked at through, keys alone and played: its own, else the first. */
function clipsOf(fighter: Fighter, guides: Guides, sheet: string): { keys: Clip; played: Clip } {
  const entries = Object.entries(guides.clips).filter(([, clip]) => clip.sheet === sheet);
  const [id, keys] = entries.find(([name]) => name === sheet) ?? entries[0] ?? [];
  const frames = fighter.keys(sheet)?.length ?? fighter.sheets[sheet]?.frames ?? 1;
  if (!id || !keys) {
    const all = Array.from({ length: frames }, (_, index) => index);
    const clip = { sheet, frames: all, ticks: all.map(() => 1) };
    return { keys: clip, played: clip };
  }
  const played = playedClips({ [id]: keys } as never, fighter.played, { [sheet]: { frames } });
  return { keys, played: (played as Record<string, Clip>)[id] ?? keys };
}

/** The frames of a strip in the order its clip plays them, the others after. */
function playOrder(frames: number, clip: Clip): number[] {
  const order = [...new Set(clip.frames)];
  for (let frame = 0; frame < frames; frame++) if (!order.includes(frame)) order.push(frame);
  return order;
}

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
  drawn: ReadonlyMap<string, Drawn>,
  ticksMode: boolean,
): Promise<void> {
  // A strip drawn by hand (art-src/) as the game gets it, else the code's.
  // The front effects go over both fighters in the game: over the body here.
  const { body: canvas, fx: front } = stripPixels(fighter, sheet, drawn);
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
  const frames = canvas.width / CELL_SIZE;
  const keys = fighter.keys(sheet)?.length ?? frames;
  const { keys: keyClip, played } = clipsOf(fighter, guides, sheet);
  const bar = { key: slot(KEY), inbetween: slot(INBETWEEN), held: slot(HELD) };
  const file = new URL(`${name}${ticksMode ? '-ticks' : ''}.png`, PREVIEW);
  const image = ticksMode
    ? tickCells(pixels, canvas.width, [keyClip, played], keys, bar)
    : orderedCells(pixels, canvas.width, playOrder(frames, played), keys, bar);
  await writeFile(
    file,
    await encodeIndexedPng(image.width, image.height, image.pixels, palette, ZOOM),
  );
  const { ticks } = fighter.timing(sheet);
  const timing = ticks.map((tick, frame) => (boxes.has(frame) ? `[${tick}]` : `${tick}`));
  const shown = file.pathname.slice(file.pathname.indexOf('tools/sprites/'));
  console.log(`${shown} (${keys} keys + ${frames - keys}, key ticks ${timing.join(' ')})`);
}

interface Cells {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

interface Bars {
  readonly key: number;
  readonly inbetween: number;
  readonly held: number;
}

/** Copies cell `frame` of a strip `width` wide to cell `at` of `out`, a bar of `color` over it. */
function copyCell(strip: Uint8Array, width: number, frame: number, out: Cells, at: number): void {
  for (let y = 0; y < CELL_SIZE; y++) {
    const from = y * width + frame * CELL_SIZE;
    out.pixels.set(strip.subarray(from, from + CELL_SIZE), (BAR + y) * out.width + at * CELL_SIZE);
  }
}

function paintBar(out: Cells, at: number, top: number, color: number): void {
  for (let y = top; y < top + BAR - 1; y++) {
    out.pixels.fill(color, y * out.width + at * CELL_SIZE, y * out.width + (at + 1) * CELL_SIZE);
  }
}

/** The cells in `order`, each under its bar: a key's or an in-between's. */
function orderedCells(
  strip: Uint8Array,
  width: number,
  order: readonly number[],
  keys: number,
  bars: Bars,
): Cells {
  const size = { width: order.length * CELL_SIZE, height: CELL_SIZE + BAR };
  const cells = { ...size, pixels: new Uint8Array(size.width * size.height) };
  order.forEach((frame, at) => {
    paintBar(cells, at, 0, frame < keys ? bars.key : bars.inbetween);
    copyCell(strip, width, frame, cells, at);
  });
  return cells;
}

/**
 * One cell per tick of each clip, each clip on its row: the drawing on screen, under a bar of
 * its kind, dimmed when it was already there the tick before.
 */
function tickCells(
  strip: Uint8Array,
  width: number,
  clips: readonly Clip[],
  keys: number,
  bars: Bars,
): Cells {
  const ticks = Math.max(...clips.map((clip) => clip.ticks.reduce((sum, t) => sum + t, 0)));
  const rowHeight = CELL_SIZE + BAR;
  const cells = {
    width: ticks * CELL_SIZE,
    height: rowHeight * clips.length,
    pixels: new Uint8Array(ticks * CELL_SIZE * rowHeight * clips.length),
  };
  clips.forEach((clip, row) => {
    const band = { ...cells, height: rowHeight, pixels: new Uint8Array(cells.width * rowHeight) };
    for (let tick = 0; tick < ticks; tick++) {
      const frame = clip.frames[clipFrameAt(clip, tick)] ?? 0;
      const before = tick > 0 ? clip.frames[clipFrameAt(clip, tick - 1)] : -1;
      const color = frame === before ? bars.held : frame < keys ? bars.key : bars.inbetween;
      paintBar(band, tick, 0, color);
      copyCell(strip, width, frame, band, tick);
    }
    cells.pixels.set(band.pixels, row * band.pixels.length);
  });
  return cells;
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
  const drawnOf = new Map<Fighter, ReadonlyMap<string, Drawn>>();
  for (const { fighter, guides, sheet } of jobs) {
    const drawn = drawnOf.get(fighter) ?? (await loadDrawn(fighter));
    drawnOf.set(fighter, drawn);
    await render(fighter, guides, sheet, colorway, drawn, args.includes('--ticks'));
  }
}

await reportingDrawingProblems(main);
