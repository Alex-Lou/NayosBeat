import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { STAGE_MAPS, type StageMap } from '../../src/art/stages';
import {
  BASE_ATMOSPHERE,
  STAGE_SCALE,
  stageArtOf,
  type Atmosphere,
  type StageArt,
  type StageProp,
  type StageVariant,
} from '../../src/art/stage-layers';
import { DEPTH } from '../../src/render/depth';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { relativeLuminance } from '../../src/render/luminance';
import {
  darkestOf,
  drawStage,
  FIGHT_STAGE_COLORS,
  loadStage,
  RANDOM_STAGE,
  stageVariantFor,
} from '../../src/render/stage-view';

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
  const removed: string[] = [];
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
      getTextureKeys: () => [...cached],
      remove: (key: string) => removed.push(key),
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
  return { scene, images, loaded, removed, camera, frames };
}

const FILES = { './far.png': 'far.png', './mid.png': 'mid.png', './floor.png': 'floor.png' };
const DUSK: Atmosphere = { moment: 'dusk', weather: 'clear' };

/** The stage `art` in `atmosphere` (the base one by default). */
function variantOf(
  art: StageArt | undefined,
  atmosphere: Atmosphere = BASE_ATMOSPHERE,
): StageVariant {
  if (!art) throw new Error('a stage');
  return { stage: 'test', atmosphere, art };
}

const ART = variantOf(stageArtOf(FILES, [0x2a2030, 0x101018]));

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
const WITH_PROPS = variantOf(
  stageArtOf({ ...FILES, './props.png': 'props.png' }, [0x2a2030], [WAVE]),
);

