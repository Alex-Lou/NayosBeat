import type Phaser from 'phaser';
import { ART_SCALE, cellOf, type Cell, type FighterArt } from '../art/types';
import { anchorOrigin } from './anchor-origin';
import { stripName, textureKey } from './art-textures';
import { DEPTH } from './depth';
import {
  DISSOLVE_FRAMES,
  MIN_GHOST_PIXELS,
  opaqueCount,
  paintGhost,
  SHRINK,
  vanishing,
  type DissolveStyle,
  type Ghost,
  type Pixels,
} from './dissolve';

/** Ghosts going at once, per fighter: the oldest is reused. */
const POOL = 4;
/** Display frames between two repaints: the dissolve steps like the pixel art, and uploads less. */
const STEP = 2;
/** Room around a cell for the pieces to drift into, in cell pixels. */
const MARGIN = 24;

/** A frame of a strip, where it shows. */
export interface ShownFrame {
  readonly sheet: string;
  readonly frame: number;
  readonly x: number;
  readonly y: number;
  readonly flip: boolean;
}

interface Slot {
  readonly image: Phaser.GameObjects.Image;
  readonly texture: Phaser.Textures.CanvasTexture;
  readonly pixels: ImageData;
  ghost: Ghost | null;
  /** The frame it is the ghost of: shown again there, the ghost goes (never a doubled glow). */
  from: ShownFrame | null;
  cell: Cell;
  age: number;
  painted: number;
}

/** A frame of a strip, its pixels and how many it shows. */
interface Source {
  readonly pixels: Pixels;
  readonly count: number;
}

/**
 * The ghosts of a fighter's effects (docs/art/dissolution.md): when a frame of the effects of a
 * special, a Remix or a super gives way to one that no longer shows some of it (or to none, the
 * move over or cut short), what goes dissolves where it was (src/render/dissolve.ts). The
 * pixels of each frame are read once from its strip, then kept.
 */
