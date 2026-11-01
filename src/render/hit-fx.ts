import Phaser from 'phaser';
import { ART_SCALE } from '../art/types';
import { toPx } from '../core/constants';
import { DEPTH } from './depth';
import {
  ARC,
  AURA_SCALE,
  HD_FLIPBOOKS,
  HD_SHAPES,
  paint,
  sizeOf,
  type HdShape,
  type HdShapeName,
} from './hd-shapes';
import type { HitStyle } from './hit-styles';
import type { RenderMode } from './render-mode';
import { VIEW_SIZE } from './view';

/**
 * `pulse`: a super's blow before its last (BOOM, BOOM, BOOOOM), smaller, without the flash; it is
 * also what a heavy blow plays when the flash budget mutes it, `koMuted` what a KO plays then
 * (docs/flashs.md §4).
 */
export type HitKind = 'light' | 'heavy' | 'block' | 'ko' | 'pulse' | 'koMuted';

type FlipbookName = keyof typeof HD_FLIPBOOKS;
/** What a piece draws: a shape of its own, or a flipbook of several. */
type ImageName =
  Exclude<HdShapeName, (typeof HD_FLIPBOOKS)[FlipbookName]['keys'][number]> | FlipbookName;

/**
 * Pools of pieces, back to front, each drawing one image. Riff's glows and blades are added
 * (they light up what they cross). Nayo's are all blended over what they cross, so they keep
 * their colors over light clothes too, where an added color turns white; only his tiny glints
 * are added. A full pool reuses its oldest piece.
 */
const LAYERS = {
  halo: { image: 'glow', size: 12, add: true },
  ring: { image: 'ring', size: 8, add: true },
  cut: { image: 'cut', size: 12, add: true },
  puff: { image: 'puff', size: 12, add: false },
  warm: { image: 'glow', size: 8, add: false },
  aura: { image: 'aura', size: 6, add: false },
  splash: { image: 'splash', size: 8, add: false },
  line: { image: 'streak', size: 12, add: false },
  burst: { image: 'burst', size: 6, add: false },
  front: { image: 'front', size: 8, add: false },
  drop: { image: 'drop', size: 32, add: false },
  spark: { image: 'spark', size: 72, add: true },
  shard: { image: 'shard', size: 40, add: true },
  speck: { image: 'shard', size: 72, add: false },
  streak: { image: 'streak', size: 56, add: false },
  arc: { image: 'arc', size: 24, add: false },
  guard: { image: 'guard', size: 4, add: false },
  twinkle: { image: 'twinkle', size: 40, add: false },
  glint: { image: 'glow', size: 6, add: true },
} as const satisfies Record<string, { image: ImageName; size: number; add: boolean }>;

type LayerName = keyof typeof LAYERS;

/**
 * All the images share one texture, as its frames: a whole effect draws in one batch, and it is
 * uploaded once. A flipbook's keys are frames of their own (see frameOf).
 */
const ATLAS = 'hd:atlas';
const ATLAS_WIDTH = 1024;
/** Pixels left clear between frames, so that filtering never bleeds across. */
const GUTTER = 2;

/** What a piece does over its life, in world pixels, radians and display frames. */
interface PieceSpec {
  readonly layer: LayerName;
  /** Tint of a white shape (painted shapes keep their colors). */
  readonly color?: number;
  readonly life: number;
  /** Frames before it shows up. */
  readonly delay?: number;
  /** Flipbooks: frames each key shows, one after the other (they add up to `life`). */
  readonly keys?: readonly number[];
  /** Flipbooks: the size of each key, against the piece's. */
  readonly scales?: readonly number[];
  /** Width and height when it starts, and when it ends (eased out). */
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  /** How sharply it grows: the higher, the more of its growth is in its first frames. */
  readonly ease?: number;
  /** Grows from `from` to `to` and back instead (sparkles). */
  readonly pulse?: boolean;
  readonly alpha?: number;
  /** How fast it fades: the higher, the sooner (alpha follows (1 - t) ** fade). */
  readonly fade?: number;
  /** Part of its life it stays fully opaque before fading. */
  readonly hold?: number;
  /** Rotation of the shape, and its mirror image left to right (a blow to the left). */
  readonly angle?: number;
  readonly mirror?: boolean;
  /** Speed along `direction` (by default along `angle`), slowed by `drag` every frame. */
  readonly speed?: number;
  readonly direction?: number;
  readonly drag?: number;
  readonly gravity?: number;
  /** Rotation added every frame. */
  readonly spin?: number;
  /** Keeps the shape turned along its motion (sparks). */
  readonly align?: boolean;
}

interface Piece {
  readonly image: Phaser.GameObjects.Image;
  spec: PieceSpec;
  /** Frames it has been shown (below 0 while it waits for its delay); past `life`, idle. */
  age: number;
  life: number;
  /** Flipbooks: the key it shows. */
  key: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Its blow's size over its own (smaller at the Finisher's close up). */
  size: number;
}

/** Sizes of Riff's effect for one kind of blow (world pixels). */
interface Burst {
  readonly glow: number;
  readonly core: number;
  readonly blades: number;
  readonly blade: number;
  readonly ring: number;
  readonly sparks: number;
  readonly shards: number;
  /** Lifetime multiplier. */
  readonly life: number;
}

