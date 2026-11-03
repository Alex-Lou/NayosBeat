/**
 * L'Entrepôt, inside (docs/art/decor-club.md): the club itself, from its dance floor, the speaker
 * walls and the DJ at the back (docs/art/histoire.md). The code's drawing of its three layers and of
 * the animations laid on them; `npm run stages` installs it (tools/sprites/stage-drawn.ts).
 */

import type { Canvas } from '../kit/canvas.ts';
import { mistProp, type MistBank } from '../kit/fog.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { CLUB_ATMOSPHERES } from './atmospheres.ts';
import { BACK, DJ, drawFar, STACKS } from './far.ts';
import { drawFloor } from './floor.ts';
import { bassBeat, drawMid, MID_ANIMATIONS, timelineOf } from './mid.ts';
import { MIST, PALETTE } from './palette.ts';

/** The smoke's banks: low over the dance floor, and over the stage at the back. */
const MIST_BANKS: readonly MistBank[] = [
  {
    name: 'mist0',
    layer: 'mid',
    y: 430,
    height: 40,
    width: 800,
    steps: 2400,
    facing: -1,
    seed: 451,
  },
  {
    name: 'mist1',
    layer: 'far',
    y: 400,
    height: 60,
    width: 560,
    steps: 3000,
    facing: 1,
    seed: 467,
  },
];

/** The DJ: at the decks, nodding on the beat, a hand up with the bass. */
function djProp(far: Canvas): CodeProp {
  const rect = { x: DJ.x - 30, y: DJ.y - DJ.height - 24, width: 60, height: DJ.height - 34 };
  return {
    name: 'dj',
    layer: 'far',
    rect,
    timeline: timelineOf((step) => {
      if (bassBeat(step) !== undefined) return step % 30 < 15 ? 2 : 1;
      return step % 30 < 15 ? 1 : 0;
    }),
    // The booth is drawn over the DJ's legs: each frame is the whole far layer around its pose.
    frames: [0, 1, 2].map((frame) =>
      imageOf(
        drawFar(far.width, far.height, frame).crop(rect.x, rect.y, rect.width, rect.height),
        PALETTE,
      ),
    ),
  };
}

/** The speaker walls' cones, pushed out on every beat of the bass. */
function conesProp(far: Canvas): CodeProp {
  const left = STACKS[0];
  const right = STACKS[1] + 190;
  const rect = { x: left, y: BACK.floor - 4 * 68, width: right - left, height: 4 * 68 };
  return {
    name: 'cones',
    layer: 'far',
    rect,
    timeline: timelineOf((step) => (bassBeat(step) !== undefined && step % 30 < 10 ? 1 : 0)),
    frames: [0, 1].map((pump) =>
      imageOf(
        drawFar(far.width, far.height, 0, pump).crop(rect.x, rect.y, rect.width, rect.height),
        PALETTE,
      ),
    ),
  };
}

let drawn: CodeStage | undefined;

/** The club as the code draws it (drawn once, then kept). */
export function drawClub(): CodeStage {
  if (drawn) return drawn;
  const farSize = sizeOf('far');
  const mid = sizeOf('mid');
  const floor = sizeOf('floor');
  const canvases = {
    far: drawFar(farSize.width, farSize.height),
    mid: drawMid(mid.width, mid.height),
  };
  const props = MID_ANIMATIONS.map(({ name, rect, frames, timeline, weather }): CodeProp => ({
    name,
    layer: 'mid',
    rect,
    timeline,
    ...(weather && { weather }),
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
      djProp(canvases.far),
      conesProp(canvases.far),
      ...props,
    ],
  };
  return drawn;
}

/** The club, for the tools: its folder, its drawing, its atmospheres. */
export const CLUB: CodeMap = { name: 'club', draw: drawClub, atmospheres: CLUB_ATMOSPHERES };
