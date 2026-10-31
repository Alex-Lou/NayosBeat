import type Phaser from 'phaser';
import { ART_SCALE, type FighterArt } from '../art/types';
import { textureKey } from './art-textures';
import { opaqueCount, type Pixels } from './dissolve';
import { freshPixels, litPixels } from './luminance';

/** A frame of a strip of front effects, as it is drawn. */
export interface FxFrame {
  readonly pixels: Pixels;
  /** The pixels it shows. */
  readonly count: number;
  /** World px² it lights over the stage (ΔL ≥ 0.1: docs/flashs.md §1.1), drawn lit. */
  readonly lit: number;
}

/**
 * The pixels of a fighter's front effects, read from their textures once a frame, then kept: what
 * dissolves (FxDissolve), and what the flash budget counts of them (docs/flashs.md §4).
 */
export class FxPixels {
  private readonly frames = new Map<string, FxFrame>();
  /** World px² each frame lights that another of its strip did not, by `${key}#${from}>${to}`. */
  private readonly fresh = new Map<string, number>();
  /** The canvas each frame is read through, made on the first read. */
  private reader: CanvasRenderingContext2D | null | undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: FighterArt,
    /** The stage's large colors, which the lit pixels are judged over (none: nothing lights). */
    private readonly stage: readonly number[] = [],
  ) {}

  /** A frame of a strip, or undefined while its texture is not loaded. */
  of(sheet: string, frame: number): FxFrame | undefined {
    const key = textureKey(this.art, sheet, 'fx');
    const id = `${key}#${frame}`;
    const known = this.frames.get(id);
    if (known) return known;
    if (!this.scene.textures.exists(key)) return undefined;
    const texture = this.scene.textures.get(key);
    const cut = texture.get(frame);
    const image = texture.getSourceImage() as CanvasImageSource;
    this.reader ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const context = this.reader;
    if (!context) return undefined;
    // Sized anew for each frame, which clears it.
    context.canvas.width = cut.cutWidth;
    context.canvas.height = cut.cutHeight;
    context.drawImage(
      image,
      cut.cutX,
      cut.cutY,
      cut.cutWidth,
      cut.cutHeight,
      0,
      0,
      cut.cutWidth,
      cut.cutHeight,
    );
    const pixels = context.getImageData(0, 0, cut.cutWidth, cut.cutHeight);
    const lit = litPixels(pixels.data, this.stage) / ART_SCALE ** 2;
    const read = { pixels, count: opaqueCount(pixels), lit };
    this.frames.set(id, read);
    return read;
  }

  /**
   * World px² frame `to` of a strip lights that frame `from` of the same strip (drawn at the same
   * place: the same cell, the same anchor) did not; from -1, all it lights. Undefined while its
   * texture is not loaded.
   */
  lightsAnew(sheet: string, from: number, to: number): number | undefined {
    const shown = this.of(sheet, to);
    if (!shown || from < 0) return shown?.lit;
    const id = `${textureKey(this.art, sheet, 'fx')}#${from}>${to}`;
    const known = this.fresh.get(id);
    if (known !== undefined) return known;
    const before = this.of(sheet, from);
    if (!before) return shown.lit;
    const lit = freshPixels(before.pixels.data, shown.pixels.data, this.stage) / ART_SCALE ** 2;
    this.fresh.set(id, lit);
    return lit;
  }
}
