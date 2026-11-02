import type Phaser from 'phaser';
import { px } from '../../src/core/constants';
import { FxRandom } from '../../src/render/fx-random';
import { HitFx, type FxKind, type HitKind } from '../../src/render/hit-fx';
import type { HitStyle } from '../../src/render/hit-styles';
import type { RenderMode } from '../../src/render/render-mode';
import { darkestOf, FIGHT_STAGE_COLORS } from '../../src/render/stage-view';

/**
 * Measures what a hit effect lights (docs/flashs.md §1.1): the real HitFx plays on a scene that
 * keeps its images, and each display frame is composited pixel by pixel over the stage's sky as
 * WebGL blends (sRGB, alpha or added), then the world px² whose WCAG luminance rose by 0.1 or
 * more are counted. Its effects are seeded (FxRandom): the same effect every run.
 * Phaser must be mocked by the test (its blend modes: NORMAL 0, ADD 1). Drawn by Canvas, the
 * same, every tint ignored (Phaser's Canvas renderer has none: render-mode.ts).
 */

/** Who composites the images: WebGL tints them, Canvas does not. */
export type Compositor = 'webgl' | 'canvas';

/** The stage's sky, its darkest large color: what a spark lights the most (docs/flashs.md §3). */
const SKY = darkestOf(FIGHT_STAGE_COLORS);
/** World pixels composited around the impact, at (CENTER_X, CENTER_Y), SAMPLES² samples each. */
const WIDTH = 320;
const HEIGHT = 260;
const CENTER_X = 160;
const CENTER_Y = 130;
const SAMPLES = 2;
const ADD = 1;
/** The ground line of the measuring HitFx: the impact this high over it, so a KO is not lifted. */
const GROUND_Y = 200;

interface FakeImage {
  frame: string;
  blend: number;
  visible: boolean;
  tint: number;
  rotation: number;
  flipX: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
}

interface Atlas {
  width: number;
  data: Uint8ClampedArray;
  readonly frames: Map<string, { x: number; y: number; width: number; height: number }>;
}

