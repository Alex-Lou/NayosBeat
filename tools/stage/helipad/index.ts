/**
 * H-02 Helipad (docs/art/decor-helipad.md): the developer's background (issue #155), the rooftop
 * helipad under the moon and the city's neon. All visible layers are truecolor PNGs drawn by hand,
 * in art-src/helipad/; `npm run stages` copies them as they are (`rgba`), so the illustration keeps
 * every colour. The code's layers are only a blank fallback: the stage has no code drawing and no
 * code animation of its own, since the helicopter, its beam, the smoke and the lights are already
 * in the drawing. No middle layer: the scene is a single illustration.
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

/** The stage's code layers: blank, since art-src/helipad/ draws them; no props. */
export function drawHelipad(): CodeStage {
  drawn ??= {
    layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') },
    props: [],
  };
  return drawn;
}

/**
 * The stage, for the tools: its folder, its drawing, its atmospheres. One atmosphere, the art's
 * own: the illustration is a single moonlit night, and its palette is the images' own.
 */
export const HELIPAD: CodeMap = {
  name: 'helipad',
  draw: drawHelipad,
  atmospheres: [{ atmosphere: { moment: 'midnight', weather: 'clear' }, palette: [BLANK] }],
  rgba: true,
  noMid: true,
};
