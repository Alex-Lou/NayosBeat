import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANCHOR, CELL_SIZE, type Atlas, type Cell } from '../../src/art/types';
import {
  atlasJson,
  cellReader,
  cutOf,
  MARGIN,
  packShelves,
  packStrip,
  PAGE_WIDTH,
  type Indexed,
} from '../../tools/sprites/atlas';
import {
  loadDrawn,
  platinePixels,
  PORTRAIT,
  stripPixels,
  type Drawn,
} from '../../tools/sprites/drawn';
import type { Fighter } from '../../tools/sprites/fighter';
import { cellsOf, TOOL_FIGHTERS } from '../../tools/sprites/fighters';
import { NAYO } from '../../tools/sprites/nayo/index';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { RIFF } from '../../tools/sprites/riff/index';

/** A strip of `frames` full cells, `paint` saying the slot of each pixel of each cell. */
function stripOf(frames: number, paint: (frame: number, x: number, y: number) => number): Indexed {
  const width = frames * CELL_SIZE;
  const pixels = new Uint8Array(width * CELL_SIZE);
  for (let frame = 0; frame < frames; frame++) {
    for (let y = 0; y < CELL_SIZE; y++) {
      for (let x = 0; x < CELL_SIZE; x++) {
        pixels[y * width + frame * CELL_SIZE + x] = paint(frame, x, y);
      }
    }
  }
  return { width, height: CELL_SIZE, pixels };
}

/** Whether two rectangles of an image share a pixel. */
function overlap(a: Atlas['frames'][string]['frame'], b: Atlas['frames'][string]['frame']) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Every fighter the tools know (tools/sprites/fighters.ts), with its committed cells. */
const FIGHTERS = await Promise.all(
  TOOL_FIGHTERS.map(async ({ fighter }) => ({
    name: fighter.name,
    generator: fighter,
    cells: await cellsOf(fighter.name),
  })),
);

/** What the generator reads for each fighter: the images drawn by hand (art-src/), if any. */
const DRAWINGS = new Map<Fighter, ReadonlyMap<string, Drawn>>(
  await Promise.all(
    FIGHTERS.map(async ({ generator }) => [generator, await loadDrawn(generator)] as const),
  ),
);

/** A strip as the generator gets it (`fx/` before effects): drawn by hand, else by the code. */
function asDrawn(fighter: Fighter, strip: string): Indexed | undefined {
  const drawn = DRAWINGS.get(fighter) ?? new Map<string, Drawn>();
  if (!strip.startsWith('fx/')) return stripPixels(fighter, strip, drawn).body;
  const name = strip.slice('fx/'.length);
  if (name in fighter.platine) return platinePixels(fighter, name, drawn).fx;
  return stripPixels(fighter, name, drawn).fx;
}

/**
 * The strips (and effects, `fx/`) drawn by hand for `fighter`; not its portrait, one image shown
 * whole.
 */
function handDrawn(fighter: Fighter): string[] {
  return [...(DRAWINGS.get(fighter) ?? [])].flatMap(([name, { body, fx }]) => {
    if (name === PORTRAIT) return [];
    return [...(body ? [name] : []), ...(fx ? [`fx/${name}`] : [])];
  });
}

/** A strip as committed: its atlas, and its image as read back. */
function committed(fighter: string, colorway: string, strip: string) {
  const file = new URL(`../../src/art/${fighter}/${colorway}/${strip}`, import.meta.url).href;
  const atlas = JSON.parse(readFileSync(new URL(`${file}.json`), 'utf8')) as Atlas;
  return { atlas, png: readFileSync(new URL(`${file}.png`)) };
}

