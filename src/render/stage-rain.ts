import Phaser from 'phaser';
import { STAGE_LAYERS, STAGE_SCALE, type StageVariant } from '../art/stage-layers';
import { STAGE_MAPS, type StageMap } from '../art/stages';
import { DEPTH } from './depth';
import type { LightTier } from './live-lights';
import { VIEW_SIZE } from './view';

/**
 * The rain of a stage's rain atmospheres (docs/art/pluie.md): a curtain of streaks behind the
 * fighters and splashes along the ground line, drawn by the render only (D17), moved by whole
 * pixels a step of the visual clock (D23). Its tiles are made here from a fixed seed, once, and
 * stay in the texture cache: a few hundred KB of video memory for every stage that rains.
 */

/**
 * The rain's colors and opacities: the near streaks, the far ones (shorter, dimmer), the splashes.
 * Over every large color of every stage, none changes the luminance by FLASH_DELTA (test): the
 * rain never flashes, however it moves.
 */
export const RAIN_LOOK = {
  near: { color: 0x9aa8c8, alpha: 0.3 },
  far: { color: 0x6e7c9c, alpha: 0.22 },
  splash: { color: 0xb4bed4, alpha: 0.34 },
} as const;

/** The curtain's tile, image pixels (STAGE_SCALE a world pixel): its streaks repeat past it. */
export const RAIN_TILE = 384;
/** Image pixels a step: the streaks fall FALL and drift DRIFT to the left (the wind). */
export const RAIN_FALL = 14;
export const RAIN_DRIFT = 4;
/**
 * The splashes' strip, over the whole floor (its depth, so they never line up): SPLASH_VARIANTS
 * bands of SPLASH_ROWS image pixels, one shown at a time.
 */
export const SPLASH_WIDTH = 512;
export const SPLASH_ROWS = STAGE_LAYERS.floor.height * STAGE_SCALE;
export const SPLASH_VARIANTS = 4;
/** Steps each variant of the splashes shows. */
export const SPLASH_STEPS = 3;
/** The curtain follows this share of the camera's horizontal moves: between the middle layer and the floor. */
export const RAIN_SCROLL = 0.75;

const CURTAIN_KEY = 'rain/curtain';
const SPLASH_KEY = 'rain/splash';

/** Whether the curtain falls over `variant`: it rains, and not under a roof (`sheltered`). */
export function rains(variant: StageVariant, maps: readonly StageMap[] = STAGE_MAPS): boolean {
  const sheltered = maps.find(({ name }) => name === variant.stage)?.sheltered ?? false;
  return variant.atmosphere.weather === 'rain' && !sheltered;
}

/** A seeded randomness (mulberry32): the same rain on every run and every machine. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A pixel of a tile: where, and which look. */
export interface RainPixel {
  readonly x: number;
  readonly y: number;
  readonly look: 'near' | 'far' | 'splash';
}

/**
 * The curtain's pixels, RAIN_TILE square: streaks slanting with the wind (RAIN_DRIFT across for
 * RAIN_FALL down, so they move along themselves), near ones long, far ones short, wrapping at the
 * tile's edges so it repeats without a seam.
 */
export function curtainPixels(seed = 71): RainPixel[] {
  const random = seeded(seed);
  const pixels: RainPixel[] = [];
  for (let streak = 0; streak < 280; streak++) {
    const near = streak % 3 === 0;
    const length = near ? 14 + Math.floor(random() * 10) : 6 + Math.floor(random() * 5);
    const x0 = Math.floor(random() * RAIN_TILE);
    const y0 = Math.floor(random() * RAIN_TILE);
    for (let row = 0; row < length; row++) {
      const x = (x0 - Math.round((row * RAIN_DRIFT) / RAIN_FALL) + RAIN_TILE) % RAIN_TILE;
      pixels.push({ x, y: (y0 + row) % RAIN_TILE, look: near ? 'near' : 'far' });
    }
  }
  return pixels;
}

/**
 * The splashes' pixels: SPLASH_VARIANTS strips stacked, each with its own drops landing (a crown
 * of three or five pixels), so that the strip changes whole from one variant to the next.
 */
