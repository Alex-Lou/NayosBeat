/**
 * Firefly Forest (docs/art/decor-firefly-forest.md): the enchanted clearing at night, its two
 * twisted trees, its still pond, its fireflies and its glowing mushrooms, and the swarm that
 * crosses it. The code's drawing of its three layers and of the animations laid on them;
 * `npm run stages` installs it (tools/sprites/stage-drawn.ts).
 */

import type { Canvas } from '../kit/canvas.ts';
import { mistProp, type MistBank } from '../kit/fog.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { LUCIOLES_ATMOSPHERES } from './atmospheres.ts';
import { drawFar, HORIZON } from './far.ts';
import { drawFloor } from './floor.ts';
import { BASE, CYCLE, drawMid, drawSwarm, MID_ANIMATIONS, SWARM_AT } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

/** The fog's banks: between the trunks, and low along the path. */
const MIST_BANKS: readonly MistBank[] = [
  {
    name: 'mist0',
    layer: 'far',
    y: HORIZON + 20,
    height: 46,
    width: 580,
    steps: 3000,
    facing: 1,
    seed: 1021,
  },
  {
    name: 'mist1',
    layer: 'mid',
    y: BASE - 26,
    height: 40,
    width: 780,
    steps: 2400,
    facing: -1,
    seed: 1037,
  },
];

/** The swarm's band of fireflies: one image gliding across the clearing, centered at SWARM_AT. */
function swarmProp(mid: Canvas): CodeProp {
  const rect = { x: 0, y: 140, width: 260, height: 280 };
  const off = Math.ceil(mid.width / 2 + rect.width / 2) + 2;
  const frame = (draw: boolean) => {
    const canvas = mid.crop(0, 0, mid.width, mid.height);
    if (draw) drawSwarm(canvas, 90);
    return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
  };
  return {
    name: 'swarm',
    layer: 'mid',
    rect,
    timeline: [[1, CYCLE]],
    frames: [frame(false), frame(true)],
    drift: { from: -off, to: off, start: SWARM_AT - 140, steps: 280 },
  };
}

let drawn: CodeStage | undefined;

/** The clearing as the code draws it (drawn once, then kept). */
export function drawLucioles(): CodeStage {
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
      swarmProp(canvases.mid),
      ...props,
      ...MIST_BANKS.map((bank) => mistProp(canvases[bank.layer], PALETTE, bank, MIST)),
    ],
  };
  return drawn;
}

/** The forest, for the tools: its folder, its drawing, its atmospheres. */
export const LUCIOLES: CodeMap = {
  name: 'lucioles',
  draw: drawLucioles,
  atmospheres: LUCIOLES_ATMOSPHERES,
};
