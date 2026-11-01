/**
 * The atlas of a strip (`Atlas`, src/art/types.ts): each frame cut to the box of what it draws,
 * with a margin, and the cuts packed in shelves on one image at most PAGE_WIDTH wide, so the
 * empty corners of the cells take no video memory. Phaser puts each cut back at its place in
 * the cell. Also reads an atlas back, for what measures the strips (tools and tests).
 */

import { CELL_SIZE, type Atlas, type AtlasFrame, type Rect } from '../../src/art/types.ts';

/** Empty pixels kept around what a frame draws, so its outline never touches its cut's edge. */
export const MARGIN = 2;
/** The widest image of an atlas, and the tallest one it may take. */
export const PAGE_WIDTH = 2048;

/** Palette slots of a rectangle of pixels, row by row: 0 is transparent. */
export interface Indexed {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/** The cropped cell of a strip: where it is in each of the full cells the strip is drawn in. */
export interface CellBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

interface Place {
  readonly x: number;
  readonly y: number;
}

/**
 * What each frame of `strip` (a row of full cells, as drawn) draws: the box of its opaque
 * pixels in the cropped cell `box`, 0 by 0 when it draws nothing.
 */
export function extentsOf(strip: Indexed, box: CellBox): Rect[] {
  const frames = strip.width / CELL_SIZE;
  return Array.from({ length: frames }, (_, frame) => {
    let [left, top, right, bottom] = [box.width, box.height, -1, -1];
    for (let y = 0; y < box.height; y++) {
      const row = (box.top + y) * strip.width + frame * CELL_SIZE + box.left;
      for (let x = 0; x < box.width; x++) {
        if (strip.pixels[row + x] === 0) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < 0) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  });
}

/** The cut of a frame in its cell: what it draws and MARGIN around; one pixel when it draws nothing. */
export function cutOf(extent: Rect, cell: Size): Rect {
  if (extent.width === 0 || extent.height === 0) return { x: 0, y: 0, width: 1, height: 1 };
  const x = Math.max(0, extent.x - MARGIN);
  const y = Math.max(0, extent.y - MARGIN);
  const right = Math.min(cell.width, extent.x + extent.width + MARGIN);
  const bottom = Math.min(cell.height, extent.y + extent.height + MARGIN);
  return { x, y, width: right - x, height: bottom - y };
}

interface Sides {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * The sides where a frame draws up to the edge of its cell (1, else 0), its cut short of a
 * margin there (an effect cut off by the 256 px cell). The fight's smoothed filtering samples
 * just past the edge of a cut: the page repeats that edge once beyond it, then leaves a pixel
 * empty before the next cut, so it sees what it saw at the edge of the strip's own image.
 */
function edgesOf(extent: Rect, cell: Size): Sides {
  const drawn = extent.width > 0 && extent.height > 0;
  return {
    left: drawn && extent.x < MARGIN ? 1 : 0,
    top: drawn && extent.y < MARGIN ? 1 : 0,
    right: drawn && extent.x + extent.width > cell.width - MARGIN ? 1 : 0,
    bottom: drawn && extent.y + extent.height > cell.height - MARGIN ? 1 : 0,
  };
}

/** `sizes` placed in shelves `width` wide, tallest first (`order`), and the image they take. */
function shelves(sizes: readonly Size[], order: readonly number[], width: number) {
  const places: Place[] = new Array<Place>(sizes.length);
  let [x, y, row, used] = [0, 0, 0, 0];
  for (const index of order) {
    const size = sizes[index];
    if (!size) continue;
    if (x > 0 && x + size.width > width) [x, y, row] = [0, y + row, 0];
    places[index] = { x, y };
    x += size.width;
    row = Math.max(row, size.height);
    used = Math.max(used, x);
  }
  return { places, width: used, height: y + row };
}

/**
 * Places rectangles side by side in shelves, the tallest first, on the smallest image at most
 * `maxWidth` wide (and as tall, when it can be): every width is tried, the smallest area kept,
 * the squarer of two equal ones.
 */
export function packShelves(
  sizes: readonly Size[],
  maxWidth = PAGE_WIDTH,
): { places: Place[]; width: number; height: number } {
  const height = (index: number): number => sizes[index]?.height ?? 0;
  const order = sizes.map((_, index) => index).sort((a, b) => height(b) - height(a));
  const widest = Math.max(...sizes.map((size) => size.width));
  const total = sizes.reduce((sum, size) => sum + size.width, 0);
  if (widest > maxWidth) throw new Error(`A cut ${widest} px wide is wider than a page`);
  let best = shelves(sizes, order, maxWidth);
  const worse = (a: typeof best, b: typeof best): boolean => {
    const [tallA, tallB] = [a.height > maxWidth, b.height > maxWidth];
    if (tallA !== tallB) return tallA;
    const [areaA, areaB] = [a.width * a.height, b.width * b.height];
    if (areaA !== areaB) return areaA > areaB;
    return Math.max(a.width, a.height) > Math.max(b.width, b.height);
  };
  for (let width = widest; width < Math.min(maxWidth, total); width++) {
    const packed = shelves(sizes, order, width);
    if (worse(best, packed)) best = packed;
  }
  return best;
}

/**
 * The atlas of a strip drawn in full cells (`strip`), cropped to `box`: the image its frames'
 * cuts are packed in, named `image` in the atlas, and what each frame draws.
 */
export function packStrip(
  strip: Indexed,
  box: CellBox,
  image: string,
): { image: Indexed; atlas: Atlas; extents: Rect[] } {
  const extents = extentsOf(strip, box);
  const cuts = extents.map((extent) => ({ cut: cutOf(extent, box), edge: edgesOf(extent, box) }));
  // Room for each cut, and for its edges repeated and the empty pixel after them.
  const page = packShelves(
    cuts.map(({ cut, edge }) => ({
      width: cut.width + 2 * (edge.left + edge.right),
      height: cut.height + 2 * (edge.top + edge.bottom),
    })),
  );
  const pixels = new Uint8Array(page.width * page.height);
  const frames: Record<string, AtlasFrame> = {};
  cuts.forEach(({ cut, edge }, frame) => {
    const place = page.places[frame] ?? { x: 0, y: 0 };
    const at = { x: place.x + 2 * edge.left, y: place.y + 2 * edge.top };
    for (let y = -edge.top; y < cut.height + edge.bottom; y++) {
      const row = Math.min(Math.max(y, 0), cut.height - 1);
      const from = (box.top + cut.y + row) * strip.width + frame * CELL_SIZE + box.left + cut.x;
      const to = (at.y + y) * page.width + at.x;
      pixels.set(strip.pixels.subarray(from, from + cut.width), to);
      if (edge.left) pixels[to - 1] = strip.pixels[from] ?? 0;
      if (edge.right) pixels[to + cut.width] = strip.pixels[from + cut.width - 1] ?? 0;
    }
    frames[String(frame)] = {
      frame: { x: at.x, y: at.y, w: cut.width, h: cut.height },
      trimmed: true,
      spriteSourceSize: { x: cut.x, y: cut.y, w: cut.width, h: cut.height },
      sourceSize: { w: box.width, h: box.height },
    };
  });
  return {
    image: { width: page.width, height: page.height, pixels },
    atlas: { frames, meta: { image, size: { w: page.width, h: page.height } } },
    extents,
  };
}

/** An atlas as a JSON file, formatted the way Prettier would. */
export function atlasJson(atlas: Atlas): string {
  const rect = (r: { x?: number; y?: number; w: number; h: number }): string =>
    `{ ${Object.entries(r)
      .map(([key, value]) => `"${key}": ${String(value)}`)
      .join(', ')} }`;
  const frames = Object.entries(atlas.frames).map(([name, frame]) =>
    [
      `    "${name}": {`,
      `      "frame": ${rect(frame.frame)},`,
      `      "trimmed": ${String(frame.trimmed)},`,
      `      "spriteSourceSize": ${rect(frame.spriteSourceSize)},`,
      `      "sourceSize": ${rect(frame.sourceSize)}`,
      '    }',
    ].join('\n'),
  );
  const { image, size } = atlas.meta;
  return [
    '{',
    '  "frames": {',
    frames.join(',\n'),
    '  },',
    `  "meta": { "image": "${image}", "size": ${rect(size)} }`,
    '}',
    '',
  ].join('\n');
}

/**
 * Reads the cells of a strip saved as an atlas: the palette slot of pixel `x`, `y` of the cell
 * of `frame` (0, transparent, outside its cut).
 */
export function cellReader(
  image: Indexed,
  atlas: Atlas,
): (frame: number, x: number, y: number) => number {
  return (frame, x, y) => {
    const cut = atlas.frames[String(frame)];
    if (!cut) return 0;
    const column = x - cut.spriteSourceSize.x;
    const row = y - cut.spriteSourceSize.y;
    if (column < 0 || row < 0 || column >= cut.frame.w || row >= cut.frame.h) return 0;
    return image.pixels[(cut.frame.y + row) * image.width + cut.frame.x + column] ?? 0;
  };
}
