/**
 * Dune Dusk (docs/art/decor-dune-dusk.md): the desert at dusk, its dunes, its dead tree, its
 * beetle, the sand that streams and the gust that sweeps the plain. The code's drawing of its
 * three layers and of the animations laid on them; `npm run stages` installs it
 * (tools/sprites/stage-drawn.ts).
 */

import type { Canvas } from '../kit/canvas.ts';
import { mistProp, type MistBank } from '../kit/fog.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { DUNES_ATMOSPHERES } from './atmospheres.ts';
import { drawFar, HORIZON } from './far.ts';
import { drawFloor } from './floor.ts';
import { BASE, CYCLE, drawGust, drawMid, GUST_AT, MID_ANIMATIONS } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

/** The fog's banks: over the dunes, and low along the plain. */
const MIST_BANKS: readonly MistBank[] = [
  {
    name: 'mist0',
    layer: 'far',
    y: HORIZON + 16,
    height: 46,
    width: 580,
    steps: 3000,
    facing: 1,
    seed: 911,
  },
  {
    name: 'mist1',
    layer: 'mid',
    y: BASE - 24,
    height: 40,
    width: 780,
    steps: 2400,
    facing: -1,
    seed: 929,
  },
];

/** The gust's sweep of sand: one image gliding across the plain, centered at GUST_AT. */
function gustProp(mid: Canvas): CodeProp {
  const rect = { x: 0, y: 130, width: 280, height: 300 };
  const off = Math.ceil(mid.width / 2 + rect.width / 2) + 2;
  const frame = (draw: boolean) => {
    const canvas = mid.crop(0, 0, mid.width, mid.height);
    if (draw) drawGust(canvas, 100);
    return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
  };
  return {
    name: 'gust',
    layer: 'mid',
    rect,
    timeline: [[1, CYCLE]],
    frames: [frame(false), frame(true)],
    drift: { from: -off, to: off, start: GUST_AT - 140, steps: 280 },
  };
}

let drawn: CodeStage | undefined;

/** The desert as the code draws it (drawn once, then kept). */
export function drawDunes(): CodeStage {
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
      gustProp(canvases.mid),
      ...props,
      ...MIST_BANKS.map((bank) => mistProp(canvases[bank.layer], PALETTE, bank, MIST)),
    ],
  };
  return drawn;
}

/** The desert, for the tools: its folder, its drawing, its atmospheres. */
export const DUNES: CodeMap = {
  name: 'dunes',
  draw: drawDunes,
  atmospheres: DUNES_ATMOSPHERES,
};
