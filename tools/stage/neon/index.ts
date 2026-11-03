/**
 * Neon Dusk (docs/art/decor-neon-dusk.md): the cyberpunk street at night, its noodle stand, its
 * vending machines, its breathing sign, its steaming manhole, its flying cars. The code's drawing
 * of its three layers and of the animations laid on them; `npm run stages` installs it
 * (tools/sprites/stage-drawn.ts).
 */

import type { Canvas } from '../kit/canvas.ts';
import { mistProp, type MistBank } from '../kit/fog.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { NEON_ATMOSPHERES } from './atmospheres.ts';
import { CAR0_RECT, CAR0_Y, CAR1_RECT, CAR1_Y, drawCar, drawFar, HORIZON } from './far.ts';
import { drawFloor } from './floor.ts';
import { BASE, CAR_AT, CYCLE, drawMid, MID_ANIMATIONS } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

/** The fog's banks: over the roofs, and low along the street. */
const MIST_BANKS: readonly MistBank[] = [
  {
    name: 'mist0',
    layer: 'far',
    y: HORIZON + 20,
    height: 46,
    width: 580,
    steps: 3000,
    facing: 1,
    seed: 701,
  },
  {
    name: 'mist1',
    layer: 'mid',
    y: BASE - 22,
    height: 40,
    width: 780,
    steps: 2400,
    facing: -1,
    seed: 719,
  },
];

/** The far layer with `draw` laid on it, cut to `rect`, in the palette. */
function farFrame(
  far: Canvas,
  rect: { x: number; y: number; width: number; height: number },
  draw?: (canvas: Canvas) => void,
) {
  const canvas = far.crop(0, 0, far.width, far.height);
  draw?.(canvas);
  return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
}

/**
 * A flying car gliding across the far layer, past both ends and back: `car0` the low one, the
 * moment, centered at CAR_AT; `car1` higher and slower, on its own path.
 */
function carProp(
  far: Canvas,
  name: string,
  rect: { x: number; y: number; width: number; height: number },
  y: number,
  from: number,
  to: number,
  start: number,
  steps: number,
): CodeProp {
  return {
    name,
    layer: 'far',
    rect,
    timeline: [[1, CYCLE]],
    frames: [
      farFrame(far, rect),
      farFrame(far, rect, (canvas) => {
        drawCar(canvas, rect.x + 4, y, rect.width - 8, rect.height - 6);
      }),
    ],
    drift: { from, to, start, steps },
  };
}

let drawn: CodeStage | undefined;

/** The street as the code draws it (drawn once, then kept). */
export function drawNeon(): CodeStage {
  if (drawn) return drawn;
  const farSize = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
  const canvases = {
    far: drawFar(farSize.width, farSize.height),
    mid: drawMid(mid.width, mid.height),
  };
  const props = MID_ANIMATIONS.map(({ name, rect, frames, timeline }): CodeProp => ({
    name,
    layer: 'mid',
    rect,
    timeline,
    frames: Array.from({ length: frames }, (_, frame) => {
      const canvas = drawMid(mid.width, mid.height, (other) => (other === name ? frame : 0), rect);
      return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
    }),
  }));
  drawn = {
    layers: {
      far: imageOf(canvases.far, PALETTE),
      mid: imageOf(canvases.mid, PALETTE),
      floor: imageOf(drawFloor(floor.width, floor.height), PALETTE),
    },
    props: [
      carProp(canvases.far, 'car0', CAR0_RECT, CAR0_Y, 900, -900, CAR_AT - 160, 320),
      carProp(canvases.far, 'car1', CAR1_RECT, CAR1_Y, -700, 700, 0, CYCLE),
      ...props,
      ...MIST_BANKS.map((bank) => mistProp(canvases[bank.layer], PALETTE, bank, MIST)),
    ],
  };
  return drawn;
}

/** The street, for the tools: its folder, its drawing, its atmospheres. */
export const NEON: CodeMap = {
  name: 'neon',
  draw: drawNeon,
  atmospheres: NEON_ATMOSPHERES,
};
