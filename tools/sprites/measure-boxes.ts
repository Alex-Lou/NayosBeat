/**
 * Prints where each fighter's drawing stands against its hurtboxes (docs/combat-v2.md §9.2),
 * from the generated strips (src/art/<name>/main/*.png, read through their atlases). For each
 * posture: the drawn front edge of every neutral, guard and hit pose, band by band (4 px), the
 * farthest of them ("body") and the front edge of the hurtbox there; the walks and the forward
 * jump (marked *) for the record, their limbs reaching out. Then each edge of the hurtboxes
 * against the drawing, flagged when they are more than 1.5 px apart. With `--moves`, every
 * frame of every move against the hurtboxes in force while it shows: a body that leaves them
 * (the feet off the floor, the whole body above the box) is flagged, a move hurtbox (§9.2) is
 * what fixes it. Run with `npm run measure-boxes` after `npm run sprites`;
 * `npm run measure-boxes -- riff --moves` for one fighter.
 */

import { readFile } from 'node:fs/promises';
import { FULL_CELL, type Atlas, type Cell } from '../../src/art/types.ts';
import type { Box, FighterTemplate } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import { MOVE_IDS } from '../../src/core/move-data.ts';
import { cellReader } from './atlas.ts';
import type { Clips } from './clips.ts';
import { cellsOf, TOOL_FIGHTERS } from './fighters.ts';
import {
  BAND,
  calibrate,
  envelope,
  fits,
  measureFrames,
  moveFrameFlags,
  moveHurtboxesAt,
  POSTURE_CLIPS,
  postureFrames,
  type Drawing,
  type Posture,
  type StripMask,
} from './measure.ts';
import { decodeIndexedPng } from './png.ts';

interface Measured {
  readonly name: string;
  readonly template: FighterTemplate;
  readonly clips: Clips;
  readonly cells: Readonly<Record<string, Cell>>;
}

function hurtboxes(template: FighterTemplate, posture: Posture): readonly Box[] {
  switch (posture) {
    case 'standing':
      return template.standingHurtboxes;
    case 'crouching':
      return template.crouchingHurtboxes;
    case 'air':
      return template.airHurtboxes;
  }
}

const masks = new Map<string, StripMask>();

/**
 * A strip as generated, its cells cropped (their size and anchor: cells.ts), its frames read
 * through its atlas (tools/sprites/atlas.ts).
 */
async function maskOf(fighter: Measured, sheet: string): Promise<StripMask> {
  const key = `${fighter.name}/${sheet}`;
  const known = masks.get(key);
  if (known) return known;
  const file = new URL(`../../src/art/${fighter.name}/main/${sheet}`, import.meta.url);
  const image = await decodeIndexedPng(await readFile(new URL(`${file.href}.png`)));
  const atlas = JSON.parse(
    new TextDecoder().decode(await readFile(new URL(`${file.href}.json`))),
  ) as Atlas;
  const cell = fighter.cells[sheet] ?? FULL_CELL;
  const slot = cellReader(image, atlas);
  const mask: StripMask = {
    cell,
    opaque: (frame, column, row) => (image.alpha[slot(frame, column, row)] ?? 0) > 0,
  };
  masks.set(key, mask);
  return mask;
}

/** The front edge of the hurtbox covering heights [from, from + BAND), if one does. */
function boxFront(boxes: readonly Box[], from: number): number | null {
  let front: number | null = null;
  for (const box of boxes) {
    const bottom = toPx(box.y);
    if (from + BAND <= bottom || from >= bottom + toPx(box.height)) continue;
    front = Math.max(front ?? -Infinity, toPx(box.x + box.width));
  }
  return front;
}

const number = (value: number, width: number): string =>
  (Number.isFinite(value) ? value.toFixed(1) : '·').padStart(width);

const verdict = (edge: { box: number; drawn: number }): string =>
  `box ${edge.box.toFixed(1)}, drawn ${edge.drawn.toFixed(1)}${fits(edge) ? '' : '  <- off by more than 1.5 px'}`;