describe('the stage view', () => {
  it('lays the layers back to front, each at its scroll, as fine as the fighters, behind everything', () => {
    const { scene, images, camera } = fakeScene();
    drawStage(scene, ART);
    expect(images.map(({ key, y, scroll }) => [key, y, scroll])).toEqual([
      ['stage/test/midnight-clear/far', 0, [0.25, 1]],
      ['stage/test/midnight-clear/mid', 0, [0.5, 1]],
      ['stage/test/midnight-clear/floor', 230, [1, 1]],
    ]);
    for (const image of images) {
      expect(image.origin).toEqual([0, 0]);
      expect(image.scale).toBe(1 / STAGE_SCALE);
      expect(image.depth).toBeGreaterThanOrEqual(DEPTH.stage);
      expect(image.depth).toBeLessThan(DEPTH.rain);
    }
    // Past an edge, a shake shows the most covering color.
    expect(camera.background).toBe(0x2a2030);
  });

  it("loads only the layers not already loaded, and the props' sheet", () => {
    const { scene, loaded } = fakeScene(['stage/test/midnight-clear/far']);
    loadStage(scene, ART);
    expect(loaded).toEqual([
      ['stage/test/midnight-clear/mid', 'mid.png'],
      ['stage/test/midnight-clear/floor', 'floor.png'],
    ]);
    const again = fakeScene([
      'stage/test/midnight-clear/far',
      'stage/test/midnight-clear/mid',
      'stage/test/midnight-clear/floor',
    ]);
    loadStage(again.scene, WITH_PROPS);
    expect(again.loaded).toEqual([['stage/test/midnight-clear/props', 'props.png']]);
  });

  // docs/art/decor-rue.md §13: a fight holds one atmosphere in video memory, never two.
  it("drops the other atmospheres' images from the cache, keeps its own and the fighters'", () => {
    const cached = [
      'stage/test/midnight-clear/far',
      'stage/test/midnight-clear/props',
      'stage/test/dusk-clear/far',
      'nayo/idle',
    ];
    const { scene, loaded, removed } = fakeScene(cached);
    loadStage(scene, variantOf(stageArtOf(FILES, [0x2a2030]), DUSK));
    expect(removed).toEqual(['stage/test/midnight-clear/far', 'stage/test/midnight-clear/props']);
    expect(loaded.map(([key]) => key)).toEqual([
      'stage/test/dusk-clear/mid',
      'stage/test/dusk-clear/floor',
    ]);
  });

  it('lays each prop right over its layer, at its scroll, and plays its timeline whole frames', () => {
    const { scene, images, frames } = fakeScene();
    const props = drawStage(scene, WITH_PROPS);
    // Far, mid, the prop over the mid, then the floor.
    expect(images.map(({ key }) => key)).toEqual([
      'stage/test/midnight-clear/far',
      'stage/test/midnight-clear/mid',
      'stage/test/midnight-clear/props',
      'stage/test/midnight-clear/floor',
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

  it('keeps its images in the order drawn, whatever the lights raise over their glows and set back', () => {
    // Regression (the gym on Android, 3 Nov 2026): every stage image had the same depth, so once
    // the live lights had raised the far layer over their glows and set it back (light-show.ts
    // `showEmitters`), Phaser's stable depth sort put it after the middle layer and the floor,
    // and the opaque far layer hid them: the stage « flat and empty » but at some blows.
    const { scene, images } = fakeScene();
    drawStage(scene, WITH_PROPS);
    const drawn = images.map(({ key }) => key);
    const depths = images.map(({ depth }) => depth);
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i], drawn[i]).toBeGreaterThan(depths[i - 1] ?? Infinity);
    }
    // What Phaser does (DisplayList.depthSort, a stable sort by depth) after the lights raise the
    // far layer and the prop, then give them back their depths.
    const list = [...images];
    const sort = () => list.sort((a, b) => a.depth - b.depth);
    const raised = [images[0], images[2]];
    for (const image of raised) if (image) image.depth = DEPTH.pools + 0.002;
    sort();
    raised.forEach((image, index) => {
      if (image) image.depth = depths[index === 0 ? 0 : 2] ?? 0;
    });
    sort();
    expect(list.map(({ key }) => key)).toEqual(drawn);
  });

  it('glides a drifting prop along its layer, whole image pixels a step', () => {
    const glider: StageProp = { ...WAVE, drift: { from: 0, to: -40, start: 20, steps: 20 } };
    const { scene, images } = fakeScene();
    const props = drawStage(
      scene,
      variantOf(stageArtOf({ ...FILES, './props.png': 'props.png' }, [0x2a2030], [glider])),
    );
    const prop = images[2];
    if (!prop) throw new Error('a prop');
    props.update(20);
    expect([prop.visible, prop.x]).toEqual([true, 50]);
    props.update(10);
    // Halfway: 20 image pixels left, 10 world pixels.
    expect(prop.x).toBe(40);
    props.update(9);
    expect(prop.x).toBe(31);
    props.dispose();
  });

  it("gives the flashes the night stages' large colors in every atmosphere, each once: else the grey box's", () => {
    // Sakura is the day stage: its bright colors are outside the flash envelope (stage-view.ts
    // FIGHT_STAGE_COLORS, docs/art/decor-sakura.md §3).
    const variants = STAGE_MAPS.filter(({ name }) => name !== 'sakura').flatMap(
      ({ variants }) => variants,
    );
    if (variants.length === 0) {
      expect(FIGHT_STAGE_COLORS).toEqual(GREYBOX_COLORS);
      return;
    }
    expect(new Set(FIGHT_STAGE_COLORS).size).toBe(FIGHT_STAGE_COLORS.length);
    for (const { art } of variants)
      expect(FIGHT_STAGE_COLORS).toEqual(expect.arrayContaining([...art.colors]));
    // The first stage's base first, the most covering first.
    expect(FIGHT_STAGE_COLORS.slice(0, variants[0]?.art.colors.length)).toEqual(
      variants[0]?.art.colors,
    );
  });

  it('draws the atmosphere asked for if the stage has it, else one at random among its own', () => {
    const night = ART;
    const dusk = variantOf(stageArtOf(FILES, [0x2a2030]), DUSK);
    const street: StageMap = {
      name: 'test',
      title: 'Test',
      description: '',
      sheltered: false,
      ground: 'hard',
      variants: [night, dusk],
    };
    const maps = [street];
    const at = (atmosphere: Atmosphere | 'random') => ({ map: 'test', atmosphere });
    expect(stageVariantFor(at(DUSK), maps, () => 0)).toBe(dusk);
    expect(stageVariantFor(at(BASE_ATMOSPHERE), maps, () => 0.99)).toBe(night);
    expect(stageVariantFor(at('random'), maps, () => 0)).toBe(night);
    expect(stageVariantFor(at('random'), maps, () => 0.5)).toBe(dusk);
    expect(stageVariantFor(at('random'), maps, () => 0.999)).toBe(dusk);
    // Not on this stage: at random among its own.
    expect(stageVariantFor(at({ moment: 'midnight', weather: 'rain' }), maps, () => 0.6)).toBe(
      dusk,
    );
    // No stage drawn: the grey box.
    expect(stageVariantFor(RANDOM_STAGE, [], () => 0)).toBeUndefined();
  });

  it('draws the place asked for, else one at random, among those offering the atmosphere asked', () => {
    const night = (stage: string) => ({ ...ART, stage });
    const dusk = (stage: string) => ({ ...variantOf(stageArtOf(FILES, [0x2a2030]), DUSK), stage });
    const map = (name: string, variants: StageVariant[]): StageMap => ({
      name,
      title: name,
      description: '',
      sheltered: false,
      ground: 'hard',
      variants,
    });
    const street = map('street', [night('street'), dusk('street')]);
    const gym = map('gym', [night('gym')]);
    const maps = [street, gym];
    expect(stageVariantFor({ map: 'gym', atmosphere: 'random' }, maps, () => 0)?.stage).toBe('gym');
    expect(stageVariantFor(RANDOM_STAGE, maps, () => 0)?.stage).toBe('street');
    expect(stageVariantFor(RANDOM_STAGE, maps, () => 0.99)?.stage).toBe('gym');
    // Dusk at random: the street, the only place that offers it.
    const anywhereAtDusk = stageVariantFor({ map: 'random', atmosphere: DUSK }, maps, () => 0.99);
    expect([anywhereAtDusk?.stage, anywhereAtDusk?.atmosphere]).toEqual(['street', DUSK]);
    // An unknown place: at random.
    expect(stageVariantFor({ map: 'moon', atmosphere: 'random' }, maps, () => 0.99)?.stage).toBe(
      'gym',
    );
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
