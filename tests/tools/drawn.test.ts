import { afterEach, describe, expect, it, vi } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { ANCHOR, CELL_SIZE } from '../../src/art/types';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo';
import { cellBoxOf } from '../../tools/sprites/cell';
import { strikeOf } from '../../tools/sprites/clips';
import {
  checkDrawn,
  DrawingProblems,
  loadDrawn,
  reportingDrawingProblems,
  rulesOf,
  unseenStrikes,
} from '../../tools/sprites/drawn';
import { NAYO } from '../../tools/sprites/nayo/index';
import {
  crc32,
  decodeIndexedPng,
  encodeIndexedPng,
  type IndexedImage,
} from '../../tools/sprites/png';
import { drawStrip } from '../../tools/sprites/sheet';

const PALETTE = NAYO.paletteOf('main');
const SLOTS = PALETTE.length;

/** An indexed image as decoded from a file saved with the fighter's main palette. */
function imageOf(
  frames: number,
  draw: (put: (frame: number, x: number, y: number, slot: number) => void) => void,
): IndexedImage {
  const width = CELL_SIZE * frames;
  const pixels = new Uint8Array(width * CELL_SIZE);
  draw((frame, x, y, slot) => {
    pixels[y * width + frame * CELL_SIZE + x] = slot;
  });
  return {
    width,
    height: CELL_SIZE,
    pixels,
    colors: PALETTE.map(({ r, g, b }) => (r << 16) | (g << 8) | b),
    alpha: PALETTE.map(({ a }) => a),
  };
}

/** A column of `slot` standing on the ground line, in the middle of each cell. */
function standing(frames: number, slot = 8): IndexedImage {
  return imageOf(frames, (put) => {
    for (let frame = 0; frame < frames; frame++) {
      for (let y = ANCHOR.y - 80; y <= ANCHOR.y; y++) put(frame, ANCHOR.x, y, slot);
    }
  });
}

describe('PNG decoder', () => {
  /** An indexed PNG whose rows use the PNG filters 0 to 4 in turn, as image editors save them. */
  async function filteredPng(
    width: number,
    rows: readonly (readonly number[])[],
  ): Promise<Uint8Array> {
    const plain = await encodeIndexedPng(
      width,
      rows.length,
      new Uint8Array(rows.flat()),
      PALETTE.slice(0, 16),
    );
    const raw: number[] = [];
    rows.forEach((row, y) => {
      const filter = y % 5;
      const above = rows[y - 1];
      raw.push(filter);
      row.forEach((value, x) => {
        const left = x > 0 ? (row[x - 1] ?? 0) : 0;
        const up = above?.[x] ?? 0;
        const upLeft = x > 0 ? (above?.[x - 1] ?? 0) : 0;
        const estimate = left + up - upLeft;
        const paeth =
          Math.abs(estimate - left) <= Math.abs(estimate - up) &&
          Math.abs(estimate - left) <= Math.abs(estimate - upLeft)
            ? left
            : Math.abs(estimate - up) <= Math.abs(estimate - upLeft)
              ? up
              : upLeft;
        const guess = [0, left, up, Math.floor((left + up) / 2), paeth][filter] ?? 0;
        raw.push((value - guess) & 0xff);
      });
    });
    const stream = new Blob([new Uint8Array(raw)])
      .stream()
      .pipeThrough(new CompressionStream('deflate'));
    const data = new Uint8Array(await new Response(stream).arrayBuffer());
    // Swap the IDAT chunk of the plain file for the filtered one.
    const view = new DataView(plain.buffer, plain.byteOffset);
    const chunks: Uint8Array[] = [plain.subarray(0, 8)];
    for (let offset = 8; offset < plain.length;) {
      const length = view.getUint32(offset);
      const type = new TextDecoder().decode(plain.subarray(offset + 4, offset + 8));
      if (type === 'IDAT') {
        const chunk = new Uint8Array(12 + data.length);
        const out = new DataView(chunk.buffer);
        out.setUint32(0, data.length);
        chunk.set(new TextEncoder().encode('IDAT'), 4);
        chunk.set(data, 8);
        out.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
        chunks.push(chunk);
      } else {
        chunks.push(plain.subarray(offset, offset + 12 + length));
      }
      offset += 12 + length;
    }
    const png = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
    let at = 0;
    for (const chunk of chunks) {
      png.set(chunk, at);
      at += chunk.length;
    }
    return png;
  }

  it('undoes every PNG filter (Aseprite saves filtered rows)', async () => {
    const rows = Array.from({ length: 10 }, (_, y) =>
      Array.from({ length: 7 }, (_, x) => (x * 3 + y * 5) % 16),
    );
    const image = await decodeIndexedPng(await filteredPng(7, rows));
    expect([...image.pixels]).toEqual(rows.flat());
  });

  it('reads back what the encoder writes', async () => {
    const pixels = new Uint8Array([0, 1, 2, 3, 4, 5]);
    const image = await decodeIndexedPng(await encodeIndexedPng(3, 2, pixels, PALETTE.slice(0, 6)));
    expect([...image.pixels]).toEqual([...pixels]);
  });
});