/** A scene that paints the atlas into memory and keeps every image HitFx makes. */
function recordingScene(): { scene: Phaser.Scene; atlas: Atlas; images: FakeImage[] } {
  const atlas: Atlas = { width: 0, data: new Uint8ClampedArray(0), frames: new Map() };
  const images: FakeImage[] = [];
  let painted = false;
  const scene = {
    // A canvas twice as fine as the sprites: the atlas at full detail.
    scale: { width: 1920 },
    textures: {
      exists: () => painted,
      createCanvas: (_key: string, width: number, height: number) => {
        painted = true;
        atlas.width = width;
        atlas.data = new Uint8ClampedArray(width * height * 4);
        return {
          context: {
            createImageData: (w: number, h: number) => ({
              data: new Uint8ClampedArray(w * h * 4),
              width: w,
              height: h,
            }),
            putImageData: (image: ImageData, left: number, top: number) => {
              for (let row = 0; row < image.height; row++) {
                const from = row * image.width * 4;
                const to = ((top + row) * atlas.width + left) * 4;
                atlas.data.set(image.data.subarray(from, from + image.width * 4), to);
              }
            },
          },
          add: (name: string, _source: number, x: number, y: number, w: number, h: number) => {
            atlas.frames.set(name, { x, y, width: w, height: h });
          },
          refresh: () => undefined,
          setFilter: () => undefined,
        };
      },
    },
    add: {
      image: (_x: number, _y: number, _key: string, frame: string) => {
        const image: FakeImage = {
          frame,
          blend: 0,
          visible: false,
          tint: 0xffffff,
          rotation: 0,
          flipX: false,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          alpha: 1,
        };
        images.push(image);
        const chain = {
          get rotation() {
            return image.rotation;
          },
          setBlendMode: (blend: number) => ((image.blend = blend), chain),
          setDepth: () => chain,
          setVisible: (visible: boolean) => ((image.visible = visible), chain),
          setTint: (tint: number) => ((image.tint = tint), chain),
          setRotation: (rotation: number) => ((image.rotation = rotation), chain),
          setFlip: (flipX: boolean) => ((image.flipX = flipX), chain),
          setPosition: (x: number, y: number) => ((image.x = x), (image.y = y), chain),
          setDisplaySize: (w: number, h: number) => ((image.width = w), (image.height = h), chain),
          setAlpha: (alpha: number) => ((image.alpha = alpha), chain),
          setFrame: (name: string) => ((image.frame = name), chain),
        };
        return chain;
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, atlas, images };
}

/** WCAG's linearized channel of each 0 to 255 value. */
const LINEAR = Array.from({ length: 256 }, (_, value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
});

function luminance(red: number, green: number, blue: number): number {
  const at = (value: number) => LINEAR[Math.round(value)] ?? 0;
  return 0.2126 * at(red) + 0.7152 * at(green) + 0.0722 * at(blue);
}

/** World px² lit at ΔL ≥ 0.1 over the sky, the images as they are now. */
function litArea(atlas: Atlas, images: readonly FakeImage[], drawnBy: Compositor): number {
  const columns = WIDTH * SAMPLES;
  const count = columns * HEIGHT * SAMPLES;
  const red = new Float32Array(count).fill((SKY >> 16) & 0xff);
  const green = new Float32Array(count).fill((SKY >> 8) & 0xff);
  const blue = new Float32Array(count).fill(SKY & 0xff);
  for (const image of images) {
    const frame = atlas.frames.get(image.frame);
    if (!image.visible || image.alpha <= 0 || !frame) continue;
    const cos = Math.cos(image.rotation);
    const sin = Math.sin(image.rotation);
    const reach = Math.hypot(image.width, image.height) / 2;
    const shown = drawnBy === 'webgl' ? image.tint : 0xffffff;
    const tint = [(shown >> 16) & 0xff, (shown >> 8) & 0xff, shown & 0xff];
    const [tintRed = 255, tintGreen = 255, tintBlue = 255] = tint.map((channel) => channel / 255);
    const left = Math.max(0, Math.floor((image.x - reach) * SAMPLES));
    const right = Math.min(columns, Math.ceil((image.x + reach) * SAMPLES));
    const top = Math.max(0, Math.floor((image.y - reach) * SAMPLES));
    const bottom = Math.min(HEIGHT * SAMPLES, Math.ceil((image.y + reach) * SAMPLES));
    for (let row = top; row < bottom; row++) {
      for (let column = left; column < right; column++) {
        const dx = (column + 0.5) / SAMPLES - image.x;
        const dy = (row + 0.5) / SAMPLES - image.y;
        let u = (dx * cos + dy * sin) / image.width + 0.5;
        const v = (-dx * sin + dy * cos) / image.height + 0.5;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        if (image.flipX) u = 1 - u;
        const tx = frame.x + Math.min(frame.width - 1, Math.floor(u * frame.width));
        const ty = frame.y + Math.min(frame.height - 1, Math.floor(v * frame.height));
        const texel = (ty * atlas.width + tx) * 4;
        const alpha = ((atlas.data[texel + 3] ?? 0) / 255) * image.alpha;
        if (alpha <= 0) continue;
        const i = row * columns + column;
        const r = (atlas.data[texel] ?? 0) * tintRed;
        const g = (atlas.data[texel + 1] ?? 0) * tintGreen;
        const b = (atlas.data[texel + 2] ?? 0) * tintBlue;
        if (image.blend === ADD) {
          red[i] = Math.min(255, (red[i] ?? 0) + r * alpha);
          green[i] = Math.min(255, (green[i] ?? 0) + g * alpha);
          blue[i] = Math.min(255, (blue[i] ?? 0) + b * alpha);
        } else {
          red[i] = (red[i] ?? 0) + (r - (red[i] ?? 0)) * alpha;
          green[i] = (green[i] ?? 0) + (g - (green[i] ?? 0)) * alpha;
          blue[i] = (blue[i] ?? 0) + (b - (blue[i] ?? 0)) * alpha;
        }
      }
    }
  }
  const sky = luminance((SKY >> 16) & 0xff, (SKY >> 8) & 0xff, SKY & 0xff);
  let lit = 0;
  for (let i = 0; i < count; i++) {
    if (luminance(red[i] ?? 0, green[i] ?? 0, blue[i] ?? 0) - sky >= 0.1) lit++;
  }
  return lit / (SAMPLES * SAMPLES);
}

/** What an effect hides on one display frame: the world px² it covers opaquely, and where. */
export interface Cover {
  /** World px² where the pieces drawn together let half or less of what is behind show. */
  readonly opaque: number;
  /** The middle of that area, from the impact along the blow (world px; 0 with none). */
  readonly middle: number;
  /** Of that area, the world px² within HEART_PROBE of the heart (`at` from the impact). */
  readonly heart: number;
}

/** The radius around the heart of a burst that its victim shows through, once it is gone. */
const HEART_PROBE = 6;

/**
 * How much of what is behind the images shows through, at each sample: the pieces' opacities
 * stacked (each lets 1 − alpha through, whatever its blend: an added white hides as well).
 */
function coverOf(atlas: Atlas, images: readonly FakeImage[], at: number): Cover {
  const columns = WIDTH * SAMPLES;
  const through = new Float32Array(columns * HEIGHT * SAMPLES).fill(1);
  for (const image of images) {
    const frame = atlas.frames.get(image.frame);
    if (!image.visible || image.alpha <= 0 || !frame) continue;
    const cos = Math.cos(image.rotation);
    const sin = Math.sin(image.rotation);
    const reach = Math.hypot(image.width, image.height) / 2;
    const left = Math.max(0, Math.floor((image.x - reach) * SAMPLES));
    const right = Math.min(columns, Math.ceil((image.x + reach) * SAMPLES));
    const top = Math.max(0, Math.floor((image.y - reach) * SAMPLES));
    const bottom = Math.min(HEIGHT * SAMPLES, Math.ceil((image.y + reach) * SAMPLES));
    for (let row = top; row < bottom; row++) {
      for (let column = left; column < right; column++) {
        const dx = (column + 0.5) / SAMPLES - image.x;
        const dy = (row + 0.5) / SAMPLES - image.y;
        let u = (dx * cos + dy * sin) / image.width + 0.5;
        const v = (-dx * sin + dy * cos) / image.height + 0.5;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
        if (image.flipX) u = 1 - u;
        const tx = frame.x + Math.min(frame.width - 1, Math.floor(u * frame.width));
        const ty = frame.y + Math.min(frame.height - 1, Math.floor(v * frame.height));
        const alpha = ((atlas.data[(ty * atlas.width + tx) * 4 + 3] ?? 0) / 255) * image.alpha;
        const i = row * columns + column;
        through[i] = (through[i] ?? 1) * (1 - alpha);
      }
    }
  }
  let opaque = 0;
  let heart = 0;
  let sum = 0;
  through.forEach((shows, i) => {
    if (shows > 0.5) return;
    opaque++;
    const x = ((i % columns) + 0.5) / SAMPLES;
    const y = (Math.floor(i / columns) + 0.5) / SAMPLES;
    sum += x;
    if (Math.hypot(x - CENTER_X - at, y - CENTER_Y) <= HEART_PROBE) heart++;
  });
  return {
    opaque: opaque / SAMPLES ** 2,
    middle: opaque === 0 ? 0 : sum / opaque - CENTER_X,
    heart: heart / SAMPLES ** 2,
  };
}

/**
 * Plays effects on one HitFx, in `mode`, and measures them as `drawnBy` draws them (by default,
 * the renderer of that mode), one at a time.
 */
export class SparkMeter {
  private readonly recorded = recordingScene();
  private readonly fx: HitFx;

  constructor(
    mode: RenderMode = 'full',
    private readonly drawnBy: Compositor = mode === 'full' ? 'webgl' : 'canvas',
  ) {
    // The seed the table was measured with (12345, then Math.random's).
    this.fx = new HitFx(this.recorded.scene, GROUND_Y, mode, new FxRandom(12345));
  }

  /**
   * The most world px² a blow's effect lights on one display frame, over its first `frames`
   * (its peak is in its first frames: the burst, the aura, the splash).
   */
  peak(style: HitStyle, kind: FxKind, frames = 14): number {
    // What the last effect left is long gone.
    for (let i = 0; i < 200; i++) this.fx.update();
    this.fx.play(style, kind, px(CENTER_X), px(GROUND_Y - CENTER_Y), 1);
    let peak = 0;
    for (let frame = 0; frame < frames; frame++) {
      this.fx.update();
      peak = Math.max(peak, litArea(this.recorded.atlas, this.recorded.images, this.drawnBy));
    }
    return peak;
  }

  /**
   * What a blow's effect hides on each of its first `frames` display frames, its blow going to
   * the right (its attacker on the left), its heart `at` world px from the impact.
   */
  covers(style: HitStyle, kind: HitKind, frames = 14, at = 0): Cover[] {
    for (let i = 0; i < 200; i++) this.fx.update();
    this.fx.play(style, kind, px(CENTER_X), px(GROUND_Y - CENTER_Y), 1);
    return Array.from({ length: frames }, () => {
      this.fx.update();
      return coverOf(this.recorded.atlas, this.recorded.images, at);
    });
  }
}
