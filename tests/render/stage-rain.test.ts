import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Textures: { FilterMode: { NEAREST: 1 } } } }));

import { STAGE_MAPS } from '../../src/art/stages';
import { DEPTH } from '../../src/render/depth';
import { FLASH_DELTA, luminanceDelta } from '../../src/render/luminance';
import {
  curtainPixels,
  precipitationOf,
  RAIN_DRIFT,
  RAIN_FALL,
  RAIN_LOOK,
  RAIN_TILE,
  rainOffsetsAt,
  rains,
  SPLASH_ROWS,
  SPLASH_VARIANTS,
  SNOW_FALL,
  SNOW_LOOK,
  snowOffsetsAt,
  snowPixels,
  SPLASH_WIDTH,
  splashPixels,
  StageRainView,
} from '../../src/render/stage-rain';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';

/** What the rain does with a scene: the tile sprites it adds, the textures it paints. */
function fakeScene() {
  const sprites: {
    key: string;
    depth: number;
    visible: boolean;
    tile: number[];
    destroyed: boolean;
  }[] = [];
  const painted = new Set<string>();
  const scene = {
    textures: {
      exists: (key: string) => painted.has(key),
      createCanvas: (key: string, width: number, height: number) => {
        painted.add(key);
        return {
          setFilter: () => undefined,
          context: {
            createImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
            putImageData: () => undefined,
          },
          refresh: () => undefined,
        };
      },
    },
    add: {
      tileSprite: (_x: number, _y: number, _w: number, _h: number, key: string) => {
        const sprite = { key, depth: -1, visible: true, tile: [] as number[], destroyed: false };
        sprites.push(sprite);
        const chain = {
          setOrigin: () => chain,
          setTileScale: () => chain,
          setScrollFactor: () => chain,
          setDepth: (depth: number) => ((sprite.depth = depth), chain),
          setVisible: (visible: boolean) => ((sprite.visible = visible), chain),
          setTilePosition: (x: number, y: number) => ((sprite.tile = [x, y]), chain),
          destroy: () => {
            sprite.destroyed = true;
          },
        };
        return chain;
      },
    },
  };
  return { scene: scene as unknown as Phaser.Scene, sprites, painted };
}

