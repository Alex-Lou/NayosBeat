import { describe, expect, it } from 'vitest';
import { ANCHOR, CELL_SIZE } from '../../src/art/types';
import { toLab } from '../../tools/stage/kit/unify';
import type { Bitmap } from '../../tools/roto/pixels';
import { bitmap } from '../../tools/roto/pixels';
import { PIXELIZE_DEFAULTS, pixelize } from '../../tools/roto/pixelize';
import {
  placeOnCell,
  PLACEMENT_DEFAULTS,
  PORTRAIT_SIZE,
  PORTRAIT_DEFAULTS,
} from '../../tools/roto/place';
import { PORTRAIT_SIZE as PIPELINE_PORTRAIT_SIZE } from '../../tools/sprites/drawn';
import type { Corners } from '../../tools/roto/silhouette';
import {
  crownOf,
  edgesOf,
  SILHOUETTE_DEFAULTS,
  silhouetteOf,
  soleOf,
  tidyEdges,
} from '../../tools/roto/silhouette';
import { anchorIsAGuess, concernsOf } from '../../tools/roto/concerns';

/** A flat background with shapes painted on it, the way a studio photo looks to the tool. */
function scene(
  width: number,
  height: number,
  background: readonly [number, number, number],
  paint: (set: (x: number, y: number, color: readonly [number, number, number]) => void) => void,
): Bitmap {
  const image = bitmap(width, height);
  const set = (x: number, y: number, color: readonly [number, number, number]) => {
    const at = (y * width + x) * 4;
    image.data[at] = color[0];
    image.data[at + 1] = color[1];
    image.data[at + 2] = color[2];
    image.data[at + 3] = 255;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) set(x, y, background);
  paint(set);
  return image;
}

const SUBJECT = [30, 40, 60] as const;
const WALL = [200, 196, 190] as const;

/** A 20 × 50 subject standing in a 100 × 80 frame, its feet on row 59. */
function standing(): Bitmap {
  return scene(100, 80, WALL, (set) => {
    for (let y = 10; y <= 59; y++) for (let x = 20; x <= 39; x++) set(x, y, SUBJECT);
  });
}

function found(image: Bitmap) {
  return silhouetteOf(image, SILHOUETTE_DEFAULTS, toLab);
}

