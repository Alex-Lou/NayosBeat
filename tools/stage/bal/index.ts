/**
 * Le Bal du Samedi (docs/art/decor-bal.md): Saphir's place, a ballroom of the fifties on a Saturday
 * night, the swing band on its stand (docs/art/univers.md). The code's drawing of its three layers
 * and of the animations laid on them; `npm run stages` installs it (tools/sprites/stage-drawn.ts).
 */

import type { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeProp, CodeStage, Rect } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { BAL_ATMOSPHERES } from './atmospheres.ts';
import { BAND_RECT, drawFar, WINDOWS } from './far.ts';
import { drawFloor } from './floor.ts';
import { beatOf, chorusBeat, drawMid, MID_ANIMATIONS, onBeat, timelineOf } from './mid.ts';
import { PALETTE } from './palette.ts';

/** A prop of the far layer: each frame the whole far layer redrawn, cut to `rect`. */
function farProp(
  far: Canvas,
  name: string,
  rect: Rect,
  frames: number,
  timeline: CodeProp['timeline'],
): CodeProp {
  return {
    name,
    layer: 'far',
    rect,
    timeline,
    frames: Array.from({ length: frames }, (_, frame) =>
      imageOf(
        drawFar(far.width, far.height, (other) => (other === name ? frame : 0)).crop(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
        ),
        PALETTE,
      ),
    ),
  };
}

/** The band swings on the beat; with the chorus, the horns raised, the drummer's sticks up. */
function bandProp(far: Canvas): CodeProp {
  return farProp(
    far,
    'band',
    BAND_RECT,
    4,
    timelineOf((step) => {
      if (chorusBeat(step) !== undefined) return 3;
      return onBeat(step) ? 1 + (beatOf(step) % 2) : 0;
    }),
  );
}

/** The rain and the snow behind each high window, each in its weather alone. */
function windowProps(far: Canvas): CodeProp[] {
  return WINDOWS.flatMap((window, index): CodeProp[] => [
    {
      ...farProp(far, `rain${index}`, window, 4, [
        [1, 3],
        [2, 3],
        [3, 3],
      ]),
      weather: 'rain',
    },
    {
      ...farProp(far, `snow${index}`, window, 5, [
        [1, 8],
        [2, 8],
        [3, 8],
        [4, 8],
      ]),
      weather: 'snow',
    },
  ]);
}

let drawn: CodeStage | undefined;

/** The ballroom as the code draws it (drawn once, then kept). */
export function drawBal(): CodeStage {
  if (drawn) return drawn;
  const farSize = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
  const far = drawFar(farSize.width, farSize.height);
  const couples = MID_ANIMATIONS.map(({ name, rect, frames, timeline }): CodeProp => ({
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
      floor: imageOf(drawFloor(floor.width, floor.height), PALETTE),
    },
    props: [bandProp(far), ...windowProps(far), ...couples],
  };
  return drawn;
}

/** The ballroom, for the tools: its folder, its drawing, its atmospheres. */
export const BAL: CodeMap = { name: 'bal', draw: drawBal, atmospheres: BAL_ATMOSPHERES };
