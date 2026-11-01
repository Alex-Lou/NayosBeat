/**
 * The stage's props (src/art/stage-layers.ts `StageProp`, docs/art/decor-rue.md §6): the code's
 * animations cut to what each frame changes from the still layer, packed in one sheet
 * (src/art/<stage>/props.png) and listed in a module (props.ts). A layer drawn by hand keeps a
 * prop only where it still draws what the code drew under it: elsewhere the prop would paint the
 * code's pixels over the drawing, so it is left out, and said so.
 */

import { format, resolveConfig } from 'prettier';
import type { StageLayer, StageProp, StagePropFrame } from '../../src/art/stage-layers.ts';
import type { CodeProp } from '../stage/rue/index.ts';
import { rgbaAt } from './colors.ts';
import type { IndexedImage } from './png.ts';

/** Widest the props' sheet grows before starting a new shelf. */
const SHEET_WIDTH = 1024;

/** A frame cut out: its pixels (an index into `colors`, 0 transparent) over its box. */
interface Cutout {
  readonly box: { x: number; y: number; width: number; height: number };
  readonly pixels: Uint8Array;
}

export interface PackedProps {
  readonly props: readonly StageProp[];
  /** The sheet, in the code's palette (`colors`), or undefined when no prop is left. */
  readonly sheet: IndexedImage | undefined;
  /** What was left out, and why. */
  readonly dropped: readonly string[];
}

function sameColor(a: IndexedImage, aSlot: number, b: IndexedImage, bSlot: number): boolean {
  const ca = rgbaAt(a, aSlot);
  const cb = rgbaAt(b, bSlot);
  if (ca.a === 0 || cb.a === 0) return ca.a === cb.a;
  return ca.r === cb.r && ca.g === cb.g && ca.b === cb.b;
}

/**
 * The pixels of the prop's rectangle that some frame changes: where it moves. Throws if a frame
 * would have to clear a pixel the still layer draws (an overlay can only add pixels).
 */
function movingOf(prop: CodeProp): Uint8Array {
  const [still] = prop.frames;
  if (!still) throw new Error(`Stage prop ${prop.name}: no frame`);
  const moving = new Uint8Array(still.width * still.height);
  prop.frames.forEach((frame, index) => {
    frame.pixels.forEach((slot, at) => {
      const base = still.pixels[at] ?? 0;
      if (sameColor(frame, slot, still, base)) return;
      if (rgbaAt(frame, slot).a === 0) {
        const x = at % still.width;
        const y = Math.floor(at / still.width);
        throw new Error(
          `Stage prop ${prop.name}, frame ${index}: pixel ${x},${y} would clear the still layer`,
        );
      }
      moving[at] = 1;
    });
  });
  return moving;
}

/** Whether `layer` (the one installed) draws what the code drew under the prop where it moves. */
function keeps(layer: IndexedImage, prop: CodeProp, moving: Uint8Array): boolean {
  const [still] = prop.frames;
  if (!still) return false;
  for (let at = 0; at < moving.length; at++) {
    if (moving[at] === 0) continue;
    const x = prop.rect.x + (at % still.width);
    const y = prop.rect.y + Math.floor(at / still.width);
    if (x < 0 || y < 0 || x >= layer.width || y >= layer.height) return false;
    if (!sameColor(layer, layer.pixels[y * layer.width + x] ?? 0, still, still.pixels[at] ?? 0)) {
      return false;
    }
  }
  return true;
}

/** Frame `index` of the prop cut to the pixels it changes, in its tightest box; undefined: none. */
function cutoutOf(prop: CodeProp, index: number): Cutout | undefined {
  const [still] = prop.frames;
  const frame = prop.frames[index];
  if (!still || !frame) return undefined;
  const { width, height } = still;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  const changed = (at: number): boolean =>
    !sameColor(frame, frame.pixels[at] ?? 0, still, still.pixels[at] ?? 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!changed(y * width + x)) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return undefined;
  const box = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  const pixels = new Uint8Array(box.width * box.height);
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const at = (top + y) * width + left + x;
      pixels[y * box.width + x] = changed(at) ? (frame.pixels[at] ?? 0) : 0;
    }
  }
  return { box, pixels };
}