describe('silhouette', () => {
  it('keys a plain background out and keeps the subject whole', () => {
    const mask = found(standing());
    expect(mask.from).toBe('key');
    expect(mask.box).toEqual({ left: 20, top: 10, right: 39, bottom: 59 });
    expect(mask.pixels).toBe(20 * 50);
    expect(mask.islands).toBe(1);
  });

  it('reads the alpha channel when the image carries one', () => {
    const image = standing();
    for (let pixel = 0; pixel < image.width * image.height; pixel++) {
      const x = pixel % image.width;
      const y = (pixel - x) / image.width;
      const inside = x >= 20 && x <= 39 && y >= 10 && y <= 59;
      image.data[pixel * 4 + 3] = inside ? 255 : 0;
    }
    const mask = found(image);
    expect(mask.from).toBe('alpha');
    expect(mask.box).toEqual({ left: 20, top: 10, right: 39, bottom: 59 });
  });

  it('keeps a hole the background colour never reaches', () => {
    const image = scene(100, 80, WALL, (set) => {
      for (let y = 10; y <= 59; y++) for (let x = 20; x <= 39; x++) set(x, y, SUBJECT);
      // A window of wall colour, walled in by the subject: the fill cannot get to it.
      for (let y = 25; y <= 30; y++) for (let x = 26; x <= 31; x++) set(x, y, WALL);
    });
    const mask = found(image);
    expect(mask.pixels).toBe(20 * 50);
    expect(mask.on[27 * 100 + 28]).toBe(1);
  });

  it('drops a speck far from the subject', () => {
    const image = scene(100, 80, WALL, (set) => {
      for (let y = 10; y <= 59; y++) for (let x = 20; x <= 39; x++) set(x, y, SUBJECT);
      // Three pixels across, so the tidy pass leaves it and despeckling is what drops it.
      for (let y = 69; y <= 71; y++) for (let x = 79; x <= 81; x++) set(x, y, SUBJECT);
    });
    const mask = found(image);
    expect(mask.specks).toBe(1);
    expect(mask.islands).toBe(1);
    expect(mask.on[70 * 100 + 80]).toBe(0);
  });

  it('rubs a single-pixel fringe off the edge, and leaves real shapes', () => {
    const on = new Uint8Array(9 * 9);
    const at = (x: number, y: number) => y * 9 + x;
    // A 5 x 5 block with one pixel sticking out and one pinhole bitten into it.
    for (let y = 2; y <= 6; y++) for (let x = 2; x <= 6; x++) on[at(x, y)] = 1;
    on[at(7, 4)] = 1;
    on[at(4, 2)] = 0;
    tidyEdges(9, 9, on);
    expect(on[at(7, 4)]).toBe(0);
    expect(on[at(4, 2)]).toBe(1);
    expect(on[at(4, 4)]).toBe(1);
  });

  it('says which edges of the frame the subject runs into', () => {
    expect(edgesOf(found(standing()))).toEqual({
      left: false,
      top: false,
      right: false,
      bottom: false,
    });
    // Against the left edge, with every corner still on the wall.
    const leaning = scene(100, 80, WALL, (set) => {
      for (let y = 10; y <= 59; y++) for (let x = 0; x <= 39; x++) set(x, y, SUBJECT);
    });
    expect(edgesOf(found(leaning))).toMatchObject({ left: true, right: false, bottom: false });
  });

  it('starts only from the corners it is given', () => {
    // A dark subject wearing a dark band across the bottom: both bottom corners sit on it, agree
    // with each other, and seeding there floods the whole subject. Untick them and it is kept.
    const dressed = scene(100, 80, WALL, (set) => {
      for (let y = 20; y <= 55; y++) for (let x = 30; x <= 69; x++) set(x, y, SUBJECT);
      for (let y = 56; y <= 79; y++) for (let x = 0; x <= 99; x++) set(x, y, SUBJECT);
    });
    const withEvery = silhouetteOf(dressed, SILHOUETTE_DEFAULTS, toLab);
    expect(withEvery.pixels).toBeLessThan(1000);
    const topOnly: Corners = {
      topLeft: true,
      topRight: true,
      bottomLeft: false,
      bottomRight: false,
    };
    const kept = silhouetteOf(dressed, { ...SILHOUETTE_DEFAULTS, corners: topOnly }, toLab);
    expect(kept.seeds).toBe(2);
    expect(kept.pixels).toBe(40 * 36 + 100 * 24);
  });

  it('ignores a corner standing on the subject instead of flooding the subject', () => {
    // The subject runs into the bottom left corner: seeding there would key the subject out.
    const corner = scene(100, 60, WALL, (set) => {
      for (let y = 10; y <= 59; y++) for (let x = 0; x <= 39; x++) set(x, y, SUBJECT);
    });
    const mask = found(corner);
    expect(mask.dropped).toBe(1);
    expect(mask.seeds).toBe(3);
    expect(mask.pixels).toBe(40 * 50);
    expect(
      concernsOf(mask, soleOf(mask), { left: 0, top: 0, right: 0, bottom: 0 }).map((c) => c.kind),
    ).toContain('corner-dropped');
  });

  it('does not leak into a subject that touches the bottom edge', () => {
    const image = scene(100, 60, WALL, (set) => {
      for (let y = 10; y <= 59; y++) for (let x = 20; x <= 39; x++) set(x, y, SUBJECT);
    });
    const mask = found(image);
    expect(mask.box.bottom).toBe(59);
    expect(mask.pixels).toBe(20 * 50);
  });

  it('puts the sole at the middle of the lowest band, and says how wide it is', () => {
    const sole = soleOf(found(standing()));
    expect(sole.y).toBe(59);
    expect(sole.x).toBeCloseTo(29.5, 1);
    expect(sole.width).toBe(20);
  });
});

describe('concerns', () => {
  const noOverflow = { left: 0, top: 0, right: 0, bottom: 0 };

  it('raises nothing on a subject that stands clear in its frame', () => {
    const mask = found(standing());
    const concerns = concernsOf(mask, soleOf(mask), noOverflow);
    expect(concerns).toEqual([]);
    expect(anchorIsAGuess(concerns)).toBe(false);
  });

  /** A head and a thin neck running down: what a portrait with no feet looks like to the tool. */
  it('says the anchor is a guess when the base is a sliver', () => {
    const image = scene(100, 80, WALL, (set) => {
      for (let y = 10; y <= 45; y++) for (let x = 20; x <= 59; x++) set(x, y, SUBJECT);
      for (let y = 46; y <= 69; y++) for (let x = 38; x <= 41; x++) set(x, y, SUBJECT);
    });
    const mask = found(image);
    const concerns = concernsOf(mask, soleOf(mask), noOverflow);
    expect(concerns.map((concern) => concern.kind)).toContain('narrow-base');
    expect(anchorIsAGuess(concerns)).toBe(true);
  });

  it('says the anchor is a guess when the subject runs off the bottom', () => {
    const image = scene(100, 60, WALL, (set) => {
      for (let y = 10; y <= 59; y++) for (let x = 20; x <= 39; x++) set(x, y, SUBJECT);
    });
    const mask = found(image);
    const concerns = concernsOf(mask, soleOf(mask), noOverflow);
    expect(concerns.map((concern) => concern.kind)).toContain('cut-off');
    expect(anchorIsAGuess(concerns)).toBe(true);
  });

  it('reports a subject that does not fit the cell', () => {
    const mask = found(standing());
    const concerns = concernsOf(mask, soleOf(mask), { left: 0, top: 12, right: 0, bottom: 0 });
    expect(concerns.map((concern) => concern.kind)).toContain('overflow');
  });
});

