/**
 * Rooftop Rain (docs/art/decor-rooftop.md): a roof of the megacity of Néon Underground, under the
 * giant signs, where the fights are held between two deliveries (docs/art/univers.md §2). The
 * code's drawing of its three layers and of the animations laid on them, the blimp and the flying
 * cars gliding over the far one (src/art/stage-layers.ts `StageDrift`); `npm run stages` installs it
 * (tools/sprites/stage-drawn.ts). Every pixel comes from fixed seeds: the same roof on every run.
 */

import type { Canvas } from '../kit/canvas.ts';
import { mistProp, type MistBank } from '../kit/fog.ts';
import type { CodeMap, CodeProp, CodeStage, Rect } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { ROOFTOP_ATMOSPHERES } from './atmospheres.ts';
import {
  BEAM_ANGLES,
  BLIMP_CYCLE,
  blimpRect,
  drawBlimp,
  drawFar,
  drawFlyingCar,
  PASS,
  PASS_AT,
} from './far.ts';
import { drawFloor } from './floor.ts';
import { drawMid, MID_ANIMATIONS } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

const SEED = 23;

/** The searchlight's sweep: its angles' frames, back and forth, each held this many steps. */
const SWEEP = [3, 4, 5, 4, 3, 2, 1, 2] as const;
// PASS is a whole number of them: the last angle is held as long as the others.
const SWEEP_HOLD = 50;

/**
 * The flying cars far off, one a lane: its row, its way, how long it takes across (steps), drawn
 * at x 600; each comes in past one end of the layer and goes out past the other, again and again.
 */
const CARS = [
  { y: 214, facing: -1, steps: 620 },
  { y: 246, facing: 1, steps: 780 },
  { y: 268, facing: -1, steps: 940 },
  { y: 300, facing: 1, steps: 1180 },
  { y: 330, facing: -1, steps: 1460 },
] as const;
const CAR_X = 600;
/** How far past its drawn place a glider starts and ends: beyond both ends of the far layer. */
const OFF = 640;

/** The far layer with `draw` laid on it, cut to `rect`, in the palette. */
function farFrame(far: Canvas, rect: Rect, draw?: (canvas: Canvas) => void) {
  const canvas = far.crop(0, 0, far.width, far.height);
  draw?.(canvas);
  return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
}

/** The blimp's pass: still (frame 0) until PASS_AT, then its beam sweeping, then gone. */
function blimpProp(far: Canvas): CodeProp {
  const rect = blimpRect();
  const timeline: [number, number][] = [[0, PASS_AT]];
  for (let step = 0; step < PASS; step++) {
    const frame = SWEEP[Math.floor(step / SWEEP_HOLD) % SWEEP.length] ?? 3;
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  timeline.push([0, BLIMP_CYCLE - PASS_AT - PASS]);
  return {
    name: 'blimp',
    layer: 'far',
    rect,
    timeline,
    frames: [
      farFrame(far, rect),
      ...BEAM_ANGLES.map((angle) =>
        farFrame(far, rect, (canvas) => {
          drawBlimp(canvas, angle);
        }),
      ),
    ],
    // It flies leftward: in past the right end, out past the left.
    drift: { from: OFF + 100, to: -OFF - 100, start: PASS_AT, steps: PASS },
  };
}

function carProp(far: Canvas, index: number): CodeProp {
  const { y, facing, steps } = CARS[index] ?? CARS[0];
  const rect = { x: CAR_X - 8, y: y - 3, width: 32, height: 8 };
  return {
    name: `car${index}`,
    layer: 'far',
    rect,
    timeline: [[1, steps]],
    frames: [
      farFrame(far, rect),
      farFrame(far, rect, (c) => {
        drawFlyingCar(c, CAR_X, y, facing);
      }),
    ],
    drift: { from: -facing * OFF, to: facing * OFF, start: 0, steps },
  };
}

/** The fog's banks of mist, drifting across the far layer each its own way (kit/fog.ts). */
const MIST_BANKS: readonly MistBank[] = [
  {
    name: 'mist0',
    layer: 'far',
    y: 300,
    height: 90,
    width: 560,
    steps: 3600,
    facing: -1,
    seed: 401,
  },
  {
    name: 'mist1',
    layer: 'far',
    y: 372,
    height: 70,
    width: 460,
    steps: 2700,
    facing: 1,
    seed: 433,
  },
];

let drawn: CodeStage | undefined;

/** The rooftop as the code draws it (drawn once, then kept: the tools ask for it several times). */
export function drawRooftop(): CodeStage {
  if (drawn) return drawn;
  const farSize = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
  const far = drawFar(farSize.width, farSize.height, SEED);
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
      far: imageOf(far, PALETTE),
      mid: imageOf(drawMid(mid.width, mid.height), PALETTE),
      floor: imageOf(drawFloor(floor.width, floor.height, SEED), PALETTE),
    },
    props: [
      ...MIST_BANKS.map((bank) => mistProp(far, PALETTE, bank, MIST)),
      ...CARS.map((_, index) => carProp(far, index)),
      blimpProp(far),
      ...props,
    ],
  };
  return drawn;
}

/** The rooftop, for the tools: its folder, its drawing, its atmospheres. */
export const ROOFTOP: CodeMap = {
  name: 'rooftop',
  draw: drawRooftop,
  atmospheres: ROOFTOP_ATMOSPHERES,
};
