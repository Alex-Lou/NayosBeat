/**
 * Night Market (docs/art/decor-night-market.md): the market's alley at night, its two stalls, its
 * strings of lanterns, the wok and its steam, the scooter at the back. The code's drawing of its
 * three layers and of the animations laid on them; `npm run stages` installs it
 * (tools/sprites/stage-drawn.ts).
 */

import { mistProp, type MistBank } from '../kit/fog.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { MARCHE_ATMOSPHERES } from './atmospheres.ts';
import { drawFar, HORIZON } from './far.ts';
import { drawFloor } from './floor.ts';
import { BASE, drawMid, MID_ANIMATIONS } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

/** The fog's banks: over the roofs, and low along the lane. */
const MIST_BANKS: readonly MistBank[] = [
  {
    name: 'mist0',
    layer: 'far',
    y: HORIZON + 20,
    height: 46,
    width: 580,
    steps: 3000,
    facing: 1,
    seed: 601,
  },
  {
    name: 'mist1',
    layer: 'mid',
    y: BASE - 22,
    height: 40,
    width: 780,
    steps: 2400,
    facing: -1,
    seed: 617,
  },
];

let drawn: CodeStage | undefined;

/** The market as the code draws it (drawn once, then kept). */
export function drawMarche(): CodeStage {
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
      ...props,
      ...MIST_BANKS.map((bank) => mistProp(canvases[bank.layer], PALETTE, bank, MIST)),
    ],
  };
  return drawn;
}

/** The market, for the tools: its folder, its drawing, its atmospheres. */
export const MARCHE: CodeMap = {
  name: 'marche',
  draw: drawMarche,
  atmospheres: MARCHE_ATMOSPHERES,
};
