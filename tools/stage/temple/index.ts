/**
 * Temple Courtyard (docs/art/decor-temple.md): the courtyard of a temple on an island of the
 * Archipel des Légendes (docs/art/univers.md §3), the sea and the islands past its wall. The code's
 * drawing of its three layers and of the animations laid on them; `npm run stages` installs it
 * (tools/sprites/stage-drawn.ts). Every pixel comes from fixed seeds: the same courtyard every run.
 */

import type { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeProp, CodeStage, Rect } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { TEMPLE_ATMOSPHERES } from './atmospheres.ts';
import { drawBoat, drawFar, drawGlitter, HORIZON, MOON_AT } from './far.ts';
import { drawFloor } from './floor.ts';
import { drawMid, MID_ANIMATIONS } from './mid.ts';
import { PALETTE } from './palette.ts';

const SEED = 29;

/** The far layer with `draw` laid on it, cut to `rect`, in the palette. */
function farFrame(far: Canvas, rect: Rect, draw?: (canvas: Canvas) => void) {
  const canvas = far.crop(0, 0, far.width, far.height);
  draw?.(canvas);
  return imageOf(canvas.crop(rect.x, rect.y, rect.width, rect.height), PALETTE);
}

/** The moon's path on the sea, glittering: three frames, each held 20 steps. */
function glitterProp(far: Canvas): CodeProp {
  const rect = { x: MOON_AT.x - 80, y: HORIZON, width: 160, height: far.height - HORIZON };
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

/** A fishing boat crossing far out, its lantern lit, past both ends of the layer, in 50 s. */
function boatProp(far: Canvas): CodeProp {
  const y = HORIZON + 30;
  const rect = { x: 588, y: y - 17, width: 28, height: 19 };
  const off = Math.ceil(far.width / 2 + rect.width) + 2;
  return {
    name: 'boat',
    layer: 'far',
    rect,
    timeline: [[1, 3000]],
    frames: [
      farFrame(far, rect),
      farFrame(far, rect, (c) => {
        drawBoat(c, 589, y);
      }),
    ],
    drift: { from: -off, to: off, start: 0, steps: 3000 },
  };
}

let drawn: CodeStage | undefined;

/** The temple as the code draws it (drawn once, then kept: the tools ask for it several times). */
export function drawTemple(): CodeStage {
  if (drawn) return drawn;
  const farSize = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
  const far = drawFar(farSize.width, farSize.height);
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
    props: [glitterProp(far), boatProp(far), ...props],
  };
  return drawn;
}

/** The temple, for the tools: its folder, its drawing, its atmospheres. */
export const TEMPLE: CodeMap = {
  name: 'temple',
  draw: drawTemple,
  atmospheres: TEMPLE_ATMOSPHERES,
};
