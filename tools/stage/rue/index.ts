/**
 * The street in front of L'Entrepôt, at night (docs/art/decor-rue.md): the code's drawing of the
 * stage's three layers and of the animations laid on them. `npm run sprites` installs it
 * (tools/sprites/stage-drawn.ts), each layer replaced by one drawn by hand in Aseprite when there
 * is one. Every pixel comes from fixed seeds: the same street on every run.
 */

import { mistProp, type MistBank } from '../kit/fog.ts';
import type { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { STREET_ATMOSPHERES } from './atmospheres.ts';
import { drawFar, drawTrain, TRAIN } from './far.ts';
import { drawFloor } from './floor.ts';
import { drawMid, MID_ANIMATIONS } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

/** The street's seed. Another draws another street (other towers, other tags, other stains). */
const SEED = 1;

/** The fog's banks of mist, drifting across the far layer each its own way (kit/fog.ts). */
const MIST_BANKS: readonly MistBank[] = [
  // Low along the ground behind the fighters, in front of the walls; and over the distance.
  {
    name: 'mist0',
    layer: 'mid',
    y: 426,
    height: 52,
    width: 760,
    steps: 2400,
    facing: -1,
    seed: 401,
  },
  {
    name: 'mist1',
    layer: 'far',
    y: 232,
    height: 80,
    width: 520,
    steps: 3000,
    facing: 1,
    seed: 433,
  },
];

/** The street's cycle: 40 s, the train passing at its middle (docs/art/decor-rue.md §6.2). */
const CYCLE = 2400;
export const TRAIN_AT = 1200;
const TRAIN_STEPS = 420;

/**
 * The elevated train crossing the far layer from its right end to its left, every 40 s: the
 * street's moment, its windows warm over the club. One image gliding (StageDrift).
 */
function trainProp(far: Canvas): CodeProp {
  const length = TRAIN.cars * (TRAIN.car + TRAIN.gap) + 4;
  const rect = {
    x: 400,
    y: TRAIN.rail - TRAIN.height - 3,
    width: length,
    height: TRAIN.height + 3,
  };
  const off = Math.ceil(far.width / 2 + length / 2) + 2;
  const frame = (draw: boolean) => {
    const canvas = far.crop(0, 0, far.width, far.height);
    if (draw) drawTrain(canvas, rect.x + 4);
    return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
  };
  return {
    name: 'train',
    layer: 'far',
    rect,
    timeline: [[1, CYCLE]],
    frames: [frame(false), frame(true)],
    drift: { from: off, to: -off, start: TRAIN_AT, steps: TRAIN_STEPS },
  };
}

let drawn: CodeStage | undefined;

/** The street as the code draws it (drawn once, then kept: the tools ask for it several times). */
export function drawRue(): CodeStage {
  if (drawn) return drawn;
  const far = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
  const props = MID_ANIMATIONS.map(({ name, rect, frames, timeline, drift }): CodeProp => ({
    name,
    layer: 'mid',
    rect,
    timeline,
    ...(drift && { drift }),
    frames: Array.from({ length: frames }, (_, frame) => {
      const canvas = drawMid(mid.width, mid.height, (other) => (other === name ? frame : 0), rect);
      return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
    }),
  }));
  const canvases = {
    far: drawFar(far.width, far.height, SEED),
    mid: drawMid(mid.width, mid.height),
  };
  const mist = MIST_BANKS.map((bank) => mistProp(canvases[bank.layer], PALETTE, bank, MIST));
  drawn = {
    layers: {
      far: imageOf(canvases.far, PALETTE),
      mid: imageOf(canvases.mid, PALETTE),
      floor: imageOf(drawFloor(floor.width, floor.height, SEED), PALETTE),
    },
    props: [...mist, trainProp(canvases.far), ...props],
  };
  return drawn;
}

/** The street, for the tools: its folder, its drawing, its atmospheres. */
export const RUE: CodeMap = { name: 'rue', draw: drawRue, atmospheres: STREET_ATMOSPHERES };