describe('Problems found in drawings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('are shown as they are, without a stack trace, and fail the run', async () => {
    const shown = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const before = process.exitCode;
    try {
      await reportingDrawingProblems(() =>
        Promise.reject(new DrawingProblems('Drawn strips of riff:\n  art-src/riff/idle.png: …')),
      );
      expect(shown).toHaveBeenCalledWith('Drawn strips of riff:\n  art-src/riff/idle.png: …');
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = before;
    }
  });

  it('are the only errors reported so: a bug keeps its stack', async () => {
    const bug = new TypeError('a bug');
    await expect(reportingDrawingProblems(() => Promise.reject(bug))).rejects.toBe(bug);
  });

  it('are what reading wrong drawings throws', async () => {
    await expect(loadDrawn(NAYO, new URL('./fixtures/drawn/', import.meta.url))).rejects.toThrow(
      DrawingProblems,
    );
  });
});

describe('Drawn strips', () => {
  const idle = rulesOf(NAYO, 'idle', 'body');

  it('pass when drawn as the code draws them', async () => {
    const strip = drawStrip(NAYO, 'idle');
    const image = await decodeIndexedPng(
      await encodeIndexedPng(strip.width, strip.height, strip.pixels, PALETTE),
    );
    expect(checkDrawn('idle', image, idle, PALETTE)).toEqual([]);
  });

  it('keep the number of frames of their strip', () => {
    expect(checkDrawn('idle', standing(9), idle, PALETTE)).toEqual([
      'idle: 2304x256 px, expected 2560x256 (10 cells of 256x256 px in a row)',
    ]);
  });

  it('use only the fighter colors, as they are', () => {
    const guide = standing(idle.frames, SLOTS);
    expect(checkDrawn('idle', guide, idle, PALETTE)[0]).toMatch(
      /^idle: frame 1, pixel 128,168: color \d+ is none of the fighter's \d+ \(a guide's\?\)$/,
    );
    const image = standing(idle.frames);
    const recolored = {
      ...image,
      colors: image.colors.map((color, slot) => (slot === 8 ? 0xff00ff : color)),
    };
    expect(checkDrawn('idle', recolored, idle, PALETTE)[0]).toMatch(
      /^idle: frame 1, pixel 128,168: color 8 is #ff00ff in the file, #\w{6} in the fighter's palette/,
    );
  });

  it('stay away from the cell edges and above the ground', () => {
    const image = standing(idle.frames);
    image.pixels[2 * image.width + CELL_SIZE + 100] = 8;
    image.pixels[(ANCHOR.y + 3) * image.width + 2 * CELL_SIZE + 100] = 8;
    expect(checkDrawn('idle', image, idle, PALETTE)).toEqual([
      "idle: frame 2 comes 2 px from the cell's edge (4 at least)",
      'idle: frame 3 draws under the ground, down to row 251 (250 at most)',
    ]);
  });

  it('stand on the ground where the code does, and draw every frame', () => {
    const image = imageOf(idle.frames, (put) => {
      for (let frame = 1; frame < idle.frames; frame++)
        put(frame, ANCHOR.x, ANCHOR.y - (frame === 1 ? 10 : 0), 8);
    });
    expect(checkDrawn('idle', image, idle, PALETTE)).toEqual([
      'idle: frame 1 is empty',
      'idle: frame 2: the feet float, its lowest pixel is on row 238 (246 at least)',
    ]);
    // A jump leaves the ground.
    const jump = rulesOf(NAYO, 'jump', 'body');
    const high = imageOf(jump.frames, (put) => {
      for (let frame = 0; frame < jump.frames; frame++) put(frame, ANCHOR.x, 100, 8);
    });
    expect(checkDrawn('jump', high, jump, PALETTE)).toEqual([]);
  });

  it('may leave effects empty on some frames, not on all of them', () => {
    const fx = rulesOf(NAYO, 'standLight', 'fx');
    expect(
      checkDrawn(
        'fx/standLight',
        imageOf(fx.frames, () => undefined),
        fx,
        PALETTE,
      ),
    ).toEqual(['fx/standLight draws nothing (no file means none)']);
    const some = imageOf(fx.frames, (put) => {
      put(2, 100, 100, 8);
    });
    expect(checkDrawn('fx/standLight', some, fx, PALETTE)).toEqual([]);
  });

  it('keep effects off the cell edges, as the code does, but let them reach below the ground', () => {
    const fx = rulesOf(NAYO, 'standLight', 'fx');
    const cut = imageOf(fx.frames, (put) => {
      put(1, CELL_SIZE - 2, 100, 8);
      put(2, 100, CELL_SIZE - 1, 8);
    });
    expect(checkDrawn('fx/standLight', cut, fx, PALETTE)).toEqual([
      "fx/standLight: frame 2 comes 1 px from the cell's edge (4 at least)",
    ]);
  });

  it('give a Remix its special frames', () => {
    expect(rulesOf(NAYO, 'specialBoost', 'fx').frames).toBe(NAYO.sheets.special?.frames);
    expect(() => rulesOf(NAYO, 'nothing', 'body')).toThrow('nayo has no strip nothing');
  });

  it('refuse files that go with no strip, and effects without their strip', async () => {
    await expect(loadDrawn(NAYO, new URL('./fixtures/drawn/', import.meta.url))).rejects.toThrow(
      [
        'Drawn strips of nayo:',
        '  art-src/nayo/nope.png: nayo has no strip nope',
        '  art-src/nayo/fx/dashForward.png: front effects without their strip (dashForward.png)',
      ].join('\n'),
    );
  });

  it('find nothing where nothing is drawn yet', async () => {
    const drawn = await loadDrawn(NAYO, new URL('./fixtures/missing/', import.meta.url));
    expect(drawn.size).toBe(0);
  });

  it('warn when a blow hits where nothing is drawn', () => {
    const strike = strikeOf(NAYO_CLIPS, NAYO_TEMPLATE, 'standLight');
    if (!strike) throw new Error('standLight has a hitbox');
    const strip = drawStrip(NAYO, 'standLight');
    expect(unseenStrikes(strike, [strip])).toEqual([]);
    const blank = {
      width: strip.width,
      height: strip.height,
      pixels: new Uint8Array(strip.pixels.length),
    };
    expect(unseenStrikes(strike, [blank, undefined])).toEqual(strike.frames);
  });
});

describe('Cell boxes', () => {
  it('put a box standing on the ground on the row above the anchor, edges included', () => {
    expect(cellBoxOf({ x: 0, y: 0, width: 1, height: 1 })).toEqual({
      left: ANCHOR.x,
      right: ANCHOR.x + 1,
      top: ANCHOR.y - 2,
      bottom: ANCHOR.y - 1,
    });
    expect(cellBoxOf({ x: -18.5, y: 0, width: 32.5, height: 57 })).toEqual({
      left: ANCHOR.x - 37,
      right: ANCHOR.x + 27,
      top: ANCHOR.y - 114,
      bottom: ANCHOR.y - 1,
    });
  });
});