/**
 * The props kept over the layers installed, their frames cut out and packed in shelves (the
 * tallest first), in the code's palette.
 */
export function packProps(
  props: readonly CodeProp[],
  installed: Readonly<Record<StageLayer, IndexedImage>>,
): PackedProps {
  const dropped: string[] = [];
  const kept = props.filter((prop) => {
    if (keeps(installed[prop.layer], prop, movingOf(prop))) return true;
    dropped.push(`${prop.name}: the ${prop.layer} layer drawn by hand differs under it`);
    return false;
  });
  const cutouts = kept.flatMap((prop) =>
    prop.frames.map((_, index) => ({ prop, index, cutout: cutoutOf(prop, index) })),
  );
  const placed = new Map<string, { sheetX: number; sheetY: number }>();
  let shelfX = 0;
  let shelfY = 0;
  let shelfHeight = 0;
  let sheetWidth = 0;
  const order = cutouts
    .filter(({ cutout }) => cutout !== undefined)
    .sort((a, b) => (b.cutout?.box.height ?? 0) - (a.cutout?.box.height ?? 0));
  for (const { prop, index, cutout } of order) {
    if (!cutout) continue;
    if (shelfX + cutout.box.width > SHEET_WIDTH) {
      shelfX = 0;
      shelfY += shelfHeight + 1;
      shelfHeight = 0;
    }
    placed.set(`${prop.name}/${index}`, { sheetX: shelfX, sheetY: shelfY });
    shelfX += cutout.box.width + 1;
    sheetWidth = Math.max(sheetWidth, shelfX);
    shelfHeight = Math.max(shelfHeight, cutout.box.height);
  }
  const sheetHeight = shelfY + shelfHeight;
  const first = kept[0]?.frames[0];
  if (!first || placed.size === 0) return { props: [], sheet: undefined, dropped };
  const pixels = new Uint8Array(sheetWidth * sheetHeight);
  const stageProps = kept.map((prop): StageProp => {
    const frames = prop.frames.map((_, index): StagePropFrame | null => {
      const found = cutouts.find((each) => each.prop === prop && each.index === index)?.cutout;
      const where = placed.get(`${prop.name}/${index}`);
      if (!found || !where) return null;
      const { box } = found;
      for (let y = 0; y < box.height; y++) {
        const row = (where.sheetY + y) * sheetWidth + where.sheetX;
        pixels.set(found.pixels.subarray(y * box.width, (y + 1) * box.width), row);
      }
      return {
        x: prop.rect.x + box.x,
        y: prop.rect.y + box.y,
        width: box.width,
        height: box.height,
        ...where,
      };
    });
    return { name: prop.name, layer: prop.layer, frames, timeline: prop.timeline };
  });
  return {
    props: stageProps,
    sheet: {
      width: sheetWidth,
      height: sheetHeight,
      pixels,
      colors: first.colors,
      alpha: first.alpha,
    },
    dropped,
  };
}

/** The props as a TypeScript module, formatted by Prettier with the repository's settings. */
export async function propsModule(props: readonly StageProp[], file: URL): Promise<string> {
  const text = [
    '// Generated by `npm run sprites` (tools/sprites/stage-props.ts): do not edit.',
    "import type { StageProp } from '../stage-layers';",
    '',
    '/**',
    " * The stage's animations (docs/art/decor-rue.md §6): each frame where it goes on its layer and",
    ' * where it is in props.png, in image pixels; its timeline in steps of 1/60 s.',
    ' */',
    `export const STAGE_PROPS: readonly StageProp[] = ${JSON.stringify(props)};`,
    '',
  ].join('\n');
  const options = (await resolveConfig(file)) ?? {};
  return format(text, { ...options, parser: 'typescript' });
}