/** The rows and columns a placed cell actually draws on. */
function drawnBox(cell: Bitmap) {
  let left = cell.width;
  let top = cell.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < cell.height; y++) {
    for (let x = 0; x < cell.width; x++) {
      if ((cell.data[(y * cell.width + x) * 4 + 3] ?? 0) === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return { left, top, right, bottom };
}

describe('placement', () => {
  const place = (height: number, over: Partial<Parameters<typeof placeOnCell>[2]> = {}) => {
    const image = standing();
    return placeOnCell(image, found(image), {
      ...PLACEMENT_DEFAULTS,
      cell: CELL_SIZE,
      height,
      ...over,
    });
  };

  it('stands the feet on the anchor row, centred on the anchor column', () => {
    const box = drawnBox(place(50).cell);
    expect(box.bottom).toBe(ANCHOR.y);
    expect((box.left + box.right) / 2).toBeCloseTo(ANCHOR.x, 0);
  });

  it('draws the subject at the height it was asked for', () => {
    for (const height of [50, 100, 157]) {
      const box = drawnBox(place(height).cell);
      expect(box.bottom - box.top + 1).toBeCloseTo(height, -0.5);
    }
  });

  it('never leaves a half-transparent pixel', () => {
    const { cell } = place(157);
    for (let pixel = 0; pixel < cell.width * cell.height; pixel++) {
      expect([0, 255]).toContain(cell.data[pixel * 4 + 3]);
    }
  });

  it('says how far the subject went past the cell', () => {
    expect(place(50).overflow).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    // Taller than the anchor row is high: the head goes out of the top.
    expect(place(400).overflow.top).toBeGreaterThan(0);
  });

  it('turns a subject over without moving its feet', () => {
    const straight = drawnBox(place(50).cell);
    const turned = drawnBox(place(50, { flip: true }).cell);
    expect(turned.bottom).toBe(straight.bottom);
    expect((turned.left + turned.right) / 2).toBeCloseTo(ANCHOR.x, 0);
  });
});

describe('pixelize', () => {
  const made = (over: Partial<typeof PIXELIZE_DEFAULTS> = {}) => {
    const image = standing();
    const placed = placeOnCell(image, found(image), {
      ...PLACEMENT_DEFAULTS,
      cell: CELL_SIZE,
      height: 157,
    });
    return { placed, out: pixelize(placed.cell, placed.on, { ...PIXELIZE_DEFAULTS, ...over }) };
  };

  it('keeps the palette under the size it was given', () => {
    for (const colors of [4, 8, 32]) {
      expect(made({ colors }).out.colors).toBeLessThanOrEqual(colors);
    }
  });

  it('leaves the empty part of the cell alone', () => {
    const { placed, out } = made();
    for (let pixel = 0; pixel < placed.on.length; pixel++) {
      if ((placed.on[pixel] ?? 0) === 1) continue;
      expect(out.cell.data[pixel * 4 + 3]).toBe(0);
    }
  });

  it('draws a darker edge than the inside', () => {
    const { out } = made({ colors: 0 });
    const box = drawnBox(out.cell);
    const light = (x: number, y: number) => {
      const at = (y * out.cell.width + x) * 4;
      return (out.cell.data[at] ?? 0) + (out.cell.data[at + 1] ?? 0) + (out.cell.data[at + 2] ?? 0);
    };
    const middleY = Math.round((box.top + box.bottom) / 2);
    expect(light(box.left, middleY)).toBeLessThan(light(box.left + 3, middleY));
  });

  it('draws no edge when the outline is turned off', () => {
    const { out } = made({ colors: 0, outline: 1, sharpen: 0, saturation: 1 });
    const box = drawnBox(out.cell);
    const middleY = Math.round((box.top + box.bottom) / 2);
    const at = (x: number) => (middleY * out.cell.width + x) * 4;
    expect(out.cell.data[at(box.left)]).toBe(out.cell.data[at(box.left + 3)]);
  });
});

describe('portrait', () => {
  /** A head of 40 x 36 over a narrow neck running down to the bottom: a bust, as a photo gives one. */
  function bust(): Bitmap {
    return scene(100, 80, WALL, (set) => {
      for (let y = 8; y <= 43; y++) for (let x = 30; x <= 69; x++) set(x, y, SUBJECT);
      for (let y = 44; y <= 79; y++) for (let x = 44; x <= 55; x++) set(x, y, SUBJECT);
    });
  }

  const place = (image: Bitmap, over: Partial<Parameters<typeof placeOnCell>[2]> = {}) =>
    placeOnCell(image, found(image), { ...PORTRAIT_DEFAULTS, ...over });

  it('keeps the size the pipeline asks a portrait for', () => {
    expect(PORTRAIT_SIZE).toBe(PIPELINE_PORTRAIT_SIZE);
    expect(PORTRAIT_DEFAULTS.cell).toBe(PORTRAIT_SIZE);
  });

  it('measures the crown as soleOf measures the feet', () => {
    const crown = crownOf(found(bust()));
    expect(crown.y).toBe(8);
    expect(crown.x).toBeCloseTo(49.5, 0);
  });

  it('centres the head on the square and hangs it under the air', () => {
    const box = drawnBox(place(bust(), { height: 72 }).cell);
    expect((box.left + box.right + 1) / 2).toBeCloseTo(PORTRAIT_SIZE / 2, 0);
    // About 6 % of the square left over the hair.
    expect(box.top).toBeGreaterThanOrEqual(4);
    expect(box.top).toBeLessThanOrEqual(7);
  });

  it('lets the shoulders run off the bottom without calling it a problem', () => {
    const image = bust();
    const mask = found(image);
    const placed = place(image);
    const kinds = concernsOf(mask, soleOf(mask), placed.overflow, 'portrait').map((c) => c.kind);
    expect(kinds).not.toContain('narrow-base');
    expect(kinds).not.toContain('cut-off');
    expect(kinds).not.toContain('overflow');
  });

  it('still says when a side or the top is cut', () => {
    const image = scene(100, 80, WALL, (set) => {
      for (let y = 0; y <= 43; y++) for (let x = 30; x <= 69; x++) set(x, y, SUBJECT);
      for (let y = 44; y <= 79; y++) for (let x = 44; x <= 55; x++) set(x, y, SUBJECT);
    });
    const mask = found(image);
    const kinds = concernsOf(mask, soleOf(mask), place(image).overflow, 'portrait').map(
      (c) => c.kind,
    );
    expect(kinds).toContain('cut-off');
  });

  it('does not underline the square its own border crops', () => {
    const image = bust();
    const placed = place(image);
    const out = pixelize(placed.cell, placed.on, { ...PIXELIZE_DEFAULTS, colors: 0 });
    const row = (y: number, x: number) => {
      const at = (y * out.cell.width + x) * 4;
      return (out.cell.data[at] ?? 0) + (out.cell.data[at + 1] ?? 0) + (out.cell.data[at + 2] ?? 0);
    };
    const box = drawnBox(out.cell);
    const middle = Math.round((box.left + box.right) / 2);
    expect(box.bottom).toBe(PORTRAIT_SIZE - 1);
    // The last row is a crop, not a silhouette: as light as the neck above it.
    expect(row(PORTRAIT_SIZE - 1, middle)).toBe(row(PORTRAIT_SIZE - 4, middle));
  });
});

/**
 * The chain against a sprite it should be able to give back. The fake photo is built here, from a
 * strip the repository already holds, by blowing it up with nearest neighbour onto a lit wall with
 * grain: every source pixel becomes a clean block, so a chain that loses nothing can rebuild the
 * drawing. It is a best case on purpose — the point is to catch the chain losing what *is* there.
 */
describe('fidélité', () => {
  const SCALE = 4;
  const SIDE = CELL_SIZE * SCALE;

  async function strip() {
    const { decodeIndexedPng } = await import('../../tools/sprites/png');
    const { readFile } = await import('node:fs/promises');
    const url = new URL('../../art-src/feline/idle.png', import.meta.url);
    return decodeIndexedPng(await readFile(url));
  }

  /** Frame 1 of the strip, as RGBA on its cell, and the rows it fills. */
  function cellOf(image: { width: number; pixels: Uint8Array; colors: readonly number[] }) {
    const truth = bitmap(CELL_SIZE, CELL_SIZE);
    let top = CELL_SIZE;
    let bottom = -1;
    for (let y = 0; y < CELL_SIZE; y++) {
      for (let x = 0; x < CELL_SIZE; x++) {
        const slot = image.pixels[y * image.width + x] ?? 0;
        if (slot === 0) continue;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        const color = image.colors[slot] ?? 0;
        const at = (y * CELL_SIZE + x) * 4;
        truth.data[at] = (color >> 16) & 0xff;
        truth.data[at + 1] = (color >> 8) & 0xff;
        truth.data[at + 2] = color & 0xff;
        truth.data[at + 3] = 255;
      }
    }
    return { truth, top, bottom };
  }

  /** The strip blown up block by block onto a wall that is lit, graded and grainy. */
  function photographed(truth: Bitmap): Bitmap {
    const photo = bitmap(SIDE, SIDE);
    for (let y = 0; y < SIDE; y++) {
      for (let x = 0; x < SIDE; x++) {
        const from = (Math.floor(y / SCALE) * CELL_SIZE + Math.floor(x / SCALE)) * 4;
        const alpha = (truth.data[from + 3] ?? 0) / 255;
        const grain = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const wall = [
          96 + (y / SIDE) * 28 + grain * 6 + (x / SIDE) * 10,
          92 + (y / SIDE) * 24 + grain * 6,
          104 + (y / SIDE) * 18 + grain * 6 - (x / SIDE) * 8,
        ];
        const at = (y * SIDE + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          photo.data[at + channel] =
            (truth.data[from + channel] ?? 0) * alpha + (wall[channel] ?? 0) * (1 - alpha);
        }
        photo.data[at + 3] = 255;
      }
    }
    return photo;
  }

  function deltaE(truth: Bitmap, made: Bitmap) {
    let sum = 0;
    let both = 0;
    let differ = 0;
    for (let pixel = 0; pixel < CELL_SIZE * CELL_SIZE; pixel++) {
      const at = pixel * 4;
      const left = (truth.data[at + 3] ?? 0) > 127;
      const right = (made.data[at + 3] ?? 0) > 127;
      if (left !== right) differ++;
      if (!left || !right) continue;
      const a = toLab(truth.data[at] ?? 0, truth.data[at + 1] ?? 0, truth.data[at + 2] ?? 0);
      const b = toLab(made.data[at] ?? 0, made.data[at + 1] ?? 0, made.data[at + 2] ?? 0);
      sum += Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
      both++;
    }
    return {
      deltaE: both === 0 ? 0 : sum / both,
      silhouette: (differ / (CELL_SIZE * CELL_SIZE)) * 100,
    };
  }

  /**
   * The anchor's column is a judgement, not a measurement: the strip's own anchor sits 9 px right
   * of where the feet's pixels centre, because the artist anchors on balance, not on mass. No
   * estimate found it (docs/art/roto.md §3), so the test nudges by what the drawing says and
   * scores what is left — which is the chain's own work.
   */
  const ANCHOR_IS_A_JUDGEMENT = -9;

  it('rebuilds a strip it was given back as a photo', async () => {
    const { truth, top, bottom } = cellOf(await strip());
    const photo = photographed(truth);
    const mask = silhouetteOf(photo, SILHOUETTE_DEFAULTS, toLab);
    const placed = placeOnCell(photo, mask, {
      ...PLACEMENT_DEFAULTS,
      cell: CELL_SIZE,
      height: bottom - top + 1,
      nudgeX: ANCHOR_IS_A_JUDGEMENT,
    });
    const made = pixelize(placed.cell, placed.on, PIXELIZE_DEFAULTS);
    const score = deltaE(truth, made.cell);
    // Under 1, two colours are told apart only by a trained eye side by side.
    expect(score.deltaE).toBeLessThan(1);
    expect(score.silhouette).toBeLessThan(1);
  });

  it('loses it when the steps that cost more than they give are turned back on', async () => {
    const { truth, top, bottom } = cellOf(await strip());
    const photo = photographed(truth);
    const mask = silhouetteOf(photo, SILHOUETTE_DEFAULTS, toLab);
    const placed = placeOnCell(photo, mask, {
      ...PLACEMENT_DEFAULTS,
      cell: CELL_SIZE,
      height: bottom - top + 1,
      nudgeX: ANCHOR_IS_A_JUDGEMENT,
      // The box filter the chain used before: every pixel the average of what it covers.
      edge: 0,
    });
    const made = pixelize(placed.cell, placed.on, {
      ...PIXELIZE_DEFAULTS,
      method: 'median',
      sharpen: 0.7,
      saturation: 1.1,
      orphans: 1,
    });
    // Far past a just-noticeable difference: this is what the measurements bought.
    expect(deltaE(truth, made.cell).deltaE).toBeGreaterThan(5);
  });
});
