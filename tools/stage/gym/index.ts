/**
 * The Viaduct Gym (docs/art/decor-gym.md): the boxing gym in an arch of the viaduct, where Nayo
 * learned to box (docs/art/histoire.md). The code's drawing of its three layers and of the
 * animations laid on them; `npm run stages` installs it (tools/sprites/stage-drawn.ts). Every pixel
 * comes from fixed seeds: the same gym on every run.
 */

import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { GYM_ATMOSPHERES } from './atmospheres.ts';
import { DECK, DOWNPOUR, drawDownpour, drawFar, END, TRAIN_FRAMES, trainNose } from './far.ts';
import { drawFloor } from './floor.ts';
import { drawMid, MID_ANIMATIONS, PASSING, TRAIN_CYCLE } from './mid.ts';
import { PALETTE } from './palette.ts';

const SEED = 7;
/** Steps each frame of the train lasts. */
const TRAIN_STEP = 4;

/** Steps each frame of the rain at the window lasts: its streaks fall 12 rows a frame. */
const DOWNPOUR_STEP = 3;

/** The rain beyond the window's glass, under the rain only (frame 0: the window as it is). */
function downpourProp(width: number, height: number): CodeProp {
  const still = drawFar(width, height, SEED);
  const rect = { x: DOWNPOUR.x, y: DOWNPOUR.y, width: DOWNPOUR.width, height: DOWNPOUR.height };
  return {
    name: 'downpour',
    layer: 'far',
    weather: 'rain',
    rect,
    timeline: Array.from({ length: DOWNPOUR.frames }, (_, index): [number, number] => [
      index + 1,
      DOWNPOUR_STEP,
    ]),
    frames: Array.from({ length: DOWNPOUR.frames + 1 }, (_, frame) => {
      const canvas = still.crop(0, 0, width, height);
      if (frame > 0) drawDownpour(canvas, frame);
      return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
    }),
  };
}

let drawn: CodeStage | undefined;

/** The train crossing the window at the end of the arch, in step with the bags it swings. */
function trainProp(width: number, height: number): CodeProp {
  const rect = { x: END.x - END.radius, y: DECK.top - 24, width: END.radius * 2, height: 24 };
  return {
    name: 'train',
    layer: 'far',
    rect,
    timeline: [
      [0, PASSING],
      ...Array.from({ length: TRAIN_FRAMES }, (_, index): [number, number] => [
        index + 1,
        TRAIN_STEP,
      ]),
      [0, TRAIN_CYCLE - PASSING - TRAIN_FRAMES * TRAIN_STEP],
    ],
    frames: Array.from({ length: TRAIN_FRAMES + 1 }, (_, frame) => {
      const canvas = drawFar(width, height, SEED, frame > 0 ? trainNose(frame) : undefined);
      return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
    }),
  };
}

/** The gym as the code draws it (drawn once, then kept: the tools ask for it several times). */
export function drawGym(): CodeStage {
  if (drawn) return drawn;
  const far = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
  const props = MID_ANIMATIONS.map(({ name, rect, frames, timeline, weather }): CodeProp => ({
    name,
    layer: 'mid',
    rect,
    timeline,
    ...(weather && { weather }),
    frames: Array.from({ length: frames }, (_, frame) => {
      const canvas = drawMid(mid.width, mid.height, (other) => (other === name ? frame : 0), rect);
      return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
    }),
  }));
  drawn = {
    layers: {
      far: imageOf(drawFar(far.width, far.height, SEED), PALETTE),
      mid: imageOf(drawMid(mid.width, mid.height), PALETTE),
      floor: imageOf(drawFloor(floor.width, floor.height, SEED), PALETTE),
    },
    props: [trainProp(far.width, far.height), downpourProp(far.width, far.height), ...props],
  };
  return drawn;
}

/** The gym, for the tools: its folder, its drawing, its atmospheres. */
export const GYM: CodeMap = { name: 'gym', draw: drawGym, atmospheres: GYM_ATMOSPHERES };
