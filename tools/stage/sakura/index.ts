/**
 * Sakura Arena (docs/art/decor-sakura.md): the developer's parallax prototype, adapted to the
 * stage's three layers. All three layers are drawn by hand, in art-src/sakura/; `npm run stages`
 * installs them (tools/sprites/stage-drawn.ts). The code's layers are only a blank fallback: this
 * stage has no code drawing of its own, and its palette lives in its images.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';

const BLANK: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** A blank layer of the stage's size, in the single transparent slot. */
function blank(name: 'far' | 'mid' | 'floor') {
  const { width, height } = sizeOf(name);
  return imageOf(new Canvas(width, height), [BLANK]);
}

let drawn: CodeStage | undefined;

/** The stage's code layers: blank, since art-src/sakura/ draws all three. */
export function drawSakura(): CodeStage {
  drawn ??= { layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') }, props: [] };
  return drawn;
}

/**
 * The stage, for the tools: its folder, its drawing, its atmospheres. One atmosphere, the art's
 * own: the prototype is a single illustration, and its palette is the images' own (the drawn
 * layers keep it slot for slot until another atmosphere is painted).
 */
export const SAKURA: CodeMap = {
  name: 'sakura',
  draw: drawSakura,
  atmospheres: [{ atmosphere: { moment: 'dusk', weather: 'clear' }, palette: [BLANK] }],
};
