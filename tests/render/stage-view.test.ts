import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { STAGE_ART } from '../../src/art/rue';
import { STAGE_SCALE, stageArtOf, type StageProp } from '../../src/art/stage-layers';
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
    scale: number;
    scroll: number[];
    depth: number;
    visible: boolean;
    frame: string | undefined;
    destroyed: boolean;
  }[] = [];
  const loaded: [string, string][] = [];
  const frames = new Map<string, number[]>();
  const camera = { background: undefined as number | undefined };
  const scene = {
    add: {
      image: (x: number, y: number, key: string) => {
        const image = {
          x,
          y,
          key,
          origin: [] as number[],
          scale: 1,
          scroll: [] as number[],
          depth: -1,
          visible: true,
          frame: undefined as string | undefined,
          destroyed: false,
        };
        images.push(image);
        const chain = {
          setOrigin: (ox: number, oy: number) => ((image.origin = [ox, oy]), chain),
          setScale: (scale: number) => ((image.scale = scale), chain),
          setScrollFactor: (sx: number, sy: number) => ((image.scroll = [sx, sy]), chain),
          setDepth: (depth: number) => ((image.depth = depth), chain),
          setVisible: (visible: boolean) => ((image.visible = visible), chain),
          setFrame: (frame: string) => ((image.frame = frame), chain),
          setPosition: (px: number, py: number) => ((image.x = px), (image.y = py), chain),
          destroy: () => {
            image.destroyed = true;
          },
        };
        return chain;
      },
    },
    load: {
      image: (key: string, url: string) => {
        loaded.push([key, url]);
      },
    },
    textures: {
      exists: (key: string) => cached.includes(key),
      get: () => ({
        has: (name: string) => frames.has(name),
        add: (name: string, _source: number, ...box: number[]) => frames.set(name, box),
      }),
    },
    cameras: {
      main: {
        setBackgroundColor: (color: number) => {
          camera.background = color;
        },
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, images, loaded, camera, frames };
}

const FILES = { './far.png': 'far.png', './mid.png': 'mid.png', './floor.png': 'floor.png' };
const ART = stageArtOf(FILES, [0x2a2030, 0x101018]);

/** A prop on the middle layer: nothing, then a frame for 30 steps, then another for 10. */
const WAVE: StageProp = {
  name: 'wave',
  layer: 'mid',
  frames: [
    null,
    { x: 100, y: 40, width: 8, height: 6, sheetX: 0, sheetY: 0 },
    { x: 102, y: 42, width: 4, height: 4, sheetX: 9, sheetY: 0 },
  ],
  timeline: [
    [0, 20],
    [1, 30],
    [2, 10],
  ],
};
const WITH_PROPS = stageArtOf({ ...FILES, './props.png': 'props.png' }, [0x2a2030], [WAVE]);

describe('the stage view', () => {
  it('lays the layers back to front, each at its scroll, as fine as the fighters, behind everything', () => {
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
      expect(image.scale).toBe(1 / STAGE_SCALE);
      expect(image.depth).toBe(DEPTH.stage);
      expect(image.depth).toBeLessThan(DEPTH.dim);
    }
    // Past an edge, a shake shows the most covering color.
    expect(camera.background).toBe(0x2a2030);
  });

  it("loads only the layers not already loaded, and the props' sheet", () => {
    if (!ART || !WITH_PROPS) throw new Error('a stage');
    const { scene, loaded } = fakeScene(['stage/far']);
    loadStage(scene, ART);
    expect(loaded).toEqual([
      ['stage/mid', 'mid.png'],
      ['stage/floor', 'floor.png'],
    ]);
    const again = fakeScene(['stage/far', 'stage/mid', 'stage/floor']);
    loadStage(again.scene, WITH_PROPS);
    expect(again.loaded).toEqual([['stage/props', 'props.png']]);
  });

  it('lays each prop right over its layer, at its scroll, and plays its timeline whole frames', () => {
    if (!WITH_PROPS) throw new Error('a stage');
    const { scene, images, frames } = fakeScene();
    const props = drawStage(scene, WITH_PROPS);
    // Far, mid, the prop over the mid, then the floor.
    expect(images.map(({ key }) => key)).toEqual([
      'stage/far',
      'stage/mid',
      'stage/props',
      'stage/floor',
    ]);
    const prop = images[2];
    if (!prop) throw new Error('a prop');
    expect(prop.scroll).toEqual([0.5, 1]);
    expect(prop.scale).toBe(1 / STAGE_SCALE);
    expect(frames.get('wave/1')).toEqual([0, 0, 8, 6]);
    // Frame 0 draws nothing: the layer shows it.
    expect(prop.visible).toBe(false);
    props.update(20);
    expect([prop.visible, prop.frame, prop.x, prop.y]).toEqual([true, 'wave/1', 50, 20]);
    props.update(29);
    expect(prop.frame).toBe('wave/1');
    props.update(1);
    expect([prop.frame, prop.x, prop.y]).toEqual(['wave/2', 51, 21]);
    // It loops.
    props.update(10);
    expect(prop.visible).toBe(false);
    props.dispose();
    expect(prop.destroyed).toBe(true);
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
