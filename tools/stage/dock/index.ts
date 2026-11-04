/**
 * The Loading Dock (docs/art/decor-dock.md): the yard behind L'Entrepôt, Riff's place
 * (docs/art/histoire.md). The code's drawing of its three layers and of the animations laid on
 * them; `npm run stages` installs it (tools/sprites/stage-drawn.ts). Every pixel comes from fixed
 * seeds: the same dock on every run.
 */

import type { Canvas } from '../kit/canvas.ts';
import { mistProp, type MistBank } from '../kit/fog.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { DOCK_ATMOSPHERES } from './atmospheres.ts';
import { drawFar, drawFarTrain, FAR_TRAIN } from './far.ts';
import { drawFloor } from './floor.ts';
import { BASS_AT, BASS_CYCLE, drawMid, MID_ANIMATIONS } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

const SEED = 11;

const MIST_BANKS: readonly MistBank[] = [
  {
    name: 'mist0',
    layer: 'mid',
    y: 440,
    height: 52,
    width: 760,
    steps: 2400,
    facing: -1,
    seed: 401,
  },
  {
    name: 'mist1',
    layer: 'far',
    y: 262,
    height: 80,
    width: 520,
    steps: 3000,
    facing: 1,
    seed: 433,
  },
];

function trainProp(far: Canvas): CodeProp {
  const length = FAR_TRAIN.cars * (FAR_TRAIN.car + FAR_TRAIN.gap) + 4;
  const rect = {
    x: 80,
    y: FAR_TRAIN.rail - FAR_TRAIN.height,
    width: length,
    height: FAR_TRAIN.height,
  };
  const off = Math.ceil(far.width / 2 + length / 2) + 2;
  const frame = (draw: boolean) => {
    const canvas = far.crop(0, 0, far.width, far.height);
    if (draw) drawFarTrain(canvas, rect.x + 2);
    return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
  };
  return {
    name: 'train',
    layer: 'far',
    rect,
    timeline: [[1, BASS_CYCLE]],
    frames: [frame(false), frame(true)],
    drift: { from: off, to: -off, start: BASS_AT - 180, steps: 360 },
  };
}

let drawn: CodeStage | undefined;

export function drawDock(): CodeStage {
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

export const DOCK: CodeMap = { name: 'dock', draw: drawDock, atmospheres: DOCK_ATMOSPHERES };
