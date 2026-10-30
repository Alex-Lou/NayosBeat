import type Phaser from 'phaser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FighterArt } from '../../src/art/types';
import { DISSOLVE_FRAMES } from '../../src/render/dissolve';
import { FxDissolve, type ShownFrame } from '../../src/render/fx-dissolve';

const CELL = { width: 20, height: 20, anchor: { x: 10, y: 18 } };
/**
 * Frames of the strip `big`: 0 is full, 1 keeps its left quarter (the effect fades out), 2 its
 * left half and 3 its right half (as full as each other: rings rolling on).
 */
const FRAMES: Readonly<Record<number, (x: number) => boolean>> = {
  0: () => true,
  1: (x) => x < 5,
  2: (x) => x < 10,
  3: (x) => x >= 10,
};

class FakeImage {
  visible = true;
  x = 0;
  y = 0;
  flip = false;
  setScale(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  setOrigin(): this {
    return this;
  }
  setVisible(visible: boolean): this {
    this.visible = visible;
    return this;
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setFlipX(flip: boolean): this {
    this.flip = flip;
    return this;
  }
}

function setup() {
  const images: FakeImage[] = [];
  const uploads = vi.fn();
  const imageData = (width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  });
  const scene = {
    add: {
      image: () => {
        const image = new FakeImage();
        images.push(image);
        return image;
      },
    },
    textures: {
      exists: (key: string) => key.includes('/fx/'),
      createCanvas: () => ({
        context: { createImageData: imageData, putImageData: vi.fn() },
        refresh: uploads,
      }),
      get: () => ({
        get: (frame: number) => ({ cutX: frame * 20, cutY: 0, cutWidth: 20, cutHeight: 20 }),
        getSourceImage: () => ({}),
      }),
    },
  } as unknown as Phaser.Scene;
  // The strip's pixels, read through a canvas: the frame drawn is the one whose pixels come back.
  let drawn = 0;
  vi.stubGlobal('document', {
    createElement: () => ({
      getContext: () => ({
        drawImage: (_: unknown, cutX: number) => {
          drawn = cutX / 20;
        },
        getImageData: () => {
          const pixels = imageData(20, 20);
          const shows = FRAMES[drawn] ?? (() => false);
          for (let i = 0; i < 400; i++) if (shows(i % 20)) pixels.data[i * 4 + 3] = 255;
          return pixels;
        },
      }),
    }),
  });
  const art = {
    key: 'nayo/main',
    fx: { big: 'big.png' },
    cells: { 'fx/big': CELL },
  } as unknown as FighterArt;
  return { dissolve: new FxDissolve(scene, art, 'rise', 0x30e8ff, false), images, uploads };
}

const at = (frame: number): ShownFrame => ({ sheet: 'big', frame, x: 100, y: 200, flip: false });

describe('the ghosts of the effects (docs/art/dissolution.md)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dissolves what a special's effects stop showing as they fade, where it was, then lets it go", () => {
    const { dissolve, images } = setup();
    dissolve.follow(at(0), true, 1);
    expect(images.some((image) => image.visible)).toBe(false);
    // Frame 1 keeps the left quarter: the rest goes, where frame 0 was.
    dissolve.follow(at(1), true, 1);
    const ghost = images.find((image) => image.visible);
    expect(ghost).toBeDefined();
    expect([ghost?.x, ghost?.y]).toEqual([100, 200]);
    for (let frame = 0; frame < DISSOLVE_FRAMES; frame++) dissolve.follow(at(1), true, 1);
    expect(images.some((image) => image.visible)).toBe(false);
  });

  it('leaves an effect that moves on alone: rolling rings leave no smear', () => {
    const { dissolve, images } = setup();
    dissolve.follow(at(2), true, 1);
    dissolve.follow(at(3), true, 1);
    dissolve.follow(at(2), true, 1);
    expect(images.some((image) => image.visible)).toBe(false);
  });

  it('lets a ghost go at once when its frame shows again in its place: never a doubled glow', () => {
    const { dissolve, images } = setup();
    dissolve.follow(at(0), true, 1);
    dissolve.follow(at(1), true, 1);
    expect(images.some((image) => image.visible)).toBe(true);
    dissolve.follow(at(0), true, 1);
    expect(images.some((image) => image.visible)).toBe(false);
  });

  it('dissolves it all when the move is over or cut short', () => {
    const { dissolve, images } = setup();
    dissolve.follow(at(1), true, 1);
    dissolve.follow(null, false, 1);
    expect(images.filter((image) => image.visible)).toHaveLength(1);
  });

  it("leaves a normal's effects alone, and repaints every other frame only", () => {
    const { dissolve, images, uploads } = setup();
    dissolve.follow(at(0), false, 1);
    dissolve.follow(null, false, 1);
    expect(images.some((image) => image.visible)).toBe(false);
    expect(uploads).not.toHaveBeenCalled();
    dissolve.follow(at(0), true, 1);
    dissolve.follow(null, false, 1);
    const first = uploads.mock.calls.length;
    for (let frame = 0; frame < 6; frame++) dissolve.follow(null, false, 1);
    expect(uploads.mock.calls.length - first).toBe(3);
  });
});