const BURSTS: Readonly<Record<Exclude<HitKind, 'block'>, Burst>> = {
  light: { glow: 36, core: 14, blades: 1, blade: 32, ring: 0, sparks: 8, shards: 3, life: 1 },
  heavy: { glow: 52, core: 20, blades: 2, blade: 50, ring: 58, sparks: 18, shards: 8, life: 1.25 },
  ko: { glow: 74, core: 28, blades: 3, blade: 64, ring: 86, sparks: 30, shards: 14, life: 1.6 },
  // Her heavy blow is already under a flash's area (docs/flashs.md §2); her muted KO, about as
  // big, throws more and lingers.
  pulse: { glow: 52, core: 20, blades: 2, blade: 50, ring: 58, sparks: 18, shards: 8, life: 1.25 },
  koMuted: {
    glow: 44,
    core: 16,
    blades: 2,
    blade: 46,
    ring: 54,
    sparks: 22,
    shards: 10,
    life: 1.4,
  },
};

/** Nayo's hit for one kind of blow: its size (world pixels), its timing and what flies out. */
interface Star {
  /** Height of the burst (it is STRETCH times wider, along the blow). */
  readonly size: number;
  /**
   * Display frames each key of the burst shows: the flash, the blast, breaking up, the flare,
   * its embers. Every key is fully opaque: the burst never fades into a ghost of itself.
   */
  readonly keys: readonly [number, number, number, number, number];
  /** Lifetime multiplier of the rest: a light blow is snappy, a KO lingers. */
  readonly life: number;
  readonly streaks: number;
  readonly drops: number;
  readonly twinkles: number;
  readonly specks: number;
  /** Motion arcs on the side the blow comes from, and beyond the impact. */
  readonly arcs: number;
  readonly farArcs: number;
  /** Speed lines shooting into the impact along the blow. */
  readonly lines: number;
  /** Shock fronts pushed along the blow. */
  readonly fronts: number;
  /** Nayo's power splash, in his energy, behind the burst. */
  readonly splash: boolean;
  /**
   * KO only: radial lines bursting out slowly, and embers, smoke and sparkles drifting on
   * through the slow motion that follows.
   */
  readonly linger: number;
  /** The aura's alpha (0.85), its size (AURA_SCALE), the warm glow's alpha (0.35): less on a pulse. */
  readonly aura?: number;
  readonly auraScale?: number;
  readonly warm?: number;
}

const STARS: Readonly<Record<Exclude<HitKind, 'block'>, Star>> = {
  // The burst is over with the hitstop (8 frames).
  light: {
    size: 34,
    keys: [1, 1, 2, 1, 2],
    life: 0.7,
    streaks: 3,
    drops: 3,
    twinkles: 3,
    specks: 7,
    arcs: 2,
    farArcs: 0,
    lines: 1,
    fronts: 0,
    splash: false,
    linger: 0,
  },
  // The burst is over in 10 frames, its debris in about 15 (0.25 s).
  heavy: {
    size: 58,
    keys: [1, 2, 2, 3, 2],
    life: 1,
    streaks: 6,
    drops: 6,
    twinkles: 8,
    specks: 16,
    arcs: 3,
    farArcs: 2,
    lines: 2,
    fronts: 1,
    splash: true,
    linger: 0,
  },
  // The burst is over in 12 frames; what lingers lasts the slow motion (50 frames).
  ko: {
    size: 86,
    keys: [1, 3, 2, 3, 3],
    life: 1.4,
    streaks: 10,
    drops: 10,
    twinkles: 11,
    specks: 22,
    arcs: 3,
    farArcs: 3,
    lines: 3,
    fronts: 2,
    splash: true,
    linger: 14,
  },
  // A heavy blow's silhouette without its flash (no first key) nor its splash: under a flash's
  // area (docs/flashs.md §2), the super's last blow keeps the big one.
  pulse: {
    size: 46,
    keys: [0, 2, 2, 3, 2],
    life: 1,
    streaks: 4,
    drops: 4,
    twinkles: 4,
    specks: 10,
    arcs: 3,
    farArcs: 2,
    lines: 2,
    fronts: 0,
    splash: false,
    linger: 0,
    aura: 0.45,
    auraScale: 1.3,
    warm: 0.2,
  },
  // A KO the flash budget mutes: the pulse's silhouette, a beat longer, its embers and smoke
  // drifting on through the slow motion (docs/flashs.md §4).
  koMuted: {
    size: 38,
    keys: [0, 3, 2, 3, 3],
    life: 1.2,
    streaks: 5,
    drops: 5,
    twinkles: 5,
    specks: 12,
    arcs: 3,
    farArcs: 2,
    lines: 2,
    fronts: 0,
    splash: false,
    linger: 14,
    aura: 0.45,
    auraScale: 1.3,
    warm: 0.2,
  },
};

/** Lowest height of a KO burst's center (world pixels): half the biggest burst, Nayo's. */
const KO_LIFT = Math.max(STARS.ko.size, BURSTS.ko.glow) / 2;

/** The burst is this much wider than high, along the blow. */
const STRETCH = 1.15;

