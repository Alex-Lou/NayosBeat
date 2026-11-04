/**
 * Sakura Arena (docs/art/decor-sakura.md): the developer's illustration (issue #155), adapted to
 * the stage's three layers. All three are truecolor PNGs drawn by hand, in art-src/sakura/;
 * `npm run stages` copies them as they are (`rgba`, tools/sprites/stage-drawn.ts), so the
 * illustration keeps every color. The code's layers are only a blank fallback: the stage has no
 * code drawing of its own. The code adds the petals that fall across the sanctuary, laid over
 * the hand-drawn scene.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeProp, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';

const BLANK: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** A blank layer of the stage's size, in the single transparent slot. */
function blank(name: 'far' | 'mid' | 'floor') {
  const { width, height } = sizeOf(name);
  return imageOf(new Canvas(width, height), [BLANK]);
}

/** The petals: the clear slot first, then the pale pinks and the warm light. */
const PETALS: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 230, b: 240, a: 255 },
  { r: 248, g: 190, b: 215, a: 255 },
  { r: 236, g: 140, b: 180, a: 255 },
  { r: 201, g: 106, b: 106, a: 255 },
  { r: 255, g: 244, b: 224, a: 255 },
];

/** The petal gust's box on the middle layer, and its cycle in steps (1/60 s). */
const PETAL_BOX = { x: 590, y: 60, width: 260, height: 330 } as const;
const PETAL_FRAMES = 6;
const PETAL_FALL = 20;
const PETAL_ENTER = 120;
const PETAL_TAIL = 120;
/** Where the gust enters and leaves the middle layer (its width: 1 440 px). */
const PETAL_DRIFT = 852;

/** A stable pseudo-random number in [0, 1): the petals are the same at every generation. */
function hash(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

/** Frame `index` of the gust: frame 0 is the clear still layer, the others the falling petals. */
function petalFrame(index: number) {
  const canvas = new Canvas(PETAL_BOX.width, PETAL_BOX.height);
  if (index > 0) {
    const t = (index - 1) / PETAL_FRAMES;
    for (let petal = 0; petal < 40; petal++) {
      const seed = petal * 11 + 1;
      const startX = hash(seed) * PETAL_BOX.width;
      const startY = hash(seed + 1) * PETAL_BOX.height;
      const fall = 0.7 + hash(seed + 2) * 0.7;
      const sway = 4 + hash(seed + 3) * 10;
      const phase = hash(seed + 4) * Math.PI * 2;
      const size = 3 + (hash(seed + 5) < 0.5 ? 0 : 1);
      const color = 1 + Math.floor(hash(seed + 6) * 5);
      const x = Math.round(
        (startX + Math.sin(phase + t * Math.PI * 2) * sway + 30 * t + PETAL_BOX.width) %
          PETAL_BOX.width,
      );
      const y = Math.round(
        (startY + t * PETAL_BOX.height * fall + PETAL_BOX.height) % PETAL_BOX.height,
      );
      canvas.set(x, y, color);
      canvas.set(x + 1, y, color);
      canvas.set(x + 2, y, color);
      canvas.set(x, y + 1, color);
      canvas.set(x + 1, y + 1, 5);
      canvas.set(x + 2, y + 1, color);
      if (size > 3) {
        canvas.set(x + 1, y - 1, color);
        canvas.set(x + 1, y + 2, color);
      }
    }
  }
  return imageOf(canvas, PETALS);
}

/** The gust: one image gliding across the middle layer, its petals falling as it goes. */
const PETAL_PROP: CodeProp = {
  name: 'petals',
  layer: 'mid',
  rect: PETAL_BOX,
  timeline: [
    [0, PETAL_ENTER],
    ...Array.from({ length: PETAL_FRAMES }, (_, frame) => [frame + 1, PETAL_FALL] as const),
    [0, PETAL_TAIL],
  ],
  frames: Array.from({ length: PETAL_FRAMES + 1 }, (_, frame) => petalFrame(frame)),
  drift: { from: -PETAL_DRIFT, to: PETAL_DRIFT, start: 0, steps: 280 },
  overlay: true,
};

let drawn: CodeStage | undefined;

/** The stage's code layers: blank, since art-src/sakura/ draws all three; the petals over them. */
export function drawSakura(): CodeStage {
  drawn ??= {
    layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') },
    props: [PETAL_PROP],
  };
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
  rgba: true,
};
