/**
 * The Dojo (docs/art/decor-dojo.md): the training hall at night, its pillars, its paper lanterns,
 * its scroll over the tokonoma, its dummy; the wave of light that passes from lantern to lantern.
 * The code's drawing of its three layers and of the animations laid on them; `npm run stages`
 * installs it (tools/sprites/stage-drawn.ts).
 */

import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { DOJO_ATMOSPHERES } from './atmospheres.ts';
import { drawFar } from './far.ts';
import { drawFloor } from './floor.ts';
import { drawMid, MID_ANIMATIONS } from './mid.ts';
import { PALETTE } from './palette.ts';

let drawn: CodeStage | undefined;

/** The hall as the code draws it (drawn once, then kept). */
export function drawDojo(): CodeStage {
  if (drawn) return drawn;
  const farSize = sizeOf('far');
  const midSize = sizeOf('mid');
  const floor = sizeOf('floor');
  const mid = { width: midSize.width, height: midSize.height };
  const props = MID_ANIMATIONS.map(({ name, rect, frames, timeline, weather }): CodeProp => ({
    name,
    layer: 'mid',
    rect,
    timeline,
    ...(weather ? { weather } : {}),
    frames: Array.from({ length: frames }, (_, frame) => {
      const canvas = drawMid(mid.width, mid.height, (other) => (other === name ? frame : 0), rect);
      return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
    }),
  }));
  drawn = {
    layers: {
      far: imageOf(drawFar(farSize.width, farSize.height), PALETTE),
      mid: imageOf(drawMid(mid.width, mid.height), PALETTE),
      floor: imageOf(drawFloor(floor.width, floor.height), PALETTE),
    },
    props,
  };
  return drawn;
}

/** The dojo, for the tools: its folder, its drawing, its atmospheres. */
export const DOJO: CodeMap = {
  name: 'dojo',
  draw: drawDojo,
  atmospheres: DOJO_ATMOSPHERES,
};
