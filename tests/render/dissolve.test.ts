import { describe, expect, it } from 'vitest';
import {
  DISSOLVE_FRAMES,
  dissolveStyleOf,
  noiseAt,
  paintGhost,
  RIM,
  vanishing,
  wholeCell,
  type Cut,
  type DissolveStyle,
  type Pixels,
} from '../../src/render/dissolve';
import { relativeLuminance } from '../../src/render/luminance';

const WIDTH = 40;
const HEIGHT = 30;
const PLATINE = [0xf2, 0xf6, 0xff] as const;
const CYAN = 0x30e8ff;

/** A frame painted where `at` says, in platine. */
function frame(at: (x: number, y: number) => boolean): Pixels {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (!at(x, y)) continue;
      const p = (y * WIDTH + x) * 4;
      data.set([...PLATINE, 255], p);
    }
  }
  return { width: WIDTH, height: HEIGHT, data };
}

function blank(margin = 0): Pixels {
  const width = WIDTH + 2 * margin;
  const height = HEIGHT + 2 * margin;
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

/** A ring standing on the floor, as the Mégabasse's. */
const RING = frame((x, y) => Math.abs(Math.hypot(x - 10, (y - 29) / 2) - 15) < 2);

/** The ghost of whole cells of WIDTH by HEIGHT. */
function ghostOf(from: Pixels, to: Pixels | null, style: DissolveStyle, anchorX: number) {
  const cell = { width: WIDTH, height: HEIGHT };
  return vanishing(wholeCell(from), to && wholeCell(to), cell, style, anchorX);
}

/** The rectangle of `pixels` from `x`, `y` on, `width` by `height`: what an atlas keeps of it. */
function cut(pixels: Pixels, x: number, y: number, width: number, height: number): Cut {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const from = ((y + row) * pixels.width + x) * 4;
    data.set(pixels.data.subarray(from, from + width * 4), row * width * 4);
  }
  return { pixels: { width, height, data }, x, y };
}