export class FxDissolve {
  private readonly slots: Slot[];
  private readonly sources = new Map<string, Source>();
  private previous: ShownFrame | null = null;
  private previousStylish = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: FighterArt,
    private readonly style: DissolveStyle,
    /** The fighter's energy: the rim of the dissolve. */
    private readonly rim: number,
    /** prefers-reduced-motion: the pixels go where they are, without drifting. */
    private readonly still: boolean,
  ) {
    const size = largestCell(art);
    const width = size.width + 2 * MARGIN;
    const height = size.height + 2 * MARGIN;
    this.slots = Array.from({ length: POOL }, (_, index) => {
      const key = `${art.key}/dissolve/${index}`;
      const texture = (
        scene.textures.exists(key)
          ? scene.textures.get(key)
          : scene.textures.createCanvas(key, width, height)
      ) as Phaser.Textures.CanvasTexture;
      const image = scene.add
        .image(0, 0, key)
        .setScale(1 / ART_SCALE)
        .setDepth(DEPTH.effects)
        .setVisible(false);
      return {
        image,
        texture,
        pixels: texture.context.createImageData(width, height),
        ghost: null,
        from: null,
        cell: size,
        age: 0,
        painted: 0,
      };
    });
  }

  /**
   * The frame of effects shown now (null: none), and whether it is stylish (a special, a Remix,
   * a super: what dissolves). Call once per display frame, `frames` of 1/60 s after the last.
   * What dissolves: the effects of a stylish move when they stop (the move over or cut short),
   * or when they fade out (a frame keeping less than SHRINK of the last one's pixels).
   */
  follow(shown: ShownFrame | null, stylish: boolean, frames: number): void {
    this.advance(frames);
    const before = this.previous;
    if (before && this.previousStylish && !sameFrame(before, shown)) {
      const sameCell = shown !== null && shown.sheet === before.sheet && shown.flip === before.flip;
      if (!sameCell) this.spawn(before, null);
      else if (this.shrinks(before, shown)) this.spawn(before, shown);
    }
    if (shown) {
      for (const slot of this.slots) {
        if (slot.from && sameFrame(slot.from, shown) && samePlace(slot.from, shown))
          this.retire(slot);
      }
    }
    this.previous = shown ? { ...shown } : null;
    this.previousStylish = stylish;
  }

  /** `to` keeps less than SHRINK of `from`'s pixels: the effect fades out. */
  private shrinks(from: ShownFrame, to: ShownFrame): boolean {
    const a = this.sourceOf(from.sheet, from.frame);
    const b = this.sourceOf(to.sheet, to.frame);
    return a !== undefined && b !== undefined && b.count < SHRINK * a.count;
  }

  /** Lets every ghost go at once (a new round). */
  clear(): void {
    for (const slot of this.slots) this.retire(slot);
    this.previous = null;
  }

  private spawn(from: ShownFrame, to: ShownFrame | null): void {
    const source = this.sourceOf(from.sheet, from.frame);
    if (!source) return;
    const cell = cellOf(this.art, stripName(from.sheet, 'fx'));
    const remaining = to ? (this.sourceOf(to.sheet, to.frame)?.pixels ?? null) : null;
    const ghost = vanishing(source.pixels, remaining, this.style, cell.anchor.x);
    if (ghost.count < MIN_GHOST_PIXELS) return;
    // A free slot, else the ghost furthest gone.
    let slot = this.slots.find((candidate) => !candidate.ghost);
    if (!slot) {
      for (const candidate of this.slots) if (!slot || candidate.age > slot.age) slot = candidate;
    }
    if (!slot) return;
    slot.ghost = ghost;
    slot.from = { ...from };
    slot.cell = cell;
    slot.age = 0;
    const { width, height } = slot.pixels;
    const origin = anchorOrigin(
      { width, height, anchor: { x: cell.anchor.x + MARGIN, y: cell.anchor.y + MARGIN } },
      from.flip,
    );
    slot.image.setOrigin(origin.x, origin.y).setPosition(from.x, from.y).setFlipX(from.flip);
    this.paint(slot);
  }

  private advance(frames: number): void {
    for (const slot of this.slots) {
      if (!slot.ghost) continue;
      const before = Math.floor(slot.age / STEP);
      slot.age += frames;
      if (slot.age >= DISSOLVE_FRAMES) {
        this.retire(slot);
        continue;
      }
      if (Math.floor(slot.age / STEP) !== before) this.paint(slot);
    }
  }

  private paint(slot: Slot): void {
    const { ghost, pixels, cell } = slot;
    if (!ghost) return;
    pixels.data.fill(0);
    const progress = slot.age / DISSOLVE_FRAMES;
    slot.painted = paintGhost(
      ghost,
      progress,
      this.style,
      this.rim,
      this.still,
      pixels,
      MARGIN,
      MARGIN,
      cell.anchor.x,
    );
    if (slot.painted === 0) {
      this.retire(slot);
      return;
    }
    slot.texture.context.putImageData(pixels, 0, 0);
    slot.texture.refresh();
    slot.image.setVisible(true);
  }

  private retire(slot: Slot): void {
    slot.ghost = null;
    slot.from = null;
    slot.image.setVisible(false);
  }

  /** The pixels of a frame of a strip, read from its image once. */
  private sourceOf(sheet: string, frame: number): Source | undefined {
    const key = textureKey(this.art, sheet, 'fx');
    const id = `${key}#${frame}`;
    const known = this.sources.get(id);
    if (known) return known;
    if (!this.scene.textures.exists(key)) return undefined;
    const texture = this.scene.textures.get(key);
    const cut = texture.get(frame);
    const image = texture.getSourceImage() as CanvasImageSource;
    const canvas = document.createElement('canvas');
    canvas.width = cut.cutWidth;
    canvas.height = cut.cutHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
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
    const source = { pixels, count: opaqueCount(pixels) };
    this.sources.set(id, source);
    return source;
  }
}

function sameFrame(a: ShownFrame, b: ShownFrame | null): boolean {
  return b !== null && a.sheet === b.sheet && a.frame === b.frame && a.flip === b.flip;
}

function samePlace(a: ShownFrame, b: ShownFrame): boolean {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
}

/** The largest cell of a fighter's effects: every ghost fits in a slot. */
function largestCell(art: FighterArt): Cell {
  let width = 1;
  let height = 1;
  for (const sheet of Object.keys(art.fx ?? {})) {
    const cell = cellOf(art, stripName(sheet, 'fx'));
    width = Math.max(width, cell.width);
    height = Math.max(height, cell.height);
  }
  return { width, height, anchor: { x: 0, y: 0 } };
}
