import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { STAGE_ART } from '../../src/art/entrepot';
import { stageArtOf } from '../../src/art/stage-layers';
import { DEPTH } from '../../src/render/depth';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { relativeLuminance } from '../../src/render/luminance';
import { darkestOf, drawStage, FIGHT_STAGE_COLORS, loadStage } from '../../src/render/stage-view';

/** What the stage view does with a scene: the images it adds, the textures it loads. */
function fakeScene(cached: readonly string[] = []) {
  const images: {
    x: number;
    y: number;
    key: string;
    origin: number[];
    scroll: number[];
    depth: number;
  }[] = [];
  const loaded: [string, string][] = [];
  const camera = { background: undefined as number | undefined };
  const scene = {
    add: {
      image: (x: number, y: number, key: string) => {
        const image = { x, y, key, origin: [] as number[], scroll: [] as number[], depth: -1 };
        images.push(image);
        const chain = {
          setOrigin: (ox: number, oy: number) => ((image.origin = [ox, oy]), chain),
          setScrollFactor: (sx: number, sy: number) => ((image.scroll = [sx, sy]), chain),
          setDepth: (depth: number) => ((image.depth = depth), chain),
        };
        return chain;
      },
    },
    load: {
      image: (key: string, url: string) => {
        loaded.push([key, url]);
      },
    },
    textures: { exists: (key: string) => cached.includes(key) },
    cameras: {
      main: {
        setBackgroundColor: (color: number) => {
          camera.background = color;
        },
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, images, loaded, camera };
}

const ART = stageArtOf(
  { './far.png': 'far.png', './mid.png': 'mid.png', './floor.png': 'floor.png' },
  [0x2a2030, 0x101018],
);

describe('the stage view', () => {
  it('lays the layers back to front, each at its scroll, behind everything', () => {
    if (!ART) throw new Error('a stage');
    const { scene, images, camera } = fakeScene();
    drawStage(scene, ART);
    expect(images.map(({ key, y, scroll }) => [key, y, scroll])).toEqual([
      ['stage/far', 0, [0.25, 1]],
      ['stage/mid', 0, [0.5, 1]],
      ['stage/floor', 230, [1, 1]],
    ]);
    for (const image of images) {
      expect(image.origin).toEqual([0, 0]);
      expect(image.depth).toBe(DEPTH.stage);
      expect(image.depth).toBeLessThan(DEPTH.dim);
    }
    // Past an edge, a shake shows the most covering color.
    expect(camera.background).toBe(0x2a2030);
  });

  it('loads only the layers not already loaded', () => {
    if (!ART) throw new Error('a stage');
    const { scene, loaded } = fakeScene(['stage/far']);
    loadStage(scene, ART);
    expect(loaded).toEqual([
      ['stage/mid', 'mid.png'],
      ['stage/floor', 'floor.png'],
    ]);
  });

  it("gives the flashes the stage's large colors: the drawn one's, else the grey box's", () => {
    expect(FIGHT_STAGE_COLORS).toEqual(STAGE_ART?.colors ?? GREYBOX_COLORS);
  });

  it('finds the darkest color, which a flash lights the most', () => {
    expect(darkestOf([0x3a3a5c, 0x1b1b2f, 0x808080])).toBe(0x1b1b2f);
    expect(darkestOf(GREYBOX_COLORS)).toBe(0x1b1b2f);
    const darkest = darkestOf(FIGHT_STAGE_COLORS);
    for (const color of FIGHT_STAGE_COLORS) {
      expect(relativeLuminance(darkest)).toBeLessThanOrEqual(relativeLuminance(color));
    }
    expect(() => darkestOf([])).toThrow();
  });
});
