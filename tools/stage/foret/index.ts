/**
 * Dancing Forest (docs/art/decor-forest-dance.md): the developer's background (issue #155), the
 * shrine in the forest, its red bridge and waterfall, and the dirt clearing. All three layers are
 * truecolor PNGs drawn by hand, in art-src/foret/; `npm run stages` copies them as they are
 * (`rgba`, tools/sprites/stage-drawn.ts), so the illustration keeps every color. The code's layers
 * are only a blank fallback: the stage has no code drawing of its own. The code adds the leaves
 * that fall across the clearing, laid over the hand-drawn scene.
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

/** The leaves: the clear slot first, then the forest's yellows, greens and browns. */
const LEAVES: readonly Rgba[] = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 220, g: 230, b: 110, a: 255 },
  { r: 160, g: 190, b: 70, a: 255 },
  { r: 220, g: 160, b: 60, a: 255 },
  { r: 180, g: 110, b: 45, a: 255 },
  { r: 125, g: 75, b: 36, a: 255 },
  { r: 240, g: 220, b: 150, a: 255 },
];

/** The leaf fall's box on the middle layer, and its cycle in steps (1/60 s). */
const LEAF_BOX = { x: 580, y: 40, width: 280, height: 360 } as const;
const LEAF_FRAMES = 6;
const LEAF_FALL = 20;
const LEAF_ENTER = 90;
const LEAF_TAIL = 90;
/** Where the fall enters and leaves the middle layer (its width: 1 440 px). */
const LEAF_DRIFT = 830;

/** A stable pseudo-random number in [0, 1): the leaves are the same at every generation. */
function hash(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

/** A leaf, tumbling: `turn` picks its orientation, `color` its autumn tone. */
function drawLeaf(canvas: Canvas, x: number, y: number, turn: number, color: number): void {
  if (turn === 0) {
    canvas.set(x, y, color);
    canvas.fill(x - 1, y + 1, 3, 2, color);
    canvas.fill(x - 2, y + 3, 5, 2, color);
    canvas.set(x, y + 5, color);
    canvas.set(x, y + 2, 4);
  } else if (turn === 1) {
    canvas.fill(x, y, 2, 4, color);
    canvas.fill(x + 2, y + 1, 2, 3, color);
    canvas.set(x + 2, y + 4, 5);
    canvas.set(x + 1, y + 1, 4);
  } else {
    canvas.fill(x, y, 4, 2, color);
    canvas.fill(x + 2, y + 2, 3, 2, color);
    canvas.set(x + 2, y + 3, 5);
    canvas.set(x + 1, y, 4);
  }
}

/** Frame `index` of the fall: frame 0 is the clear still layer, the others the falling leaves. */
function leafFrame(index: number) {
  const canvas = new Canvas(LEAF_BOX.width, LEAF_BOX.height);
  if (index > 0) {
    const t = (index - 1) / LEAF_FRAMES;
    for (let leaf = 0; leaf < 52; leaf++) {
      const seed = leaf * 13 + 3;
      const startX = hash(seed) * LEAF_BOX.width;
      const startY = hash(seed + 1) * LEAF_BOX.height;
      const fall = 0.55 + hash(seed + 2) * 0.75;
      const sway = 6 + hash(seed + 3) * 14;
      const phase = hash(seed + 4) * Math.PI * 2;
      const turn = Math.floor(hash(seed + 5) * 3);
      const color = 1 + Math.floor(hash(seed + 6) * 6);
      const x =
        4 +
        Math.round(
          (startX + Math.sin(phase + t * Math.PI * 2) * sway + 18 * t + LEAF_BOX.width) %
            (LEAF_BOX.width - 8),
        );
      const y =
        6 +
        Math.round(
          (startY + t * LEAF_BOX.height * fall + LEAF_BOX.height) % (LEAF_BOX.height - 12),
        );
      drawLeaf(canvas, x, y, turn, color);
    }
  }
  return imageOf(canvas, LEAVES);
}

/** The fall: one image gliding across the middle layer, its leaves falling as it goes. */
const LEAF_PROP: CodeProp = {
  name: 'leaves',
  layer: 'mid',
  rect: LEAF_BOX,
  timeline: [
    [0, LEAF_ENTER],
    ...Array.from({ length: LEAF_FRAMES }, (_, frame) => [frame + 1, LEAF_FALL] as const),
    [0, LEAF_TAIL],
  ],
  frames: Array.from({ length: LEAF_FRAMES + 1 }, (_, frame) => leafFrame(frame)),
  drift: { from: -LEAF_DRIFT, to: LEAF_DRIFT, start: 0, steps: 280 },
  overlay: true,
};

let drawn: CodeStage | undefined;

/** The stage's code layers: blank, since art-src/foret/ draws all three; the leaves over them. */
export function drawForet(): CodeStage {
  drawn ??= {
    layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') },
    props: [LEAF_PROP],
  };
  return drawn;
}

/**
 * The stage, for the tools: its folder, its drawing, its atmospheres. One atmosphere, the art's
 * own: the illustration is a single morning, and its palette is the images' own.
 */
export const FORET: CodeMap = {
  name: 'foret',
  draw: drawForet,
  atmospheres: [{ atmosphere: { moment: 'dawn', weather: 'clear' }, palette: [BLANK] }],
  rgba: true,
};
