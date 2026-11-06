import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { STAGE_LAYERS, STAGE_SCALE } from '../../src/art/stage-layers';
import { hideOccluded, type LayerPixels } from '../../src/render/light-show';
import { decodeIndexedPng } from '../../tools/sprites/png';

vi.mock('phaser', () => ({ default: { TintModes: { MULTIPLY: 0, FILL: 1 } } }));

/** A layer of `width` × `height` image px, opaque where `opaque` says, at world `x`, `y`. */
function layer(
  width: number,
  height: number,
  opaque: (x: number, y: number) => boolean,
  scroll: number,
): LayerPixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data[(y * width + x) * 4 + 3] = opaque(x, y) ? 255 : 0;
  }
  return { data, width, height, x: 0, y: 0, scaleX: 1, scaleY: 1, scroll };
}

const alphaAt = (pixels: LayerPixels, x: number, y: number) =>
  pixels.data[(y * pixels.width + x) * 4 + 3] ?? 0;

describe("a back layer's emitters, under the layers in front (light-show.ts)", () => {
  it('keeps those no front pixel may cover along the camera, clears the others', () => {
    const back = layer(40, 2, () => true, 0.25);
    // The front layer: opaque on its row 1 only, from x 20 on.
    const front = layer(40, 2, (x, y) => y === 1 && x >= 20, 0.5);
    // The camera scrolls 0 to 8: the front shifts 0 to 2 px over the back.
    const left = hideOccluded(back, front, { from: 0, to: 8 });
    // Row 0: nothing in front, all kept. Row 1: kept up to x 17, cleared from 18 (shift ≤ 2).
    expect(alphaAt(back, 39, 0)).toBe(255);
    expect(alphaAt(back, 17, 1)).toBe(255);
    expect(alphaAt(back, 18, 1)).toBe(0);
    expect(left).toBe(40 + 18);
  });

  it("on Sahel Sunset, never lets the sky's light show over the street or the road", async () => {
    const read = async (name: string) =>
      decodeIndexedPng(await readFile(new URL(`../../src/art/sahel/${name}.png`, import.meta.url)));
    const toPixels = async (name: 'far' | 'mid' | 'floor'): Promise<LayerPixels> => {
      const image = await read(name);
      const data = new Uint8ClampedArray(image.width * image.height * 4);
      image.pixels.forEach((slot, i) => (data[i * 4 + 3] = image.alpha[slot] ?? 255));
      const { y, scroll } = STAGE_LAYERS[name];
      const scale = 1 / STAGE_SCALE;
      return {
        data,
        width: image.width,
        height: image.height,
        x: 0,
        y,
        scaleX: scale,
        scaleY: scale,
        scroll,
      };
    };
    // The worst case: every pixel of the sky would light itself.
    const far = await toPixels('far');
    const mid = await toPixels('mid');
    const floor = await toPixels('floor');
    const camera = { from: -48, to: 960 - 480 + 48 };
    hideOccluded(far, mid, camera);
    hideOccluded(far, floor, camera);
    // Under the street's skyline (its lowest sky pixel) and the road, nothing of the sky is left.
    let lowestSky = 0;
    for (let y = 0; y < mid.height; y++) {
      for (let x = 0; x < mid.width; x++) if (alphaAt(mid, x, y) === 0) lowestSky = y;
    }
    for (let y = lowestSky + 1; y < far.height; y++) {
      for (let x = 0; x < far.width; x++) expect(alphaAt(far, x, y), `${x},${y}`).toBe(0);
    }
  });
});