export function splashPixels(seed = 73): RainPixel[] {
  const random = seeded(seed);
  const pixels: RainPixel[] = [];
  for (let variant = 0; variant < SPLASH_VARIANTS; variant++) {
    const top = variant * SPLASH_ROWS;
    for (let drop = 0; drop < 26; drop++) {
      const x = Math.floor(random() * (SPLASH_WIDTH - 4)) + 2;
      const y = top + 3 + Math.floor(random() * (SPLASH_ROWS - 4));
      const wide = random() < 0.5;
      pixels.push({ x, y, look: 'splash' });
      pixels.push({ x: x - 1, y: y - 1, look: 'splash' });
      pixels.push({ x: x + 1, y: y - 1, look: 'splash' });
      if (wide) {
        pixels.push({ x: x - 2, y: y - 2, look: 'splash' });
        pixels.push({ x: x + 2, y: y - 2, look: 'splash' });
      }
    }
  }
  return pixels;
}

/** Where the tiles stand `steps` steps of the visual clock in: whole image pixels, looping. */
export function rainOffsetsAt(steps: number): { x: number; y: number; splash: number } {
  return {
    x: (steps * RAIN_DRIFT) % RAIN_TILE,
    y: (RAIN_TILE - ((steps * RAIN_FALL) % RAIN_TILE)) % RAIN_TILE,
    splash: (Math.floor(steps / SPLASH_STEPS) % SPLASH_VARIANTS) * SPLASH_ROWS,
  };
}

/** Paints `pixels` in a canvas texture `key`, `width` × `height`, once: it stays in the cache. */
function paint(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  pixels: readonly RainPixel[],
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const image = texture.context.createImageData(width, height);
  for (const { x, y, look } of pixels) {
    const { color, alpha } = RAIN_LOOK[look];
    const i = (y * width + x) * 4;
    image.data[i] = (color >> 16) & 0xff;
    image.data[i + 1] = (color >> 8) & 0xff;
    image.data[i + 2] = color & 0xff;
    image.data[i + 3] = Math.round(alpha * 255);
  }
  texture.context.putImageData(image, 0, 0);
  texture.refresh();
}

/**
 * The rain over a fight's stage: the curtain from the top of the stage to the ground line, behind
 * the fighters and under the super's dark (DEPTH.rain), following RAIN_SCROLL of the camera; the
 * splashes along the ground line. A view only, like the stage's props: it counts the visual
 * clock's steps. At the lowest light tier (light-quality.ts), the curtain goes, the splashes stay.
 */
export class StageRainView {
  private readonly curtain: Phaser.GameObjects.TileSprite;
  private readonly splashes: Phaser.GameObjects.TileSprite;
  private steps = 0;

  constructor(scene: Phaser.Scene) {
    paint(scene, CURTAIN_KEY, RAIN_TILE, RAIN_TILE, curtainPixels());
    paint(scene, SPLASH_KEY, SPLASH_WIDTH, SPLASH_ROWS * SPLASH_VARIANTS, splashPixels());
    const ground = STAGE_LAYERS.floor.y;
    const travel = STAGE_LAYERS.floor.width - VIEW_SIZE.width;
    this.curtain = scene.add
      .tileSprite(0, 0, VIEW_SIZE.width + travel * RAIN_SCROLL, ground, CURTAIN_KEY)
      .setOrigin(0, 0)
      .setTileScale(1 / STAGE_SCALE, 1 / STAGE_SCALE)
      .setScrollFactor(RAIN_SCROLL, 1)
      .setDepth(DEPTH.rain);
    this.splashes = scene.add
      .tileSprite(0, ground, STAGE_LAYERS.floor.width, SPLASH_ROWS / STAGE_SCALE, SPLASH_KEY)
      .setOrigin(0, 0)
      .setTileScale(1 / STAGE_SCALE, 1 / STAGE_SCALE)
      .setScrollFactor(1, 1)
      .setDepth(DEPTH.rain);
    this.show();
  }

  /** `steps` more steps of 1/60 s of the visual clock. */
  update(steps: number): void {
    this.steps += steps;
    this.show();
  }

  /** The light tier of the session: `off` drops the curtain (a whole pass of the screen). */
  setTier(tier: LightTier): void {
    this.curtain.setVisible(tier !== 'off');
  }

  dispose(): void {
    this.curtain.destroy();
    this.splashes.destroy();
  }

  private show(): void {
    const { x, y, splash } = rainOffsetsAt(this.steps);
    this.curtain.setTilePosition(x, y);
    this.splashes.setTilePosition(0, splash);
  }
}
