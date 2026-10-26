import Phaser from 'phaser';
import { toPx } from '../core/constants';
import { DEPTH } from './depth';
import { HD_SHAPES, rasterize, type HdShapeName } from './hd-shapes';
import type { HitStyle } from './hit-styles';

export type HitKind = 'light' | 'heavy' | 'block' | 'ko';

/** Pieces of each shape on screen at once; the oldest is reused when a new one starts. */
const POOL_SIZES: Readonly<Record<HdShapeName, number>> = {
  glow: 12,
  ring: 8,
  ray: 40,
  cut: 12,
  slash: 12,
  spark: 72,
  shard: 40,
};

/** Rays grow from the impact (their base); every other shape is centered on its position. */
const ORIGINS: Partial<Record<HdShapeName, { x: number; y: number }>> = {
  ray: { x: 0.04, y: 0.5 },
};

const TEXTURE_PREFIX = 'hd:';

/** What a piece does over its life, in world pixels, radians and display frames. */
interface PieceSpec {
  readonly shape: HdShapeName;
  readonly color: number;
  readonly life: number;
  /** Width and height when it starts, and when it ends (eased out). */
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  readonly alpha?: number;
  /** How fast it fades: the higher, the sooner (alpha follows (1 - t) ** fade). */
  readonly fade?: number;
  /** Rotation of the shape. */
  readonly angle?: number;
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
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Sizes of a fighter's effect for one kind of blow (world pixels). */
interface Burst {
  readonly glow: number;
  readonly core: number;
  readonly rays: number;
  readonly ray: number;
  readonly blades: number;
  readonly blade: number;
  readonly ring: number;
  readonly sparks: number;
  readonly shards: number;
  /** Lifetime multiplier. */
  readonly life: number;
}

const BURSTS: Readonly<Record<Exclude<HitKind, 'block'>, Burst>> = {
  light: {
    glow: 36,
    core: 14,
    rays: 7,
    ray: 22,
    blades: 1,
    blade: 32,
    ring: 0,
    sparks: 8,
    shards: 3,
    life: 1,
  },
  heavy: {
    glow: 52,
    core: 20,
    rays: 10,
    ray: 32,
    blades: 2,
    blade: 50,
    ring: 58,
    sparks: 18,
    shards: 8,
    life: 1.25,
  },
  ko: {
    glow: 74,
    core: 28,
    rays: 14,
    ray: 46,
    blades: 3,
    blade: 64,
    ring: 86,
    sparks: 30,
    shards: 14,
    life: 1.6,
  },
};

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** White textures of every shape, tinted per piece; drawn once per game, smooth when scaled. */
function createTextures(scene: Phaser.Scene): void {
  for (const name of Object.keys(HD_SHAPES) as HdShapeName[]) {
    const key = TEXTURE_PREFIX + name;
    if (scene.textures.exists(key)) continue;
    const shape = HD_SHAPES[name];
    const texture = scene.textures.createCanvas(key, shape.width, shape.height);
    if (!texture) continue;
    const image = texture.context.createImageData(shape.width, shape.height);
    rasterize(shape).forEach((alpha, i) => {
      image.data.set([255, 255, 255, alpha], i * 4);
    });
    texture.context.putImageData(image, 0, 0);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

/**
 * High definition hit effects over the pixel art: glows, rays, slashes, sparks and shards in
 * the attacker's own shape and colors (see HitStyle), blended additively so they light up
 * what they cross. Every piece comes from a fixed pool: nothing is created during a fight.
 */
export class HitFx {
  private readonly pools = new Map<HdShapeName, { pieces: Piece[]; next: number }>();

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
  ) {
    createTextures(scene);
    for (const name of Object.keys(POOL_SIZES) as HdShapeName[]) {
      const origin = ORIGINS[name] ?? { x: 0.5, y: 0.5 };
      const pieces = Array.from({ length: POOL_SIZES[name] }, (): Piece => ({
        image: scene.add
          .image(0, 0, TEXTURE_PREFIX + name)
          .setOrigin(origin.x, origin.y)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH.sparks)
          .setVisible(false),
        spec: { shape: name, color: 0, life: 0, from: [0, 0], to: [0, 0] },
        life: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      }));
      this.pools.set(name, { pieces, next: 0 });
    }
  }

  /**
   * Plays a blow's effect at a point in stage coordinates (sub-pixels, y up from the ground),
   * the blow going `away` (1: to the right).
   */
  play(style: HitStyle, kind: HitKind, x: number, y: number, away: 1 | -1): void {
    const px = toPx(x);
    const py = this.groundY - toPx(y);
    const direction = away > 0 ? 0 : Math.PI;
    if (kind === 'block') this.block(style, px, py, direction);
    else if (style.shape === 'slash') this.slash(style, BURSTS[kind], px, py, direction);
    else this.claw(style, BURSTS[kind], px, py, direction);
  }

  /** Advances the effects by one display frame. */
  update(): void {
    for (const { pieces } of this.pools.values()) {
      for (const piece of pieces) {
        if (piece.life <= 0) continue;
        piece.life -= 1;
        if (piece.life <= 0) {
          piece.image.setVisible(false);
          continue;
        }
        this.draw(piece);
      }
    }
  }

  /** Nayo: a hot flash, a starburst of rays, crescent slashes across the blow, a shockwave. */
  private slash(style: HitStyle, burst: Burst, x: number, y: number, direction: number): void {
    this.flash(style, burst, x, y);
    for (let i = 0; i < burst.rays; i++) {
      // Half the rays follow the blow, the others go every way.
      const angle = i % 2 === 0 ? direction + random(-0.9, 0.9) : random(0, Math.PI * 2);
      const length = burst.ray * random(0.7, 1.2);
      this.spawn(
        {
          shape: 'ray',
          color: i % 3 === 0 ? style.core : style.strike,
          life: random(6, 9) * burst.life,
          from: [length * 0.45, 3.2],
          to: [length, 0.6],
          angle,
          speed: 0.5,
        },
        x,
        y,
      );
    }
    for (let i = 0; i < burst.blades; i++) {
      const tilt = (i % 2 === 0 ? 1 : -1) * random(0.25, 0.6) * (i === 0 ? 0.5 : 1);
      // The slash sweeps on past the impact, a hot edge over its color.
      for (const [color, size, alpha, life] of [
        [style.energy, 1, 1, 10],
        [style.core, 0.86, 0.7, 6],
      ] as const) {
        this.spawn(
          {
            shape: 'slash',
            color,
            life: life * burst.life,
            from: [burst.blade * 0.55 * size, burst.blade * 0.55 * size],
            to: [burst.blade * 1.1 * size, burst.blade * 1.1 * size],
            alpha,
            fade: 1.8,
            angle: direction + tilt,
            direction,
            speed: 0.9,
            spin: tilt * 0.02,
          },
          x,
          y,
        );
      }
    }
    this.shockwave(style.energy, burst, x, y);
    this.sparks(style, burst, x, y, direction);
    this.shards(style.strike, burst.shards, x, y, 1);
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
          shape: 'cut',
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
    this.sparks(style, { ...burst, sparks: Math.round(burst.sparks / 2) }, x, y, direction);
  }

  /** A blocked blow: a ring in the attacker's energy, sparks glancing back off the guard. */
  private block(style: HitStyle, x: number, y: number, direction: number): void {
    this.spawn(
      { shape: 'glow', color: style.energy, life: 7, from: [10, 10], to: [22, 22], alpha: 0.5 },
      x,
      y,
    );
    this.spawn(
      { shape: 'ring', color: style.energy, life: 9, from: [4, 4], to: [30, 30], alpha: 0.85 },
      x,
      y,
    );
    for (let i = 0; i < 6; i++) {
      const angle = direction + Math.PI + random(-0.9, 0.9);
      if (style.shape === 'claw') {
        this.spawn(
          {
            shape: 'shard',
            color: style.energy,
            life: random(8, 12),
            from: [4, 4],
            to: [1.5, 1.5],
            angle: random(0, Math.PI),
            direction: angle,
            speed: random(1.5, 3),
            drag: 0.9,
            gravity: 0.1,
            spin: random(-0.3, 0.3),
          },
          x,
          y,
        );
      } else {
        this.spawn(
          {
            shape: 'spark',
            color: style.energy,
            life: random(8, 12),
            from: [7, 2],
            to: [3, 1],
            angle,
            speed: random(2, 3.5),
            drag: 0.88,
            gravity: 0.12,
            align: true,
          },
          x,
          y,
        );
      }
    }
  }

  /** The glow of the impact in the strike's color, around a white-hot core. */
  private flash(style: HitStyle, burst: Burst, x: number, y: number): void {
    const { glow, core, life } = burst;
    this.spawn(
      {
        shape: 'glow',
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
        shape: 'glow',
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
        shape: 'ring',
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

  private sparks(style: HitStyle, burst: Burst, x: number, y: number, direction: number): void {
    for (let i = 0; i < burst.sparks; i++) {
      // Most sparks fly on with the blow.
      const angle = i % 3 === 2 ? random(0, Math.PI * 2) : direction + random(-1.2, 1.2);
      this.spawn(
        {
          shape: 'spark',
          color: i % 2 === 0 ? style.strike : style.energy,
          life: random(10, 18) * burst.life,
          from: [10, 2.4],
          to: [3, 1],
          angle,
          speed: random(2.5, 6) * Math.sqrt(burst.life),
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
          shape: 'shard',
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

  private spawn(spec: PieceSpec, x: number, y: number): void {
    const pool = this.pools.get(spec.shape);
    const piece = pool?.pieces[pool.next];
    if (!pool || !piece) return;
    pool.next = (pool.next + 1) % pool.pieces.length;
    const direction = spec.direction ?? spec.angle ?? 0;
    const speed = spec.speed ?? 0;
    piece.spec = spec;
    piece.life = Math.max(1, Math.round(spec.life));
    piece.x = x;
    piece.y = y;
    piece.vx = Math.cos(direction) * speed;
    piece.vy = Math.sin(direction) * speed;
    piece.image
      .setTint(spec.color)
      .setRotation(spec.angle ?? 0)
      .setVisible(true);
    this.draw(piece);
  }

  private draw(piece: Piece): void {
    const { spec, image } = piece;
    const t = 1 - piece.life / Math.max(1, Math.round(spec.life));
    const ease = 1 - (1 - t) ** 3;
    const drag = spec.drag ?? 1;
    piece.vx *= drag;
    piece.vy = piece.vy * drag + (spec.gravity ?? 0);
    piece.x += piece.vx;
    piece.y += piece.vy;
    const width = spec.from[0] + (spec.to[0] - spec.from[0]) * ease;
    const height = spec.from[1] + (spec.to[1] - spec.from[1]) * ease;
    image
      .setPosition(piece.x, piece.y)
      .setDisplaySize(width, height)
      .setAlpha((spec.alpha ?? 1) * (1 - t) ** (spec.fade ?? 1.4));
    if (spec.align) image.setRotation(Math.atan2(piece.vy, piece.vx));
    else if (spec.spin) image.setRotation(image.rotation + spec.spin);
  }
}