async function measure(fighter: Measured, posture: Posture): Promise<void> {
  const { body, limbs } = POSTURE_CLIPS[posture];
  const columns: { name: string; drawing: Drawing }[] = [];
  for (const clip of [...body, ...limbs]) {
    const { sheet, frames } = postureFrames(fighter.clips, clip);
    const name = limbs.includes(clip) ? `${clip}*` : clip;
    columns.push({ name, drawing: measureFrames(await maskOf(fighter, sheet), frames) });
  }
  const drawn = envelope(columns.slice(0, body.length).map((column) => column.drawing));
  const boxes = hurtboxes(fighter.template, posture);
  const width = Math.max(7, ...columns.map((column) => column.name.length)) + 1;

  console.log(`\n${fighter.name}, ${posture}: front edge per band (world px)`);
  console.log(
    [
      'band'.padStart(7),
      ...[...columns.map((c) => c.name), 'body', 'box'].map((n) => n.padStart(width)),
    ].join(''),
  );
  for (let index = drawn.bands.length - 1; index >= 0; index--) {
    const band = drawn.bands[index];
    if (!band || !Number.isFinite(band.front)) continue;
    const front = boxFront(boxes, band.from);
    console.log(
      [
        `${band.from}-${band.from + BAND}`.padStart(7),
        ...columns.map((c) => number(c.drawing.bands[index]?.front ?? -Infinity, width)),
        number(band.front, width),
        front === null ? '-'.padStart(width) : number(front, width),
      ].join(''),
    );
  }
  const calibration = calibrate(boxes, drawn);
  calibration.fronts.forEach((front, index) => {
    console.log(`front of box ${index + 1}: ${verdict(front)}`);
  });
  console.log(`back (rear foot): ${verdict(calibration.back)}`);
  console.log(`top: ${verdict(calibration.top)}`);
}

/** Every frame of every move: the drawn body (bottom, top, back, front) against its boxes. */
async function measureMoves(fighter: Measured): Promise<void> {
  console.log(`\n${fighter.name}, moves: drawn body against the hurtboxes in force (world px)`);
  console.log('move / frame (ticks)        drawn y   box y      drawn x        box x');
  for (const id of MOVE_IDS) {
    const move = fighter.template.moves[id];
    const clip = fighter.clips[id];
    if (!move || !clip) continue;
    const mask = await maskOf(fighter, clip.sheet);
    let tick = 0;
    for (let index = 0; index < clip.frames.length; index++) {
      const frame = clip.frames[index] ?? 0;
      const ticks = clip.ticks[index] ?? 0;
      const drawn = measureFrames(mask, [frame]);
      const rows = drawn.bands.filter((band) => Number.isFinite(band.front));
      const bottom = rows[0]?.from ?? 0;
      const front = Math.max(...rows.map((band) => band.front));
      const back = Math.min(...rows.map((band) => band.back));
      const boxes = moveHurtboxesAt(fighter.template, id, move, tick);
      const low = Math.min(...boxes.map((box) => toPx(box.y)));
      const high = Math.max(...boxes.map((box) => toPx(box.y + box.height)));
      const left = Math.min(...boxes.map((box) => toPx(box.x)));
      const right = Math.max(...boxes.map((box) => toPx(box.x + box.width)));
      const flags = moveFrameFlags(drawn, boxes);
      const name = `${id} ${frame} (${tick}-${tick + ticks - 1})`.padEnd(26);
      const y = `${number(bottom, 5)}..${number(drawn.top, 5)}`;
      const x = `${number(back, 6)}..${number(front, 6)}`;
      const box = `${number(low, 5)}..${number(high, 5)}`;
      const boxX = `${number(left, 6)}..${number(right, 6)}`;
      console.log(`${name}${y} ${box}  ${x} ${boxX}  ${flags.join(', ')}`);
      tick += ticks;
    }
  }
}

const args = process.argv.slice(2);
const names = args.filter((arg) => !arg.startsWith('--'));
for (const { fighter: generator, template, clips } of TOOL_FIGHTERS) {
  const { name } = generator;
  if (names.length > 0 && !names.includes(name)) continue;
  // Its cells read once it is chosen: one without strips yet does not stop the others.
  const fighter: Measured = { name, template, clips, cells: await cellsOf(name) };
  for (const posture of Object.keys(POSTURE_CLIPS) as Posture[]) await measure(fighter, posture);
  if (args.includes('--moves')) await measureMoves(fighter);
}