describe('the dissolve of a big effect (docs/art/dissolution.md)', () => {
  it('dissolves what the next frame no longer shows, all of it when nothing follows', () => {
    const left = frame((x) => x < 20);
    const all = frame(() => true);
    expect(ghostOf(all, null, 'rise', 10).count).toBe(WIDTH * HEIGHT);
    // The left half stays on: only the right half goes.
    const ghost = ghostOf(all, left, 'rise', 10);
    expect(ghost.count).toBe((WIDTH * HEIGHT) / 2);
    for (let k = 0; k < ghost.count; k++) expect(ghost.xs[k]).toBeGreaterThanOrEqual(20);
    for (const end of ghost.ends) {
      expect(end).toBeGreaterThan(0);
      expect(end).toBeLessThanOrEqual(1);
    }
  });

  it('dissolves a frame cut out of its cell (an atlas) as its whole cell, at the same places', () => {
    // Drawn in x 6 to 29, y 8 to 25, then in x 18 to 39, y 10 to 19: each cut with 2 px around.
    const before = frame((x, y) => x >= 6 && x < 30 && y >= 8 && y < 26 && (x + y) % 3 !== 0);
    const after = frame((x, y) => x >= 18 && y >= 10 && y < 20);
    const [from, to] = [cut(before, 4, 6, 28, 22), cut(after, 16, 8, 24, 14)];
    const cell = { width: WIDTH, height: HEIGHT };
    for (const style of ['rise', 'scatter'] as const) {
      expect(vanishing(from, null, cell, style, 10)).toEqual(ghostOf(before, null, style, 10));
      expect(vanishing(from, to, cell, style, 10)).toEqual(ghostOf(before, after, style, 10));
    }
    const ghost = ghostOf(before, after, 'rise', 10);
    expect(ghost.count).toBeGreaterThan(0);
    expect(ghost.count).toBeLessThan(ghostOf(before, null, 'rise', 10).count);
  });

  it('goes a world pixel at a time, the same way every time', () => {
    expect(noiseAt(4, 6)).toBe(noiseAt(5, 7));
    expect(noiseAt(4, 6)).not.toBe(noiseAt(6, 6));
    for (let i = 0; i < 200; i++) {
      const n = noiseAt(i * 7, i * 3);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
    expect(ghostOf(RING, null, 'scatter', 10)).toEqual(ghostOf(RING, null, 'scatter', 10));
  });

  it('lets the top of a rising effect go first, the far ends of a scattering one', () => {
    const all = frame(() => true);
    const mean = (pick: (x: number, y: number) => boolean, style: 'rise' | 'scatter') => {
      const ghost = ghostOf(all, null, style, 20);
      let sum = 0;
      let count = 0;
      for (let k = 0; k < ghost.count; k++) {
        if (!pick(ghost.xs[k] ?? 0, ghost.ys[k] ?? 0)) continue;
        sum += ghost.ends[k] ?? 0;
        count++;
      }
      return sum / count;
    };
    expect(mean((_, y) => y < 8, 'rise')).toBeLessThan(mean((_, y) => y > 22, 'rise'));
    expect(mean((x) => x < 5 || x > 35, 'scatter')).toBeLessThan(
      mean((x) => x > 15 && x < 25, 'scatter'),
    );
  });

  it('thins out frame by frame to nothing, whole on its first frame', () => {
    const ghost = ghostOf(RING, null, 'rise', 10);
    let before = Infinity;
    for (let age = 0; age <= DISSOLVE_FRAMES; age++) {
      const out = blank(24);
      const painted = paintGhost(
        ghost,
        age / DISSOLVE_FRAMES,
        'rise',
        CYAN,
        false,
        out,
        24,
        24,
        10,
      );
      if (age === 0) expect(painted).toBe(ghost.count);
      expect(painted).toBeLessThanOrEqual(before);
      before = painted;
    }
    expect(before).toBe(0);
  });

  it('burns its rim in the energy, never lighter than the pixel it eats: no flash', () => {
    const ghost = ghostOf(RING, null, 'rise', 10);
    const source = relativeLuminance((PLATINE[0] << 16) | (PLATINE[1] << 8) | PLATINE[2]);
    let rim = 0;
    for (const progress of [0.2, 0.4, 0.6]) {
      const out = blank();
      paintGhost(ghost, progress, 'rise', CYAN, true, out, 0, 0, 10);
      for (let p = 0; p < out.data.length; p += 4) {
        if ((out.data[p + 3] ?? 0) === 0) continue;
        const color =
          ((out.data[p] ?? 0) << 16) | ((out.data[p + 1] ?? 0) << 8) | (out.data[p + 2] ?? 0);
        expect(relativeLuminance(color)).toBeLessThanOrEqual(source);
        if (color !== 0xf2f6ff) rim++;
      }
    }
    expect(rim).toBeGreaterThan(0);
    expect(RIM).toBeLessThan(0.2);
  });

  it('drifts up for Nayo, out along the floor for Riff, nowhere with reduced motion', () => {
    const ghost = ghostOf(RING, null, 'rise', 10);
    const centroid = (style: 'rise' | 'scatter', still: boolean) => {
      const out = blank(24);
      paintGhost(ghost, 0.6, style, CYAN, still, out, 24, 24, 10);
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let y = 0; y < out.height; y++) {
        for (let x = 0; x < out.width; x++) {
          if ((out.data[(y * out.width + x) * 4 + 3] ?? 0) === 0) continue;
          sx += x;
          sy += y;
          n++;
        }
      }
      return { x: sx / n, y: sy / n, n };
    };
    const still = centroid('rise', true);
    expect(centroid('rise', false).y).toBeLessThan(still.y - 1);
    // Out from the anchor (x 10): the far side of the ring moves farther right.
    expect(centroid('scatter', false).x).toBeGreaterThan(centroid('scatter', true).x + 1);
    // Still: every pixel painted is one of the ring's, where it was.
    const out = blank(24);
    paintGhost(ghost, 0.5, 'rise', CYAN, true, out, 24, 24, 10);
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        if ((out.data[(y * out.width + x) * 4 + 3] ?? 0) === 0) continue;
        expect(RING.data[((y - 24) * WIDTH + (x - 24)) * 4 + 3]).toBe(255);
      }
    }
  });

  it('drifts each world pixel whole: its 2 by 2 sprite pixels stay together', () => {
    for (const [left, top] of [
      [12, 8],
      [20, 14],
      [30, 22],
    ] as const) {
      const block = frame((x, y) => x >= left && x < left + 2 && y >= top && y < top + 2);
      const ghost = ghostOf(block, null, 'rise', 10);
      for (const progress of [0.1, 0.3, 0.5]) {
        const out = blank(24);
        if (paintGhost(ghost, progress, 'rise', CYAN, false, out, 24, 24, 10) === 0) continue;
        const painted: [number, number][] = [];
        for (let y = 0; y < out.height; y++) {
          for (let x = 0; x < out.width; x++) {
            if ((out.data[(y * out.width + x) * 4 + 3] ?? 0) > 0) painted.push([x, y]);
          }
        }
        const xs = painted.map(([x]) => x);
        const ys = painted.map(([, y]) => y);
        expect(painted).toHaveLength(4);
        expect(Math.max(...xs) - Math.min(...xs)).toBe(1);
        expect(Math.max(...ys) - Math.min(...ys)).toBe(1);
      }
    }
  });

  it("dissolves Nayo's sound upward, Riff's shockwave outward", () => {
    expect(dissolveStyleOf('slash')).toBe('rise');
    expect(dissolveStyleOf('claw')).toBe('scatter');
  });
});
