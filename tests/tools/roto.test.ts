import { describe, expect, it } from 'vitest';
import { ANCHOR, CELL_SIZE } from '../../src/art/types';
import { toLab } from '../../tools/stage/kit/unify';
import type { Bitmap } from '../../tools/roto/pixels';
import { bitmap } from '../../tools/roto/pixels';
import { PIXELIZE_DEFAULTS, pixelize } from '../../tools/roto/pixelize';
import { placeOnCell } from '../../tools/roto/place';
import { SILHOUETTE_DEFAULTS, silhouetteOf, soleOf } from '../../tools/roto/silhouette';

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
      set(80, 70, SUBJECT);
    });
    const mask = found(image);
    expect(mask.specks).toBe(1);
    expect(mask.islands).toBe(1);
    expect(mask.on[70 * 100 + 80]).toBe(0);
  });

  it('does not leak into a subject that touches the bottom edge', () => {
    const image = scene(100, 60, WALL, (set) => {
      for (let y = 10; y <= 59; y++) for (let x = 20; x <= 39; x++) set(x, y, SUBJECT);
    });
    const mask = found(image);
    expect(mask.box.bottom).toBe(59);
    expect(mask.pixels).toBe(20 * 50);
  });

  it('puts the sole at the middle of the lowest band', () => {
    const sole = soleOf(found(standing()));
    expect(sole.y).toBe(59);
    expect(sole.x).toBeCloseTo(29.5, 1);
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
      cell: CELL_SIZE,
      height,
      flip: false,
      nudgeX: 0,
      nudgeY: 0,
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
      cell: CELL_SIZE,
      height: 157,
      flip: false,
      nudgeX: 0,
      nudgeY: 0,
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
