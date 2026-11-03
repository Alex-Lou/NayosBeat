/**
 * The bust of the select screen drawn by the code (`Fighter.portrait`): its pose drawn in one cell
 * as a strip's frame is (sheet.ts: the body shaded, outlined and lit by its effects, then its front
 * effects over it), then the square around its head, enlarged twice, as a portrait drawn by hand
 * is framed (drawn.ts `portraitRules`, aseprite-template.ts). One image in the fighter's palette
 * slots, saved once per colorway.
 */

import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types.ts';
import { PORTRAIT_SIZE } from './drawn.ts';
import { effectLightsOf } from './effect-light.ts';
import { STILL, type Fighter } from './fighter.ts';
import { PixelCanvas, type Point } from './raster.ts';
import { solve, type Pose } from './skeleton.ts';
import { drawEffect, inkAt } from './vfx.ts';

/**
 * The square of the cell a portrait shows, in sprite pixels, enlarged twice: about the framing of
 * the select tiles' squares (56 and 58 px), at twice their detail.
 */
const SOURCE = PORTRAIT_SIZE / 2;

/**
 * The portrait's square of the first cell of a strip's pixels (`width` wide, CELL_SIZE high):
 * centred on `head` (world pixels from the feet anchor), the head a little above the middle, each
 * pixel enlarged twice. What falls outside the cell stays empty.
 */
export function bustOf(pixels: Uint8Array, width: number, head: Point): Uint8Array {
  const left = Math.round(ANCHOR.x + head.x * ART_SCALE - SOURCE / 2);
  const top = Math.round(ANCHOR.y - head.y * ART_SCALE - SOURCE * 0.45);
  const zoom = PORTRAIT_SIZE / SOURCE;
  const bust = new Uint8Array(PORTRAIT_SIZE * PORTRAIT_SIZE);
  for (let y = 0; y < PORTRAIT_SIZE; y++) {
    for (let x = 0; x < PORTRAIT_SIZE; x++) {
      const cx = left + Math.floor(x / zoom);
      const cy = top + Math.floor(y / zoom);
      if (cx < 0 || cy < 0 || cx >= CELL_SIZE || cy >= CELL_SIZE) continue;
      bust[y * PORTRAIT_SIZE + x] = pixels[cy * width + cx] ?? 0;
    }
  }
  return bust;
}

/** The fighter's bust drawn from its portrait pose, or undefined when it has none. */
export function codePortrait(fighter: Fighter): Uint8Array | undefined {
  const pose = fighter.portrait;
  if (!pose) return undefined;
  const cell = drawPose(fighter, pose);
  return bustOf(cell, CELL_SIZE, solve(pose, fighter.body).head);
}

/** `pose` in one cell: its body as drawStrip draws a frame, its front effects over it. */
function drawPose(fighter: Fighter, pose: Pose): Uint8Array {
  const body = new PixelCanvas(CELL_SIZE, CELL_SIZE);
  fighter.draw(body, solve(pose, fighter.body), 0, STILL);
  if (fighter.lighting?.fx) {
    for (const light of effectLightsOf(pose, 0, CELL_SIZE)) body.lightBy(light);
  }
  body.finish(fighter.lighting);
  // The motion trails are drawn behind the body, by the fighter; the rest in front (sheet.ts).
  const front = new PixelCanvas(CELL_SIZE, CELL_SIZE);
  const ink = inkAt(front, 0, fighter.fx);
  for (const effect of pose.effects ?? []) {
    if (effect.kind !== 'smear') drawEffect(ink, effect);
  }
  front.finish();
  return body.pixels.map((slot, at) => front.pixels[at] || slot);
}
