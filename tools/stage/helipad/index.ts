/**
 * H-02 Helipad (docs/art/decor-helipad.md): the developer's background (issue #155), the rooftop
 * helipad under the moon and the city's neon. The far layer is the city and the sky, the middle
 * layer is the tower cut out for parallax, and the floor is the deck; all three are truecolor PNGs
 * drawn by hand in art-src/helipad/, copied as they are by `npm run stages` (`rgba`). The code
 * plays the GIF's animated regions over them: the helicopter and its beam, the two vent smokes and
 * the two red beacons, cut to the pixels each frame changes.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';
import { STAGE_ANIMATIONS } from './anim.ts';

const BLANK: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** A blank layer of the stage's size, in the single transparent slot. */
function blank(name: 'far' | 'mid' | 'floor') {
  const { width, height } = sizeOf(name);
  return imageOf(new Canvas(width, height), [BLANK]);
}

let drawn: CodeStage | undefined;

/** The stage's code layers are blank: the truecolor art and the GIF's animations carry them. */
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
  animations: { sheet: 'animation.png', props: STAGE_ANIMATIONS },
};
