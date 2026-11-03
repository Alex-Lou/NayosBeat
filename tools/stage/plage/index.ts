/**
 * Sunset Beach (docs/art/decor-plage.md): a beach at the golden hour, the sea and the low sun, a
 * few bathers under their parasols, the beach bar. The code's drawing of its three layers and of
 * the animations laid on them; `npm run stages` installs it (tools/sprites/stage-drawn.ts).
 */

import type { Canvas } from '../kit/canvas.ts';
import { mistProp, type MistBank } from '../kit/fog.ts';
import type { CodeMap, CodeProp, CodeStage, Rect } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { PLAGE_ATMOSPHERES } from './atmospheres.ts';
import { drawFar, drawGlitter, drawGull, drawSail, HORIZON, SUN_AT } from './far.ts';
import { drawFloor } from './floor.ts';
import { BIG_WAVE_AT, CYCLE, drawMid, MID_ANIMATIONS } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

/** The sea mist: over the far sea, under the sun (it never hides a light), and low along the shore. */
const MIST_BANKS: readonly MistBank[] = [
  {
    name: 'mist0',
    layer: 'far',
    y: HORIZON + 40,
    height: 56,
    width: 600,
    steps: 3600,
    facing: 1,
    seed: 503,
  },
  {
    name: 'mist1',
    layer: 'mid',
    y: 384,
    height: 44,
    width: 760,
    steps: 2400,
    facing: -1,
    seed: 509,
  },
];

/** The far layer with `draw` laid on it, cut to `rect`, in the palette. */
function farFrame(far: Canvas, rect: Rect, draw?: (canvas: Canvas) => void) {
  const canvas = far.crop(0, 0, far.width, far.height);
  draw?.(canvas);
  return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
}

/** The sun's path on the sea, glittering: three frames, each held 20 steps. */
function glitterProp(far: Canvas): CodeProp {
  const rect = { x: SUN_AT.x - 90, y: HORIZON, width: 180, height: far.height - HORIZON };
  return {
    name: 'glitter',
    layer: 'far',
    rect,
    timeline: [
      [0, 20],
      [1, 20],
      [2, 20],
    ],
    frames: [0, 1, 2].map((frame) =>
      farFrame(
        far,
        rect,
        frame === 0
          ? undefined
          : (c) => {
              drawGlitter(c, frame);
            },
      ),
    ),
  };
}

/** A sailboat crossing far out, its sail lit, past both ends of the layer, in 80 s. */
function sailProp(far: Canvas): CodeProp {
  const y = HORIZON + 22;
  const rect = { x: 588, y: y - 31, width: 28, height: 33 };
  const off = Math.ceil(far.width / 2 + rect.width) + 2;
  return {
    name: 'sail',
    layer: 'far',
    rect,
    timeline: [[1, CYCLE * 2]],
    frames: [
      farFrame(far, rect),
      farFrame(far, rect, (c) => {
        drawSail(c, 589, y);
      }),
    ],
    drift: { from: off, to: -off, start: 0, steps: CYCLE * 2 },
  };
}

/**
 * Gulls crossing the sky, wings beating: a lone one, slow, and a flight of three that comes over
 * with the big wave (BIG_WAVE_AT).
 */
function gullProps(far: Canvas): CodeProp[] {
  const flap = (steps: number): [number, number][] =>
    Array.from({ length: steps / 12 }, (_, beat): [number, number] => [1 + (beat % 2), 12]);
  const lone = { x: 590, y: 120, width: 18, height: 12 };
  const flight = { x: 580, y: 60, width: 40, height: 26 };
  const off = (rect: Rect): number => Math.ceil(far.width / 2 + rect.width) + 2;
  const gulls = (rect: Rect, at: readonly (readonly [number, number])[]) =>
    [0, 1].map((frame) =>
      farFrame(far, rect, (c) => {
        for (const [x, y] of at) drawGull(c, rect.x + x, rect.y + y, frame);
      }),
    );
  return [
    {
      name: 'gull',
      layer: 'far',
      rect: lone,
      timeline: flap(CYCLE),
      frames: [farFrame(far, lone), ...gulls(lone, [[9, 6]])],
      drift: { from: -off(lone), to: off(lone), start: 0, steps: CYCLE },
    },
    {
      name: 'gulls',
      layer: 'far',
      rect: flight,
      timeline: flap(CYCLE),
      frames: [
        farFrame(far, flight),
        ...gulls(flight, [
          [8, 8],
          [20, 16],
          [32, 6],
        ]),
      ],
      drift: { from: off(flight), to: -off(flight), start: BIG_WAVE_AT - 240, steps: 720 },
    },
  ];
}

let drawn: CodeStage | undefined;

/** The beach as the code draws it (drawn once, then kept). */
export function drawPlage(): CodeStage {
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
      ...MIST_BANKS.map((bank) => mistProp(canvases[bank.layer], PALETTE, bank, MIST)),
      glitterProp(canvases.far),
      sailProp(canvases.far),
      ...gullProps(canvases.far),
      ...props,
    ],
  };
  return drawn;
}

/** The beach, for the tools: its folder, its drawing, its atmospheres. */
export const PLAGE: CodeMap = { name: 'plage', draw: drawPlage, atmospheres: PLAGE_ATMOSPHERES };
