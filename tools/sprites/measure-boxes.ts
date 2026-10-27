/**
 * Prints where Nayo's drawing stands against his hurtboxes (docs/combat-v2.md §9.2), from the
 * generated strips (src/art/nayo/main/*.png). For each posture: the drawn front edge of every
 * neutral, guard and hit pose, band by band (4 px), the farthest of them ("body") and the front
 * edge of the hurtbox there; the walks and the forward jump (marked *) for the record, their
 * limbs reaching out. Then each edge of the hurtboxes against the drawing, flagged when they are
 * more than 1.5 px apart. Run with `npm run measure-boxes` after `npm run sprites`.
 */

import { readFile } from 'node:fs/promises';
import { NAYO_CELLS } from '../../src/art/nayo/cells.ts';
import { FULL_CELL } from '../../src/art/types.ts';
import type { Box } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import { NAYO } from '../../src/data/fighters/nayo.ts';
import {
  BAND,
  calibrate,
  envelope,
  fits,
  measureFrames,
  POSTURE_CLIPS,
  postureFrames,
  type Drawing,
  type Posture,
  type StripMask,
} from './measure.ts';
import { decodeIndexedPng } from './png.ts';

const STRIPS = new URL('../../src/art/nayo/main/', import.meta.url);

const HURTBOXES: Readonly<Record<Posture, readonly Box[]>> = {
  standing: NAYO.standingHurtboxes,
  crouching: NAYO.crouchingHurtboxes,
  air: NAYO.airHurtboxes,
};

const masks = new Map<string, StripMask>();

/** A strip as generated, its cells cropped (their size and anchor: cells.ts). */
async function maskOf(sheet: string): Promise<StripMask> {
  const known = masks.get(sheet);
  if (known) return known;
  const image = await decodeIndexedPng(await readFile(new URL(`${sheet}.png`, STRIPS)));
  const cell = NAYO_CELLS[sheet] ?? FULL_CELL;
  const mask: StripMask = {
    cell,
    opaque: (frame, column, row) =>
      (image.alpha[image.pixels[row * image.width + frame * cell.width + column] ?? 0] ?? 0) > 0,
  };
  masks.set(sheet, mask);
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

async function measure(posture: Posture): Promise<void> {
  const { body, limbs } = POSTURE_CLIPS[posture];
  const columns: { name: string; drawing: Drawing }[] = [];
  for (const clip of [...body, ...limbs]) {
    const { sheet, frames } = postureFrames(clip);
    const name = limbs.includes(clip) ? `${clip}*` : clip;
    columns.push({ name, drawing: measureFrames(await maskOf(sheet), frames) });
  }
  const drawn = envelope(columns.slice(0, body.length).map((column) => column.drawing));
  const boxes = HURTBOXES[posture];
  const width = Math.max(7, ...columns.map((column) => column.name.length)) + 1;

  console.log(`\n${posture}: front edge per band (world px)`);
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

for (const posture of Object.keys(POSTURE_CLIPS) as Posture[]) await measure(posture);
