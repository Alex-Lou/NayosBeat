/**
 * The Loading Dock (docs/art/decor-dock.md): the yard behind L'Entrepôt, Riff's place
 * (docs/art/histoire.md). The code's drawing of its three layers and of the animations laid on
 * them; `npm run stages` installs it (tools/sprites/stage-drawn.ts). Every pixel comes from fixed
 * seeds: the same dock on every run.
 */

import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { DOCK_ATMOSPHERES } from './atmospheres.ts';
import { drawFar } from './far.ts';
import { drawFloor } from './floor.ts';
import { drawMid, MID_ANIMATIONS } from './mid.ts';
import { PALETTE } from './palette.ts';

const SEED = 11;

let drawn: CodeStage | undefined;

/** The dock as the code draws it (drawn once, then kept: the tools ask for it several times). */
export function drawDock(): CodeStage {
  if (drawn) return drawn;
  const far = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
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
      far: imageOf(drawFar(far.width, far.height, SEED), PALETTE),
      mid: imageOf(drawMid(mid.width, mid.height), PALETTE),
      floor: imageOf(drawFloor(floor.width, floor.height, SEED), PALETTE),
    },
    props,
  };
  return drawn;
}

/** The dock, for the tools: its folder, its drawing, its atmospheres. */
export const DOCK: CodeMap = { name: 'dock', draw: drawDock, atmospheres: DOCK_ATMOSPHERES };