/** The KO's smoke: the burst's slate, tinged with the winner's energy (never a grey smudge). */
const SMOKE_SLATE = 0x33334a;
const EMBER_TINT = 0xff6a1a;
/** No tint: a shape in its own colors (a white shape white, a painted one as painted). */
const WHITE = 0xffffff;

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** A color brought `amount` (0 to 1) of the way to another. */
function blend(color: number, to: number, amount: number): number {
  const channel = (shift: number): number => {
    const value = (color >> shift) & 0xff;
    return Math.round(value + (((to >> shift) & 0xff) - value) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

function lighten(color: number, amount: number): number {
  return blend(color, 0xffffff, amount);
}

function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

/** The atlas frame of an image, or of one key of a flipbook. */
function frameOf(image: ImageName, key = 0): string {
  return image in HD_FLIPBOOKS ? `${image}:${key}` : image;
}

/** A shape of the atlas still to paint, from its row `row` on. */
interface PaintJob {
  readonly shape: HdShape;
  readonly detail: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  row: number;
}

/** Atlas painting still to do, shared by every HitFx: the atlas belongs to the game. */
const painting: { atlas: Phaser.Textures.CanvasTexture | undefined; jobs: PaintJob[] } = {
  atlas: undefined,
  jobs: [],
};

/** Rows painted at a time: few enough to stop close to the frame's budget. */
const PAINT_ROWS = 8;

/**
 * Display frame time (ms) given to painting the atlas, during the round's intro (90 frames, no
 * blow can land): a fast computer is done in a few frames, a slow phone within the intro.
 */
const PAINT_BUDGET_MS = 6;

/**
 * The atlas, drawn once per game, smooth when scaled: white shapes are tinted per piece,
 * painted ones keep their colors. Painting it all takes from a tenth of a second (a fast
 * computer) to half a second (a slow one), so it is painted a few rows at a time over the
 * first display frames (see paintAtlas), and uploaded once at the end. A canvas only as fine
 * as the sprites (phones: see renderScaleFor) gets the big shapes at half size: it could not
 * show more, and painting them is the slow part on a phone.
 */
function createAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(ATLAS)) return;
  const detail = scene.scale.width / VIEW_SIZE.width <= ART_SCALE ? 0.5 : 1;
  const frames: { name: string; shape: HdShape; width: number; height: number }[] = [];
  const add = (name: string, shape: HdShape): void => {
    frames.push({ name, shape, ...sizeOf(shape, detail) });
  };
  const flipbooks: Readonly<Record<string, { keys: readonly HdShapeName[] }>> = HD_FLIPBOOKS;
  const inFlipbook = new Set(Object.values(flipbooks).flatMap(({ keys }) => keys));
  for (const [name, { keys }] of Object.entries(flipbooks)) {
    keys.forEach((key, i) => {
      add(`${name}:${i}`, HD_SHAPES[key]);
    });
  }
  for (const name of Object.keys(HD_SHAPES) as HdShapeName[]) {
    if (!inFlipbook.has(name)) add(name, HD_SHAPES[name]);
  }
  // Shelves of frames, the tallest first, each frame on the first shelf with room for it.
  frames.sort((a, b) => b.height - a.height);
  const shelves: { x: number; y: number; height: number }[] = [];
  const placed = frames.map(({ width, height }) => {
    let shelf = shelves.find((candidate) => candidate.x + width <= ATLAS_WIDTH);
    if (!shelf) {
      const last = shelves[shelves.length - 1];
      shelf = { x: 0, y: last ? last.y + last.height + GUTTER : 0, height };
      shelves.push(shelf);
    }
    const at = { x: shelf.x, y: shelf.y };
    shelf.x += width + GUTTER;
    return at;
  });
  const last = shelves[shelves.length - 1];
  const atlas = scene.textures.createCanvas(ATLAS, ATLAS_WIDTH, last ? last.y + last.height : 1);
  if (!atlas) return;
  atlas.setFilter(Phaser.Textures.FilterMode.LINEAR);
  frames.forEach(({ name, shape, width, height }, i) => {
    const { x: left, y: top } = placed[i] ?? { x: 0, y: 0 };
    atlas.add(name, 0, left, top, width, height);
    painting.jobs.push({ shape, detail, x: left, y: top, width, height, row: 0 });
  });
  painting.atlas = atlas;
}

/** Paints the atlas for up to `budget` ms; uploads it once it is all painted. */
function paintAtlas(budget: number): void {
  const { atlas, jobs } = painting;
  if (!atlas) return;
  const start = performance.now();
  while (jobs.length > 0 && performance.now() - start < budget) {
    const job = jobs[0];
    if (!job) break;
    const rows = Math.min(PAINT_ROWS, job.height - job.row);
    const image = atlas.context.createImageData(job.width, rows);
    image.data.set(paint(job.shape, job.detail, job.row, job.row + rows));
    atlas.context.putImageData(image, job.x, job.y + job.row);
    job.row += rows;
    if (job.row >= job.height) jobs.shift();
  }
  if (jobs.length > 0) return;
  atlas.refresh();
  painting.atlas = undefined;
}

/**
 * High definition hit effects over the pixel art, in the attacker's own shape and colors (see
 * HitStyle). Nayo hits like Tazz in Zen-Tazzer: a painted burst of fire, flashing, blasting,
 * breaking up into a flare of thin rays and dying in embers, teardrop shards, sparkles and fast
 * streaks, his neon energy all around it (an aura, a splash on heavy blows, motion arcs, speed
 * lines, a shock front). Riff cuts with additive blades and shards. Effects run on the display
 * clock (hitstop freezes the fighters, not them). Every piece comes from a fixed pool: nothing
 * is created during a fight. Drawn without tints (`mode` simple), a piece tinted any color but
 * white is not played: its white shape would show white, brighter than the budget counted it;
 * the painted shapes play as ever.
 */
export class HitFx {
  /** Pieces of each layer, and its frames (a flipbook's keys, in order). */
  private readonly pools = new Map<
    LayerName,
    { pieces: Piece[]; next: number; frames: readonly string[] }
  >();

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly mode: RenderMode,
  ) {
    createAtlas(scene);
    for (const name of Object.keys(LAYERS) as LayerName[]) {
      const { image, size, add } = LAYERS[name];
      const blend = add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL;
      const keys = image in HD_FLIPBOOKS ? HD_FLIPBOOKS[image as FlipbookName].keys : [image];
      const frames = keys.map((_, key) => frameOf(image, key));
      const pieces = Array.from({ length: size }, (): Piece => ({
        image: scene.add
          .image(0, 0, ATLAS, frames[0])
          .setBlendMode(blend)
          .setDepth(DEPTH.sparks)
          .setVisible(false),
        spec: { layer: name, life: 0, from: [0, 0], to: [0, 0] },
        age: 1,
        life: 0,
        key: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
      }));
      this.pools.set(name, { pieces, next: 0, frames });
    }
  }

  /** The impact the effect being played bursts from, and its size: its pieces scale from there. */
  private readonly origin = { x: 0, y: 0, size: 1 };

  /**
   * Plays a blow's effect at a point in stage coordinates (sub-pixels, y up from the ground),
   * the blow going `away` (1: to the right); `size` times its own, every piece around the impact
   * (the Finisher's close up: docs/finisher.md §1.14).
   */
  play(style: HitStyle, kind: HitKind, x: number, y: number, away: 1 | -1, size = 1): void {
    // A blow before the atlas is all painted (never seen: the intro is longer) waits for it.
    paintAtlas(Infinity);
    const px = toPx(x);
    // The KO of a sweep lands at the feet: its burst rises above the floor, not through it.
    const ko = kind === 'ko' || kind === 'koMuted';
    const py = this.groundY - Math.max(toPx(y), ko ? KO_LIFT : 0);
    this.origin.x = px;
    this.origin.y = py;
    this.origin.size = size;
    const direction = away > 0 ? 0 : Math.PI;
    if (style.shape === 'slash') {
      if (kind === 'block') this.guard(style, px, py, direction);
      else this.star(style, STARS[kind], px, py, direction);
    } else if (kind === 'block') {
      this.clawBlock(style, px, py, direction);
    } else {
      this.claw(style, BURSTS[kind], px, py, direction);
    }
  }

  /**
   * Shows the effects' next display frame. A piece played this frame shows its first state now:
   * play() only places it.
   */
  update(): void {
    paintAtlas(PAINT_BUDGET_MS);
    for (const { pieces, frames } of this.pools.values()) {
      for (const piece of pieces) {
        if (piece.age > piece.life) continue;
        if (piece.age === piece.life) {
          piece.image.setVisible(false);
          piece.age += 1;
          continue;
        }
        if (piece.age >= 0) this.draw(piece, frames);
        piece.age += 1;
      }
    }
  }

  /**
   * Nayo, after Tazz's hit effect: a burst of fire flashes pale gold, blasts into a fat star
   * with a smoky heart, breaks up into a flare of thin rays and dies in embers, all by changing
   * shape. Teardrop shards, specks and streaks fly out, sparkles twinkle around it. His neon
   * energy shines around the blast, splashes past it on heavy blows, ripples in arcs and speed
   * lines along the blow and pushes a shock front ahead of it.
   */
  private star(style: HitStyle, star: Star, x: number, y: number, direction: number): void {
    const { size, life, keys } = star;
    const auraScale = star.auraScale ?? AURA_SCALE;
    const mirror = direction !== 0;
    const tilt = random(-0.15, 0.15);
    const ahead = Math.cos(direction);
    const burstLife = sum(keys);
    // Along the blow (its width) and across it.
    const stretch = (scale: number): [number, number] => [size * STRETCH * scale, size * scale];
    const energy = style.energy;
    const pale = lighten(energy, 0.55);
    // The burst grows fast, its aura with it.
    const grow = { from: stretch(0.78), to: stretch(1.06), ease: 4, angle: tilt, mirror };
    this.spawn(
      {
        layer: 'warm',
        color: style.strike,
        life: keys[0] + keys[1],
        from: stretch(1.1),
        to: stretch(1.35),
        alpha: star.warm ?? 0.35,
        fade: 1.5,
      },
      x,
      y,
    );
    this.spawn(
      {
        layer: 'aura',
        color: energy,
        life: burstLife,
        ...grow,
        from: stretch(0.78 * auraScale),
        to: stretch(1.06 * auraScale),
        alpha: star.aura ?? 0.85,
        hold: 0.15,
        fade: 4,
      },
      x,
      y,
    );
    if (star.splash) {
      // Behind the burst, reaching past it ahead: his energy splashing through the target.
      this.spawn(
        {
          layer: 'splash',
          color: energy,
          delay: keys[0],
          life: keys[1] + 2,
          ...grow,
          from: stretch(1.5),
          to: stretch(1.8),
          alpha: 0.9,
          hold: 0.3,
          fade: 1.6,
        },
        x,
        y,
      );
    }
    for (let i = 0; i < star.lines; i++) {
      // From behind the impact, dying in it: where the blow came from.
      const offset = (i - (star.lines - 1) / 2) * size * 0.1 + random(-1, 1);
      this.spawn(
        {
          layer: 'line',
          color: i === 0 ? pale : energy,
          delay: i,
          life: 4,
          from: [size * 0.9, 1.6],
          to: [size * 0.3, 0.6],
          direction,
          speed: size * 0.09,
          drag: 0.8,
          align: true,
        },
        x - ahead * size * 0.75,
        y + offset,
      );
    }
    this.spawn(
      {
        layer: 'burst',
        life: burstLife,
        keys,
        scales: HD_FLIPBOOKS.burst.scales,
        ...grow,
        // Opaque to its last frame: it goes away by changing shape (a faded one is a ghost).
        fade: 0,
      },
      x,
      y,
    );
    for (let i = 0; i < star.fronts; i++) {
      // Pushed on ahead of the impact: the pressure of the blow.
      this.spawn(
        {
          layer: 'front',
          color: i === 0 ? energy : pale,
          delay: keys[0] + i * 2,
          life: 6,
          from: [size * 0.22, size * 0.5],
          to: [size * (0.42 + i * 0.1), size * (1.05 + i * 0.25)],
          alpha: 0.95 - i * 0.2,
          hold: 0.2,
          fade: 1.6,
          angle: direction,
          speed: 3.2 + i,
          drag: 0.8,
        },
        x + ahead * size * 0.3,
        y,
      );
    }
    this.arcs(style, star, x, y, direction);
    for (let i = 0; i < star.streaks; i++) {
      // Half the streaks fly on with the blow, the others every way.
      const angle = i % 2 === 0 ? direction + random(-0.6, 0.6) : random(0, Math.PI * 2);
      this.spawn(
        {
          layer: 'streak',
          color: i % 3 === 1 ? energy : style.strike,
          life: random(4, 6) * life,
          from: [size * random(0.4, 0.6), 2.2],
          to: [size * 0.2, 0.8],
          direction: angle,
          speed: random(5, 8) * Math.sqrt(life),
          drag: 0.85,
          align: true,
        },
        x + Math.cos(angle) * size * 0.2,
        y + Math.sin(angle) * size * 0.2,
      );
    }
    for (let i = 0; i < star.drops; i++) {
      // Thrown evenly all around, each a little off its share of the turn. Painted: they
      // shrink away rather than fade.
      const angle = direction + ((i + random(-0.3, 0.3)) / star.drops) * Math.PI * 2;
      const start = size * random(0.2, 0.35);
      this.spawn(
        {
          layer: 'drop',
          life: random(9, 13) * life,
          from: [size * 0.3, size * 0.085],
          to: [size * 0.06, size * 0.02],
          ease: 2,
          hold: 0.75,
          fade: 1.5,
          direction: angle,
          speed: random(2.5, 5.5) * Math.sqrt(life),
          drag: 0.87,
          gravity: 0.05,
          align: true,
        },
        x + Math.cos(angle) * start,
        y + Math.sin(angle) * start,
      );
    }
    for (let i = 0; i < star.specks; i++) {
      const angle = random(0, Math.PI * 2);
      const speck = random(1.6, 2.6);
      this.spawn(
        {
          layer: 'speck',
          color: i % 3 === 2 ? energy : style.strike,
          life: random(9, 15) * life,
          from: [speck, speck],
          to: [1, 1],
          hold: 0.4,
          direction: angle,
          speed: random(1.5, 4) * Math.sqrt(life),
          drag: 0.92,
          gravity: 0.05,
        },
        x + Math.cos(angle) * size * 0.3,
        y + Math.sin(angle) * size * 0.3,
      );
    }
    for (let i = 0; i < star.twinkles; i++) {
      const angle = random(0, Math.PI * 2);
      const distance = size * random(0.5, 0.95);
      const twinkle = random(7, 11) * Math.sqrt(size / STARS.heavy.size);
      this.spawn(
        {
          layer: 'twinkle',
          color: i % 2 === 0 ? energy : style.strike,
          delay: Math.round(random(1, 5) * life),
          life: random(6, 9) * life,
          from: [0, 0],
          to: [twinkle, twinkle],
          pulse: true,
          fade: 0.5,
        },
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
      );
    }
    if (star.linger > 0) this.linger(style, star, x, y);
  }

  /**
   * The KO's aftermath, played out through its slow motion: a ring of speed lines bursting out
   * slowly, embers rising, smoke hanging where the blow landed, late sparkles.
   */
  private linger(style: HitStyle, star: Star, x: number, y: number): void {
    const { size, linger } = star;
    for (let i = 0; i < linger; i++) {
      const angle = ((i + random(-0.3, 0.3)) / linger) * Math.PI * 2;
      this.spawn(
        {
          layer: 'streak',
          color: i % 2 === 0 ? style.energy : style.strike,
          delay: 2,
          life: random(18, 26),
          from: [size * 0.45, 1.8],
          to: [size * 0.8, 0.5],
          ease: 2,
          fade: 1.2,
          direction: angle,
          speed: random(3, 4.5),
          drag: 0.94,
          align: true,
        },
        x + Math.cos(angle) * size * 0.5,
        y + Math.sin(angle) * size * 0.5,
      );
      const from = random(0, Math.PI * 2);
      const at = size * random(0.1, 0.45);
      this.spawn(
        {
          layer: 'speck',
          color: i % 3 === 0 ? style.energy : i % 3 === 1 ? style.strike : EMBER_TINT,
          delay: Math.round(random(4, 18)),
          life: random(26, 40),
          from: [3.6, 3.6],
          to: [1.4, 1.4],
          hold: 0.5,
          fade: 1.2,
          direction: random(0, Math.PI * 2),
          speed: random(0.4, 1.4),
          drag: 0.97,
          gravity: -0.012,
        },
        x + Math.cos(from) * at,
        y + Math.sin(from) * at,
      );
    }
    const smoke = blend(SMOKE_SLATE, style.energy, 0.3);
    for (let i = 0; i < 4; i++) {
      // Rising off the impact, thinning out as it climbs.
      const from = random(0, Math.PI * 2);
      const puff = size * random(0.14, 0.2);
      this.spawn(
        {
          layer: 'puff',
          color: smoke,
          delay: Math.round(random(6, 10)),
          life: random(26, 34),
          from: [puff, puff],
          to: [puff * 2.2, puff * 2.2],
          ease: 2,
          alpha: 0.45,
          fade: 1.6,
          angle: random(0, Math.PI * 2),
          spin: random(-0.02, 0.02),
          direction: random(-Math.PI * 0.75, -Math.PI * 0.25),
          speed: random(0.6, 1),
          drag: 0.985,
        },
        x + Math.cos(from) * size * 0.12,
        y + Math.sin(from) * size * 0.12,
      );
    }
    for (let i = 0; i < 6; i++) {
      const angle = random(0, Math.PI * 2);
      const distance = size * random(0.3, 0.9);
      const twinkle = random(8, 13);
      this.spawn(
        {
          layer: 'twinkle',
          color: i % 2 === 0 ? style.energy : style.strike,
          delay: Math.round(random(10, 34)),
          life: random(10, 14),
          from: [0, 0],
          to: [twinkle, twinkle],
          pulse: true,
          fade: 0.5,
        },
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
      );
    }
  }

  /**
   * Short crescents rippling out of the impact in Nayo's energy, close to it: "((" on the arm's
   * line behind it, ")))" up ahead of it.
   */
  private arcs(style: HitStyle, star: Star, x: number, y: number, direction: number): void {
    const { size } = star;
    for (let i = 0; i < star.arcs; i++) {
      this.ripple(
        i === 0 ? lighten(style.energy, 0.35) : style.energy,
        x,
        y,
        direction + Math.PI + random(-0.08, 0.08),
        size * (0.42 + i * 0.075),
        size * 0.46,
        { delay: i, life: 5, alpha: 1 - i * 0.22, speed: 2 },
      );
    }
    const beyond = direction + (direction === 0 ? -0.35 : 0.35);
    for (let i = 0; i < star.farArcs; i++) {
      this.ripple(style.energy, x, y, beyond, size * (0.66 + i * 0.075), size * 0.34, {
        delay: 1 + i,
        life: 5,
        alpha: 0.9 - i * 0.2,
        speed: 1.8,
      });
    }
  }

  /**
   * A motion arc facing `angle`, its apex `distance` from (x, y), as curved as a circle of
   * `radius`, rippling on outward (its texture holds the arc only: see ARC).
   */
  private ripple(
    color: number,
    x: number,
    y: number,
    angle: number,
    distance: number,
    radius: number,
    motion: Pick<PieceSpec, 'delay' | 'life' | 'alpha' | 'speed'>,
  ): void {
    const scale = radius / ARC.radius;
    const size: [number, number] = [ARC.width * scale, ARC.height * scale];
    const offset = distance - ARC.apex * scale;
    this.spawn(
      { layer: 'arc', color, ...motion, from: size, to: size, fade: 1.6, angle, drag: 0.8 },
      x + Math.cos(angle) * offset,
      y + Math.sin(angle) * offset,
    );
  }

  /**
   * Nayo's blocked blow: his energy deflected off the guard. A shield flares up bulging back
   * toward him with a glint where the blow met it, ripples run off it, sparks glance away. No
   * fire: nothing went through.
   */
  private guard(style: HitStyle, x: number, y: number, direction: number): void {
    const back = direction + Math.PI;
    const guardX = x + Math.cos(back) * 2;
    const pale = lighten(style.energy, 0.55);
    this.spawn(
      { layer: 'warm', color: style.energy, life: 6, from: [16, 16], to: [30, 30], alpha: 0.3 },
      guardX,
      y,
    );
    this.spawn(
      {
        layer: 'guard',
        color: style.energy,
        life: 8,
        from: [16, 34],
        to: [20, 46],
        hold: 0.25,
        fade: 1.8,
        angle: back,
        direction: back,
        speed: 0.5,
        drag: 0.85,
      },
      guardX,
      y,
    );
    // The glint where the blow met the guard: sharp, gone at once, a few sparks bursting off it.
    this.spawn(
      { layer: 'twinkle', color: pale, life: 3, from: [28, 28], to: [14, 14], fade: 0.8 },
      guardX,
      y,
    );
    this.spawn(
      { layer: 'glint', color: style.energy, life: 3, from: [10, 10], to: [16, 16], alpha: 0.7 },
      guardX,
      y,
    );
    for (let i = 0; i < 4; i++) {
      const angle = back + (i - 1.5) * 0.7 + random(-0.15, 0.15);
      this.spawn(
        {
          layer: 'line',
          color: pale,
          life: 3,
          from: [9, 1.8],
          to: [4, 0.8],
          direction: angle,
          speed: 3.5,
          drag: 0.8,
          align: true,
        },
        guardX + Math.cos(angle) * 3,
        y + Math.sin(angle) * 3,
      );
    }
    for (let i = 0; i < 2; i++) {
      this.ripple(style.energy, guardX + Math.cos(direction) * 10, y, back, 8 + i * 4, 18, {
        delay: 1 + i,
        life: 6,
        alpha: 0.9 - i * 0.25,
        speed: 1.4,
      });
    }
    for (let i = 0; i < 6; i++) {
      // Glancing off the guard, never straight back.
      const side = i % 2 === 0 ? 1 : -1;
      const angle = back + side * random(0.5, 1.25);
      this.spawn(
        {
          layer: 'streak',
          color: i < 2 ? pale : style.energy,
          life: random(6, 8),
          from: [random(10, 15), 2],
          to: [4, 0.9],
          hold: 0.4,
          fade: 1,
          direction: angle,
          speed: random(3, 5),
          drag: 0.86,
          gravity: 0.12,
          align: true,
        },
        guardX,
        y + side * random(0, 6),
      );
    }
    for (const side of [-1, 1]) {
      this.spawn(
        {
          layer: 'twinkle',
          color: style.energy,
          delay: 2,
          life: 6,
          from: [0, 0],
          to: [9, 9],
          pulse: true,
          fade: 0.5,
        },
        guardX + Math.cos(back) * 3,
        y + side * 15,
      );
    }
  }

  /** Riff: crossed blade cuts (claw marks on heavy blows) and a spray of diamond shards. */
  private claw(style: HitStyle, burst: Burst, x: number, y: number, direction: number): void {
    this.flash(style, burst, x, y);
    const cut = (
      angle: number,
      length: number,
      offset: number,
      color: number,
      life: number,
    ): void => {
      this.spawn(
        {
          layer: 'cut',
          color,
          life: life * burst.life,
          from: [length * 0.3, 4],
          to: [length, 1.2],
          angle,
        },
        x - Math.sin(angle) * offset,
        y + Math.cos(angle) * offset,
      );
    };
    if (burst.blades === 1) {
      // Light blow: an X.
      cut(-0.8, burst.blade * 0.85, 0, style.energy, 8);
      cut(0.8, burst.blade * 0.85, 0, style.core, 9);
    } else {
      // Heavy blow: claw marks raking down across the blow.
      const angle = (direction === 0 ? 1 : -1) * 0.9;
      for (let i = 0; i < burst.blades + 1; i++) {
        const offset = (i - burst.blades / 2) * burst.blade * 0.16;
        cut(angle, burst.blade, offset, i === 1 ? style.core : style.energy, 8 + i);
      }
    }
    this.shockwave(style.strike, burst, x, y);
    this.shards(style.strike, burst.shards * 2, x, y, 1.4);
    this.sparks(style, Math.round(burst.sparks / 2), burst.life, x, y, direction);
  }

  /** Riff's blocked blow: a ring in her energy, shards glancing back off the guard. */
  private clawBlock(style: HitStyle, x: number, y: number, direction: number): void {
    this.spawn(
      { layer: 'halo', color: style.energy, life: 7, from: [10, 10], to: [22, 22], alpha: 0.5 },
      x,
      y,
    );
    this.spawn(
      { layer: 'ring', color: style.energy, life: 9, from: [4, 4], to: [30, 30], alpha: 0.85 },
      x,
      y,
    );
    for (let i = 0; i < 6; i++) {
      this.spawn(
        {
          layer: 'shard',
          color: style.energy,
          life: random(8, 12),
          from: [4, 4],
          to: [1.5, 1.5],
          angle: random(0, Math.PI),
          direction: direction + Math.PI + random(-0.9, 0.9),
          speed: random(1.5, 3),
          drag: 0.9,
          gravity: 0.1,
          spin: random(-0.3, 0.3),
        },
        x,
        y,
      );
    }
  }

  /** The glow of the impact in the strike's color, around a white-hot core. */
  private flash(style: HitStyle, burst: Burst, x: number, y: number): void {
    const { glow, core, life } = burst;
    this.spawn(
      {
        layer: 'halo',
        color: style.strike,
        life: 10 * life,
        from: [glow * 0.5, glow * 0.5],
        to: [glow, glow],
        alpha: 0.85,
      },
      x,
      y,
    );
    this.spawn(
      {
        layer: 'halo',
        color: style.core,
        life: 6 * life,
        from: [core * 0.6, core * 0.6],
        to: [core, core],
      },
      x,
      y,
    );
  }

  private shockwave(color: number, burst: Burst, x: number, y: number): void {
    if (burst.ring === 0) return;
    this.spawn(
      {
        layer: 'ring',
        color,
        life: 10 * burst.life,
        from: [8, 8],
        to: [burst.ring, burst.ring],
        alpha: 0.7,
        fade: 2.4,
      },
      x,
      y,
    );
  }

  private sparks(
    style: HitStyle,
    count: number,
    life: number,
    x: number,
    y: number,
    direction: number,
  ): void {
    for (let i = 0; i < count; i++) {
      // Most sparks fly on with the blow.
      const angle = i % 3 === 2 ? random(0, Math.PI * 2) : direction + random(-1.2, 1.2);
      this.spawn(
        {
          layer: 'spark',
          color: i % 2 === 0 ? style.strike : style.energy,
          life: random(10, 18) * life,
          from: [10, 2.4],
          to: [3, 1],
          angle,
          speed: random(2.5, 6) * Math.sqrt(life),
          drag: 0.9,
          gravity: 0.14,
          align: true,
        },
        x,
        y,
      );
    }
  }

  private shards(color: number, count: number, x: number, y: number, size: number): void {
    for (let i = 0; i < count; i++) {
      this.spawn(
        {
          layer: 'shard',
          color,
          life: random(12, 20),
          from: [4 * size, 4 * size],
          to: [1.5, 1.5],
          angle: random(0, Math.PI),
          direction: random(0, Math.PI * 2),
          speed: random(1.5, 3.5),
          drag: 0.93,
          gravity: 0.1,
          spin: random(-0.3, 0.3),
        },
        x,
        y,
      );
    }
  }

  /** Places a piece; the next update() shows it (after its delay). */
  private spawn(spec: PieceSpec, x: number, y: number): void {
    const tint = spec.color ?? WHITE;
    if (this.mode === 'simple' && tint !== WHITE) return;
    const pool = this.pools.get(spec.layer);
    const piece = pool?.pieces[pool.next];
    if (!pool || !piece) return;
    pool.next = (pool.next + 1) % pool.pieces.length;
    const direction = spec.direction ?? spec.angle ?? 0;
    const { origin } = this;
    const speed = (spec.speed ?? 0) * origin.size;
    piece.spec = spec;
    piece.age = -Math.max(0, Math.round(spec.delay ?? 0));
    piece.life = Math.max(1, Math.round(spec.life));
    piece.key = -1;
    piece.x = origin.x + (x - origin.x) * origin.size;
    piece.y = origin.y + (y - origin.y) * origin.size;
    piece.vx = Math.cos(direction) * speed;
    piece.vy = Math.sin(direction) * speed;
    piece.size = origin.size;
    piece.image
      .setTint(tint)
      .setRotation(spec.angle ?? 0)
      .setFlip(spec.mirror ?? false, false)
      .setVisible(false);
  }

  /** Shows a piece as it is `age` frames into its life: where it started on its first frame. */
  private draw(piece: Piece, frames: readonly string[]): void {
    const { spec, image, age, life } = piece;
    if (age > 0) {
      const drag = spec.drag ?? 1;
      piece.vx *= drag;
      piece.vy = piece.vy * drag + (spec.gravity ?? 0) * piece.size;
      piece.x += piece.vx;
      piece.y += piece.vy;
      if (spec.spin) image.setRotation(image.rotation + spec.spin);
    }
    const t = age / life;
    // Sparkles swell and shrink over their life; the rest grow, fast then slower.
    const grow = spec.pulse
      ? Math.sin((Math.PI * (age + 1)) / (life + 1))
      : 1 - (1 - t) ** (spec.ease ?? 3);
    const width = spec.from[0] + (spec.to[0] - spec.from[0]) * grow;
    const height = spec.from[1] + (spec.to[1] - spec.from[1]) * grow;
    const hold = spec.hold ?? 0;
    const fading = Math.min(1, Math.max(0, (t - hold) / (1 - hold)));
    const scale =
      (spec.keys ? this.showKey(piece, frames, spec.keys, spec.scales) : 1) * piece.size;
    image
      .setPosition(piece.x, piece.y)
      .setDisplaySize(width * scale, height * scale)
      .setAlpha((spec.alpha ?? 1) * (1 - fading) ** (spec.fade ?? 1.4));
    if (spec.align) image.setRotation(Math.atan2(piece.vy, piece.vx));
    if (age === 0) image.setVisible(true);
  }

  /** Flipbooks: switches to the key its age has reached; returns that key's scale. */
  private showKey(
    piece: Piece,
    frames: readonly string[],
    keys: readonly number[],
    scales?: readonly number[],
  ): number {
    let key = 0;
    let end = keys[0] ?? 1;
    while (piece.age >= end && key < keys.length - 1) {
      key += 1;
      end += keys[key] ?? 1;
    }
    const frame = frames[key];
    if (key !== piece.key && frame !== undefined) {
      piece.key = key;
      piece.image.setFrame(frame, false, false);
    }
    return scales?.[key] ?? 1;
  }
}