describe('the atlas of a strip', () => {
  it('cuts a frame to what it draws and a margin, inside its cell; one pixel when empty', () => {
    const cell = { width: 100, height: 80 };
    expect(cutOf({ x: 10, y: 20, width: 30, height: 40 }, cell)).toEqual({
      x: 10 - MARGIN,
      y: 20 - MARGIN,
      width: 30 + 2 * MARGIN,
      height: 40 + 2 * MARGIN,
    });
    expect(cutOf({ x: 1, y: 0, width: 99, height: 80 }, cell)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
    expect(cutOf({ x: 0, y: 0, width: 0, height: 0 }, cell)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it('packs the cuts in shelves without overlap, on the smallest image it tries', () => {
    const sizes = [
      { width: 90, height: 160 },
      { width: 120, height: 150 },
      { width: 40, height: 30 },
      { width: 1, height: 1 },
      { width: 200, height: 60 },
    ];
    const { places, width, height } = packShelves(sizes);
    const rects = sizes.map((size, index) => ({
      x: places[index]?.x ?? -1,
      y: places[index]?.y ?? -1,
      w: size.width,
      h: size.height,
    }));
    rects.forEach((rect, index) => {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.w).toBeLessThanOrEqual(width);
      expect(rect.y + rect.h).toBeLessThanOrEqual(height);
      for (const other of rects.slice(index + 1)) expect(overlap(rect, other)).toBe(false);
    });
    const area = sizes.reduce((sum, size) => sum + size.width * size.height, 0);
    // One row would be 451 × 160 = 72 160 px: the shelves do better.
    expect(width * height).toBeLessThan(451 * 160);
    expect(width * height).toBeGreaterThanOrEqual(area);
    expect(width).toBeLessThanOrEqual(PAGE_WIDTH);
    expect(packShelves(sizes)).toEqual({ places, width, height });
  });

  it('keeps every pixel of every frame, in its cell, through the atlas', () => {
    // Three frames of a box at (60, 40), 100 × 150: a block that moves, then nothing.
    const box = { left: 60, top: 40, width: 100, height: 150 };
    const strip = stripOf(3, (frame, x, y) => {
      if (frame === 2) return 0;
      const [dx, dy] = [x - box.left, y - box.top];
      const inside = dx >= 4 + 30 * frame && dx < 60 + 30 * frame && dy >= 10 && dy < 140;
      return inside ? 1 + ((x + y) % 5) : 0;
    });
    const { image, atlas, extents } = packStrip(strip, box, 'test.png');
    expect(extents).toEqual([
      { x: 4, y: 10, width: 56, height: 130 },
      { x: 34, y: 10, width: 56, height: 130 },
      { x: 0, y: 0, width: 0, height: 0 },
    ]);
    expect(atlas.meta).toEqual({ image: 'test.png', size: { w: image.width, h: image.height } });
    expect(atlas.frames['0']).toMatchObject({
      trimmed: true,
      spriteSourceSize: { x: 2, y: 8, w: 60, h: 134 },
      sourceSize: { w: 100, h: 150 },
    });
    const slot = cellReader(image, atlas);
    for (let frame = 0; frame < 3; frame++) {
      for (let y = 0; y < box.height; y++) {
        for (let x = 0; x < box.width; x++) {
          const drawn =
            strip.pixels[(box.top + y) * strip.width + frame * CELL_SIZE + box.left + x];
          if (slot(frame, x, y) !== drawn) throw new Error(`frame ${frame} at ${x}, ${y}`);
        }
      }
    }
    // Far smaller than the three cells side by side.
    expect(image.width * image.height).toBeLessThan(0.6 * 3 * box.width * box.height);
  });

  it('repeats an edge cut short by the cell once beyond it, an empty pixel after', () => {
    // Drawn down to the cell's bottom row: no margin there.
    const box = { left: 100, top: 200, width: 40, height: 56 };
    const strip = stripOf(2, (_, x, y) => (x >= 110 && x < 130 && y >= 230 ? 3 : 0));
    const { image, atlas } = packStrip(strip, box, 'edge.png');
    for (const name of ['0', '1']) {
      const cut = atlas.frames[name];
      if (!cut) throw new Error(`No frame ${name}`);
      expect(cut.spriteSourceSize).toEqual({ x: 8, y: 28, w: 24, h: 28 });
      const below = (cut.frame.y + cut.frame.h) * image.width + cut.frame.x;
      // The bottom row again, then nothing: what the edge of the strip's image did.
      expect([...image.pixels.subarray(below, below + cut.frame.w)]).toEqual([
        ...image.pixels.subarray(below - image.width, below - image.width + cut.frame.w),
      ]);
      expect(image.pixels[below + 2]).toBe(3);
      const after = below + image.width;
      if (after < image.pixels.length) expect(image.pixels[after + 2]).toBe(0);
    }
  });

  it('writes the hash format, frames named by their index', () => {
    const box = { left: 0, top: 0, width: 8, height: 8 };
    const { atlas } = packStrip(
      stripOf(2, (_, x, y) => (x > 2 && x < 5 && y > 2 && y < 5 ? 1 : 0)),
      box,
      'tiny.png',
    );
    const json = atlasJson(atlas);
    expect(JSON.parse(json)).toEqual(atlas);
    expect(Object.keys(atlas.frames)).toEqual(['0', '1']);
    expect(json).toContain('"spriteSourceSize": { "x": 1, "y": 1, "w": 6, "h": 6 },');
  });
});

describe('the committed atlases (npm run sprites)', () => {
  it.each(FIGHTERS)(
    '$name: one cut per frame, inside its cell and its image, packed without overlap',
    ({ name, cells }) => {
      for (const [strip, cell] of Object.entries<Cell>(cells)) {
        const { atlas, png } = committed(name, 'main', strip);
        const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
        expect(atlas.meta.size, strip).toEqual({ w: view.getUint32(16), h: view.getUint32(20) });
        expect(atlas.meta.size.w, strip).toBeLessThanOrEqual(PAGE_WIDTH);
        const frames = Object.values(atlas.frames);
        expect(frames.length, strip).toBe(cell.frames?.length);
        frames.forEach((frame, index) => {
          const extent = cell.frames?.[index] ?? { x: 0, y: 0, width: 0, height: 0 };
          const cut = cutOf(extent, cell);
          expect(frame.sourceSize).toEqual({ w: cell.width, h: cell.height });
          expect(frame.spriteSourceSize, `${strip} ${index}`).toEqual({
            x: cut.x,
            y: cut.y,
            w: cut.width,
            h: cut.height,
          });
          expect([frame.frame.w, frame.frame.h]).toEqual([cut.width, cut.height]);
          expect(frame.frame.x + frame.frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
          expect(frame.frame.y + frame.frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
          for (const other of frames.slice(index + 1)) {
            expect(overlap(frame.frame, other.frame), `${strip} ${index}`).toBe(false);
          }
        });
        // The second colorway is the same drawing in other colors: the same atlas.
        expect(committed(name, 'alt', strip).atlas, strip).toEqual(atlas);
      }
    },
  );

  // A few strips drawn again, and every one drawn by hand: the atlas holds every pixel of every
  // cell as drawn, and effects that draw nothing are not committed at all.
  const SAMPLE: readonly (readonly [Fighter, string])[] = [
    [NAYO, 'idle'],
    [NAYO, 'ko'],
    [NAYO, 'projectile'],
    [NAYO, 'fx/special'],
    [NAYO, 'fx/super'],
    [NAYO, 'fx/specialBoost'],
    [RIFF, 'idle'],
    [RIFF, 'fx/specialAntiAir'],
    // The idle has no effects (unless drawn with some): as a strip drawn without its effects,
    // which any of the above may be once drawn by hand (tools/sprites/drawn.ts).
    [NAYO, 'fx/idle'],
  ];
  const byHand = FIGHTERS.map(({ generator }) => generator).flatMap((fighter) =>
    handDrawn(fighter).map((strip) => [fighter, strip] as const),
  );
  // Once each: a strip of the sample may be drawn by hand.
  const REDRAWN = new Map(
    [...SAMPLE, ...byHand].map((pair) => [`${pair[0].name} ${pair[1]}`, pair] as const),
  );

  it.each([...REDRAWN].map(([name, [fighter, strip]]) => [name, fighter, strip] as const))(
    '%s: its atlas gives back the strip as drawn, cell by cell (nothing when it draws nothing)',
    async (_, fighter, strip) => {
      const drawn = asDrawn(fighter, strip);
      const cells = FIGHTERS.find(({ generator }) => generator === fighter)?.cells ?? {};
      if (!drawn) {
        // No cell, no image, no atlas: a stale one would show effects no longer drawn.
        expect(cells[strip], strip).toBeUndefined();
        for (const colorway of ['main', 'alt']) {
          for (const ext of ['png', 'json']) {
            const file = `${fighter.name}/${colorway}/${strip}.${ext}`;
            const url = new URL(`../../src/art/${file}`, import.meta.url);
            expect(() => readFileSync(url), file).toThrow(/ENOENT/);
          }
        }
        return;
      }
      const cell = cells[strip];
      if (!cell) throw new Error(`No cell ${strip}`);
      const { atlas, png } = committed(fighter.name, 'main', strip);
      const slot = cellReader(await decodeIndexedPng(png), atlas);
      const [left, top] = [ANCHOR.x - cell.anchor.x, ANCHOR.y - cell.anchor.y];
      let wrong = 0;
      for (let frame = 0; frame < drawn.width / CELL_SIZE; frame++) {
        for (let y = 0; y < CELL_SIZE; y++) {
          for (let x = 0; x < CELL_SIZE; x++) {
            const ink = drawn.pixels[y * drawn.width + frame * CELL_SIZE + x] ?? 0;
            const [cx, cy] = [x - left, y - top];
            const inCell = cx >= 0 && cy >= 0 && cx < cell.width && cy < cell.height;
            if ((inCell ? slot(frame, cx, cy) : 0) !== ink) wrong++;
          }
        }
      }
      expect(wrong).toBe(0);
    },
  );
});