describe('the rain (docs/art/pluie.md)', () => {
  it('falls on the rain atmospheres only, which the stages now offer', () => {
    const variants = STAGE_MAPS.flatMap(({ variants }) => variants);
    const rainy = variants.filter((variant) => rains(variant));
    expect(rainy.length).toBeGreaterThan(0);
    expect(rainy.every(({ atmosphere }) => atmosphere.weather === 'rain')).toBe(true);
    expect(variants.filter((variant) => !rains(variant)).length).toBeGreaterThan(0);
  });

  it('never falls under a roof: a sheltered stage draws its rain outside, in its own images', () => {
    const [open] = STAGE_MAPS.flatMap(({ variants }) => variants).filter((each) => rains(each));
    if (!open) throw new Error('a rain');
    const map = STAGE_MAPS.find(({ name }) => name === open.stage);
    if (!map) throw new Error(open.stage);
    expect(rains(open, [{ ...map, sheltered: true }])).toBe(false);
    expect(rains(open, [{ ...map, sheltered: false }])).toBe(true);
    expect(STAGE_MAPS.find(({ name }) => name === 'gym')?.sheltered).toBe(true);
  });

  it('never flashes: none of its pixels changes a large color of any stage by FLASH_DELTA', () => {
    for (const [look, { color, alpha }] of Object.entries(RAIN_LOOK)) {
      for (const backdrop of FIGHT_STAGE_COLORS) {
        expect(
          luminanceDelta(color, backdrop, alpha),
          `${look} ${backdrop.toString(16)}`,
        ).toBeLessThan(FLASH_DELTA);
      }
    }
  });

  it('moves by whole pixels a step, along its streaks, and loops over its tile', () => {
    for (let steps = 0; steps < 400; steps++) {
      const now = rainOffsetsAt(steps);
      const next = rainOffsetsAt(steps + 1);
      for (const value of [now.x, now.y, now.splash]) expect(Number.isInteger(value)).toBe(true);
      expect(now.x).toBeGreaterThanOrEqual(0);
      expect(now.x).toBeLessThan(RAIN_TILE);
      expect(now.y).toBeGreaterThanOrEqual(0);
      expect(now.y).toBeLessThan(RAIN_TILE);
      expect((next.x - now.x + RAIN_TILE) % RAIN_TILE).toBe(RAIN_DRIFT);
      expect((now.y - next.y + RAIN_TILE) % RAIN_TILE).toBe(RAIN_FALL);
    }
  });

  it('draws its tiles from a fixed seed, inside them, seamless', () => {
    expect(curtainPixels()).toEqual(curtainPixels());
    for (const { x, y } of curtainPixels()) {
      expect(x >= 0 && x < RAIN_TILE && y >= 0 && y < RAIN_TILE).toBe(true);
    }
    for (const { x, y } of splashPixels()) {
      expect(x >= 0 && x < SPLASH_WIDTH && y >= 0 && y < SPLASH_ROWS * SPLASH_VARIANTS).toBe(true);
    }
    // A streak slants as the rain drifts: it moves along itself, never sideways.
    const streak = curtainPixels().slice(0, 10);
    const [first, last] = [streak[0], streak[9]];
    if (!first || !last) throw new Error('a streak');
    const across = (first.x - last.x + RAIN_TILE) % RAIN_TILE;
    expect(across).toBe(Math.round((9 * RAIN_DRIFT) / RAIN_FALL));
  });

  it('falls behind the fighters, under the super, and goes with the fight', () => {
    const { scene, sprites, painted } = fakeScene();
    const rain = new StageRainView(scene);
    expect(sprites).toHaveLength(2);
    for (const sprite of sprites) {
      expect(sprite.depth).toBeGreaterThan(DEPTH.stage);
      expect(sprite.depth).toBeLessThan(DEPTH.dim);
      expect(sprite.depth).toBeLessThan(DEPTH.fighterBack);
    }
    rain.update(5);
    const { x, y } = rainOffsetsAt(5);
    expect(sprites[0]?.tile).toEqual([x, y]);
    // The lowest light tier drops the curtain, a whole pass of the screen; the splashes stay.
    rain.setTier('off');
    expect(sprites.map(({ visible }) => visible)).toEqual([false, true]);
    rain.setTier('lean');
    expect(sprites[0]?.visible).toBe(true);
    rain.dispose();
    expect(sprites.every(({ destroyed }) => destroyed)).toBe(true);
    // Its tiles stay in the cache, painted once for every rainy fight.
    expect(painted.size).toBe(2);
    new StageRainView(scene).dispose();
    expect(painted.size).toBe(2);
  });

  it('snows on the snow atmospheres, never under a roof', () => {
    const [open] = STAGE_MAPS.flatMap(({ variants }) => variants).filter((each) => rains(each));
    if (!open) throw new Error('a rain');
    const map = STAGE_MAPS.find(({ name }) => name === open.stage);
    if (!map) throw new Error(open.stage);
    const snowing = { ...open, atmosphere: { ...open.atmosphere, weather: 'snow' as const } };
    expect(precipitationOf(snowing, [{ ...map, sheltered: false }])).toBe('snow');
    expect(precipitationOf(snowing, [{ ...map, sheltered: true }])).toBeUndefined();
    expect(precipitationOf(open, [{ ...map, sheltered: false }])).toBe('rain');
    expect(rains(snowing, [{ ...map, sheltered: false }])).toBe(false);
  });

  it('never flashes with its snow either: no flake changes a large color by FLASH_DELTA', () => {
    for (const [look, { color, alpha }] of Object.entries(SNOW_LOOK)) {
      for (const backdrop of FIGHT_STAGE_COLORS) {
        expect(
          luminanceDelta(color, backdrop, alpha),
          `${look} ${backdrop.toString(16)}`,
        ).toBeLessThan(FLASH_DELTA);
      }
    }
  });

  it('lets its snow fall slowly by whole pixels, swaying, over a seamless tile', () => {
    for (let steps = 0; steps < 600; steps++) {
      const now = snowOffsetsAt(steps);
      const next = snowOffsetsAt(steps + 1);
      for (const value of [now.x, now.y]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(RAIN_TILE);
      }
      // Falling: the tile moves up SNOW_FALL a step, looping; sideways a pixel or two at most.
      expect((now.y - next.y + RAIN_TILE) % RAIN_TILE).toBe(SNOW_FALL);
      const side = Math.abs(next.x - now.x);
      expect(Math.min(side, RAIN_TILE - side)).toBeLessThanOrEqual(2);
    }
    const pixels = snowPixels();
    expect(pixels).toEqual(snowPixels());
    for (const { x, y } of pixels) {
      expect(x >= 0 && x < RAIN_TILE && y >= 0 && y < RAIN_TILE).toBe(true);
    }
  });

  it('snows without splashes, one curtain, gone with the fight', () => {
    const { scene, sprites, painted } = fakeScene();
    const snow = new StageRainView(scene, 'snow');
    expect(sprites).toHaveLength(1);
    snow.update(7);
    const { x, y } = snowOffsetsAt(7);
    expect(sprites[0]?.tile).toEqual([x, y]);
    snow.setTier('off');
    expect(sprites[0]?.visible).toBe(false);
    snow.dispose();
    expect(painted.size).toBe(1);
  });
});
