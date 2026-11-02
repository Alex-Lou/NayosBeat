import Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { moveOf } from '../core/moves';
import type { GameState } from '../core/state';
import { aimOf, isHeavy } from './fight-events';
import { DEPTH } from './depth';
import type { FlashBudget } from './flash-budget';
import { SIGNATURE_AREAS, type SignatureCue } from './flash-areas';
import { ATLAS } from './hit-fx';
import { addAlphaFor } from './luminance';
import type { RenderMode } from './render-mode';
import { PLATINE, toneColor, type Signature, type Tone } from './signatures';

/**
 * A fighter's signature effects over the pixel art (docs/art/nayo-vfx.md §3): the speaker ring of
 * a disc let go, the sound waves it leaves behind in flight, a kick's speed arc, a shock ring on
 * the floor, speed streaks climbing an uppercut, the run-up of a super and its drops of bass with
 * the equalizer bouncing behind the fighters, the Boost's platine burst, a heavy normal's swing.
 * Read in the state on each tick (a move reaching one of its cue frames, a disc in flight), never
 * written back (D17); the pieces then live on the display clock, as the hit effects do (nothing
 * interpolated between ticks: D23). Each cue asks the flash budget for what it lights, once, after
 * the blows and the fighters' front effects (`flush`): granted, it plays lit; refused, or the
 * flashes calm, muted: each piece no brighter than QUIET_DELTA over the stage (it lights nothing at
 * ΔL ≥ 0.1, measured). Its glows (an aura, the floor flaring, a ring closing in) are always so: too
 * wide for any budget. Every piece comes
 * from a fixed pool, made with the fight. Drawn without tints (`mode` simple), the pieces of the
 * atlas (white, tinted) are cut; the equalizer, plain fills, stays.
 */

/**
 * A muted piece, and a glow always, raise the stage by this much at most, over every one of its
 * colors: what overlaps stays under ΔL 0.1 (tests/render/flash-areas.test.ts: 0 px²).
 */
export const QUIET_DELTA = 0.03;
/**
 * The equalizer's segments raise the stage by this much at most (calm: CALM_EQ_DELTA): with a
 * quiet piece over them, still under ΔL 0.1.
 */
export const EQ_DELTA = 0.07;
export const CALM_EQ_DELTA = 0.045;
/** Sound waves are left behind a disc every this many ticks. */
export const WAVE_EVERY = 3;
/** At most this many cues wait for the budget within a display frame. */
const QUEUE = 16;

type Frame = 'ring' | 'arc' | 'streak' | 'glow' | 'twinkle' | 'shard';

/** Pieces of each frame of the hit effects' atlas (hd-shapes.ts): drawn behind the bodies or over. */
const POOLS: Readonly<Record<Frame, { readonly size: number; readonly behind: boolean }>> = {
  ring: { size: 16, behind: true },
  glow: { size: 6, behind: true },
  arc: { size: 24, behind: false },
  streak: { size: 48, behind: false },
  twinkle: { size: 16, behind: false },
  shard: { size: 32, behind: false },
};

/** A piece of an effect: one image of the atlas, growing, moving and fading on the display clock. */
class Piece {
  age = 1;
  life = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  drag = 1;
  gravity = 0;
  fromWidth = 1;
  fromHeight = 1;
  toWidth = 1;
  toHeight = 1;
  ease = 3;
  alpha = 1;
  fade = 1.4;
  hold = 0;
  pulse = false;

  constructor(readonly image: Phaser.GameObjects.Image) {}

  /** Starts it afresh at x, y (world px), for `life` display frames, `alpha` at its strongest. */
  reset(color: number, x: number, y: number, life: number, alpha: number): this {
    this.age = 0;
    this.life = Math.max(1, Math.round(life));
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.drag = 1;
    this.gravity = 0;
    this.ease = 3;
    this.alpha = alpha;
    this.fade = 1.4;
    this.hold = 0;
    this.pulse = false;
    this.image.setTint(color).setRotation(0).setFlip(false, false).setVisible(false);
    return this;
  }

  /** Its size as it starts and as it ends, world px. */
  sized(fromWidth: number, fromHeight: number, toWidth: number, toHeight: number): this {
    this.fromWidth = fromWidth;
    this.fromHeight = fromHeight;
    this.toWidth = toWidth;
    this.toHeight = toHeight;
    return this;
  }

  /** Thrown at `speed` (world px a frame) along `direction`, slowed by `drag` every frame. */
  thrown(speed: number, direction: number, drag = 1): this {
    this.vx = Math.cos(direction) * speed;
    this.vy = Math.sin(direction) * speed;
    this.drag = drag;
    return this;
  }

  turned(angle: number, mirror = false): this {
    this.image.setRotation(angle).setFlip(mirror, false);
    return this;
  }

  /** Waits `frames` display frames before it shows. */
  later(frames: number): this {
    this.age = -Math.max(0, Math.round(frames));
    return this;
  }

  /** Shows its next display frame (nothing once it is over). */
  step(): void {
    if (this.age > this.life) return;
    if (this.age === this.life) {
      this.image.setVisible(false);
      this.age += 1;
      return;
    }
    if (this.age >= 0) this.draw();
    this.age += 1;
  }

  private draw(): void {
    const { image, age, life } = this;
    if (age > 0) {
      this.vx *= this.drag;
      this.vy = this.vy * this.drag + this.gravity;
      this.x += this.vx;
      this.y += this.vy;
    }
    const t = age / life;
    const grow = this.pulse
      ? Math.sin((Math.PI * (age + 1)) / (life + 1))
      : 1 - (1 - t) ** this.ease;
    const width = this.fromWidth + (this.toWidth - this.fromWidth) * grow;
    const height = this.fromHeight + (this.toHeight - this.fromHeight) * grow;
    const fading = Math.min(1, Math.max(0, (t - this.hold) / (1 - this.hold)));
    image
      .setPosition(this.x, this.y)
      .setDisplaySize(width, height)
      .setAlpha(this.alpha * (1 - fading) ** this.fade);
    if (age === 0) image.setVisible(true);
  }
}

/** A lit cap's opacity: an accent, not a white bar. */
const CAP_ALPHA = 0.75;
/** The equalizer's bars of one drop of bass: how high each one jumps, against the tallest. */
const SPECTRUM = [0.35, 0.6, 0.85, 1, 0.75, 0.95, 0.7, 0.5, 0.3] as const;
/**
 * The bars, world px: as wide, this far apart; a segment this high, this far from the next;
 * at most this many segments; the peak's cap as high as a segment, platine.
 */
export const EQ = {
  width: 8,
  spacing: 13,
  segment: 3,
  gap: 1,
  segments: 14,
  life: 26,
  /** The platine cap on each bar's peak: thinner than a segment. */
  cap: 2,
  /** Their foot over the floor: clear of the drop's ring and its flare. */
  lift: 8,
} as const;

/** A drop's equalizer, bouncing behind the fighters. */
interface Equalizer {
  /** Display frames since it started; past EQ.life, idle. */
  age: number;
  x: number;
  color: number;
  size: number;
  lit: boolean;
  /** The highest segment each bar reached, which its cap holds a moment. */
  readonly peaks: number[];
}

/** A cue waiting for the budget, until the frame's effects have asked theirs. */
interface Pending {
  kind: SignatureCue;
  x: number;
  y: number;
  /** The side faced, or the way a disc flies. */
  toward: 1 | -1;
  color: number;
  /** The energy behind a platine cue (its accents), or its own color. */
  accent: number;
  size: number;
  /** A heavy swing: radians its arc turns off level (up below 0). */
  aim: number;
}

export interface SignatureLook {
  readonly groundY: number;
  /** Each player's signature (null: none), and energy. */
  readonly signatures: readonly [Signature | null, Signature | null];
  readonly energies: readonly [number, number];
  readonly budget: FlashBudget;
  readonly mode: RenderMode;
  /** The stage's large colors: the equalizer's segments stay under VEIL_DELTA over them. */
  readonly stage: readonly number[];
}

export class SignatureFx {
  /** The flashes calm (reduced or off): every cue plays muted. Read on each flush. */
  calm = false;
  /** The screen kept still (« Tremblement » off): nothing bounces nor breathes. */
  still = false;
  private readonly pools: Readonly<Record<Frame, { pieces: Piece[]; next: number }>>;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly equalizers: Equalizer[];
  private nextEqualizer = 0;
  private readonly queue: Pending[];
  private queued = 0;
  /** The action frame each player showed on the last tick: a cue plays once, as it is reached. */
  private readonly shownFrame: [number, number] = [-1, -1];
  private readonly shownMove: [string | null, string | null] = [null, null];
  /** By color: the equalizer's segments at their most, normal and calm; a quiet piece's. */
  private readonly alphas = new Map<number, readonly [number, number, number]>();
  /** The cue being played is lit: its pieces at their opacity, else quiet. */
  private lit = true;

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    private readonly look: SignatureLook,
  ) {
    const pool = (frame: Frame) => {
      const { size, behind } = POOLS[frame];
      const pieces = Array.from(
        { length: size },
        () =>
          new Piece(
            scene.add
              .image(0, 0, ATLAS, frame)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(behind ? DEPTH.signatureBack : DEPTH.effects)
              .setVisible(false),
          ),
      );
      return { pieces, next: 0 };
    };
    this.pools = {
      ring: pool('ring'),
      glow: pool('glow'),
      arc: pool('arc'),
      streak: pool('streak'),
      twinkle: pool('twinkle'),
      shard: pool('shard'),
    };
    this.graphics = scene.add
      .graphics()
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.signatureBack);
    this.equalizers = Array.from({ length: 3 }, () => ({
      age: EQ.life + 1,
      x: 0,
      color: 0,
      size: 1,
      lit: false,
      peaks: SPECTRUM.map(() => 0),
    }));
    this.queue = Array.from({ length: QUEUE }, () => ({
      kind: 'burst',
      x: 0,
      y: 0,
      toward: 1 as const,
      color: 0,
      accent: 0,
      size: 1,
      aim: 0,
    }));
    // Its colors are known from the start: their opacities, worked out once.
    for (const color of [...look.energies, PLATINE]) {
      this.alphas.set(color, [
        addAlphaFor(color, look.stage, EQ_DELTA),
        addAlphaFor(color, look.stage, CALM_EQ_DELTA),
        addAlphaFor(color, look.stage, QUIET_DELTA),
      ]);
    }
  }

  /**
   * Reads the tick's state (call once a simulation tick, after its events): each fighter with a
   * signature reaching a cue frame of its move, starting a heavy normal's active frames, and every
   * WAVE_EVERY ticks out of the freeze, its discs in flight. The cues wait for `flush`.
   */
  tick(state: GameState): void {
    for (const by of [0, 1] as const) {
      const signature = this.look.signatures[by];
      if (!signature) continue;
      const fighter = state.fighters[by];
      const move = fighter.move;
      const frame = fighter.actionFrame;
      const moved = move !== this.shownMove[by] || frame !== this.shownFrame[by];
      this.shownMove[by] = move;
      this.shownFrame[by] = frame;
      if (!move || !moved) continue;
      const energy = this.look.energies[by];
      const x = toPx(fighter.x);
      const feet = this.look.groundY - toPx(fighter.y);
      const toward = fighter.facing;
      for (const cue of signature.moves[move]?.cues ?? []) {
        if (cue.frame !== frame) continue;
        const color = toneColor(cue.tone, energy);
        this.cue(
          cue.kind,
          x + toward * cue.reach,
          feet - cue.height,
          toward,
          color,
          energy,
          cue.size,
        );
      }
      if (!signature.heavySwing) continue;
      const data = moveOf(this.config.fighters[by], move);
      if (data.kind !== 'normal' || !data.hitbox || !isHeavy(data) || frame !== data.startup)
        continue;
      const { hitbox } = data;
      const reach = toPx(hitbox.x + hitbox.width * 0.7);
      const height = toPx(hitbox.y + hitbox.height / 2);
      const size = Math.min(1.4, Math.max(0.7, toPx(hitbox.height) / 30));
      const pending = this.cue(
        'swing',
        x + toward * reach,
        feet - height,
        toward,
        energy,
        energy,
        size,
      );
      if (pending) pending.aim = aimOf(move, data);
    }
    if (state.hitstop > 0 || state.frame % WAVE_EVERY !== 0) return;
    for (const projectile of state.projectiles) {
      const signature = this.look.signatures[projectile.owner];
      const tone: Tone | undefined = signature?.discs[projectile.move];
      if (!tone) continue;
      const box = moveOf(this.config.fighters[projectile.owner], projectile.move).projectile
        ?.hitbox;
      const height = box ? toPx(box.y + box.height / 2) : 0;
      const energy = this.look.energies[projectile.owner];
      const kind = tone === 'platine' ? 'waveBoost' : 'wave';
      const color = toneColor(tone, energy);
      this.cue(
        kind,
        toPx(projectile.x),
        this.look.groundY - height,
        projectile.facing,
        color,
        energy,
        1,
      );
    }
  }

  /**
   * Queues `kind` at x, y (world px) facing `toward`, in `color` (`accent`: its second color),
   * `size` times its own, for the next `flush`; returns it, null once the queue is full.
   */
  cue(
    kind: SignatureCue,
    x: number,
    y: number,
    toward: 1 | -1,
    color: number,
    accent: number,
    size: number,
  ): Pending | null {
    const pending = this.queue[this.queued];
    if (!pending) return null;
    this.queued++;
    pending.kind = kind;
    pending.x = x;
    pending.y = y;
    pending.toward = toward;
    pending.color = color;
    pending.accent = accent;
    pending.size = size;
    pending.aim = 0;
    return pending;
  }

  /**
   * Plays the cues waiting, each asking the budget for what it lights at its size (call once a
   * display frame, after the fighters' front effects have asked theirs); `play` false, drops them
   * (the Finisher's scene stages its own).
   */
  flush(play = true): void {
    const { budget } = this.look;
    for (let i = 0; i < (play ? this.queued : 0); i++) {
      const cue = this.queue[i];
      if (!cue) continue;
      const area = SIGNATURE_AREAS[cue.kind] * cue.size ** 2;
      const lit = !this.calm && budget.mode === 'normal' && budget.admit(area);
      this.play(cue, lit);
    }
    this.queued = 0;
  }

  /** Advances every piece and the equalizers by `frames` display frames. */
  update(frames: number): void {
    for (let i = 0; i < frames; i++) {
      for (const { pieces } of Object.values(this.pools)) for (const piece of pieces) piece.step();
      for (const equalizer of this.equalizers) if (equalizer.age <= EQ.life) equalizer.age += 1;
    }
    this.drawEqualizers();
  }

  /** The equalizer's segments in `color`: the most opacity that lights nothing. */
  private segmentAlpha(color: number): number {
    return this.alphas.get(color)?.[this.calm ? 1 : 0] ?? 0;
  }

  /**
   * A piece of `frame`, the oldest of its pool, at `alpha` if its cue is lit and it is not
   * `steady` (a glow), quiet otherwise; none drawn without tints.
   */
  private piece(
    frame: Frame,
    color: number,
    x: number,
    y: number,
    life: number,
    alpha: number,
    steady = false,
  ) {
    if (this.look.mode === 'simple') return null;
    const quiet = this.alphas.get(color)?.[2] ?? 0;
    const shown = this.lit && !steady ? alpha : Math.min(alpha, quiet);
    const pool = this.pools[frame];
    const piece = pool.pieces[pool.next];
    if (!piece) return null;
    pool.next = (pool.next + 1) % pool.pieces.length;
    return piece.reset(color, x, y, life, shown);
  }

  private play(cue: Pending, lit: boolean): void {
    this.lit = lit;
    const { x, y, toward, color, accent, size: s } = cue;
    const mirror = toward < 0;
    const back = mirror ? 0 : Math.PI;
    switch (cue.kind) {
      case 'throwRing': {
        // A speaker cone's ring seen edge on, pushed out of the hand, a second one after it.
        this.piece('ring', color, x, y, 13, 0.95)?.sized(6 * s, 12 * s, 26 * s, 50 * s);
        this.piece('ring', color, x + toward * 6 * s, y, 12, 0.7)
          ?.sized(4 * s, 8 * s, 18 * s, 36 * s)
          .later(3)
          .thrown(1.2 * s, mirror ? Math.PI : 0, 0.9);
        for (let i = 0; i < 3; i++) {
          const spread = (i - 1) * 0.35;
          this.piece('streak', color, x, y, 9, 0.85)
            ?.sized(10 * s, 3 * s, 26 * s, 2 * s)
            .thrown(4 * s, (mirror ? Math.PI : 0) + spread, 0.82)
            .turned((mirror ? Math.PI : 0) + spread);
        }
        break;
      }
      case 'wave':
      case 'waveBoost': {
        // The groove's sound waves, left behind the disc: crescents bulging the way it flies.
        const big = cue.kind === 'waveBoost';
        const behind = x - toward * 9;
        this.piece('arc', color, behind, y, big ? 15 : 12, big ? 0.85 : 0.65)
          ?.sized(5, 20, big ? 12 : 9, big ? 48 : 36)
          .thrown(0.5, back, 0.95)
          .turned(0, mirror);
        if (big) {
          this.piece('arc', accent, behind - toward * 6, y, 12, 0.6)
            ?.sized(4, 14, 8, 30)
            .later(2)
            .thrown(0.4, back, 0.95)
            .turned(0, mirror);
        }
        break;
      }
      case 'kick': {
        // The speed arc swept along the kick, its streaks along the floor behind it.
        this.piece('arc', color, x, y, 9, 0.9)
          ?.sized(10 * s, 40 * s, 16 * s, 64 * s)
          .turned(0, mirror);
        this.piece('glow', color, x, y, 8, 0.5, true)?.sized(16 * s, 16 * s, 34 * s, 30 * s);
        for (let i = 0; i < 4; i++) {
          this.piece(
            'streak',
            i % 2 ? accent : color,
            x - toward * (10 + 8 * i),
            y + (i - 1.5) * 5,
            11,
            0.8,
          )
            ?.sized(28 * s, 3 * s, 46 * s, 2 * s)
            .thrown(3.2 * s, back, 0.86)
            .turned(back)
            .later(i);
        }
        break;
      }
      case 'swing': {
        // A heavy normal: the arc of its swing where it reaches, two speed lines along it.
        const turn = cue.aim * 0.6;
        this.piece('arc', color, x, y, 8, 0.85)
          ?.sized(9 * s, 34 * s, 14 * s, 54 * s)
          .turned(mirror ? -turn : turn, mirror);
        for (let i = 0; i < 2; i++) {
          const along = (mirror ? Math.PI - cue.aim : cue.aim) + (i ? 0.25 : -0.25);
          this.piece('streak', color, x - toward * 12, y + (i ? 6 : -6), 8, 0.7)
            ?.sized(18 * s, 2 * s, 34 * s, 2 * s)
            .thrown(3 * s, along, 0.85)
            .turned(along);
        }
        break;
      }
      case 'groundRing': {
        // A shock ring flat on the floor, the floor flaring at its heart.
        this.piece('ring', color, x, y, 16, 0.95)?.sized(20 * s, 4 * s, 112 * s, 18 * s);
        this.piece('ring', accent, x, y, 12, 0.6)
          ?.sized(12 * s, 3 * s, 70 * s, 11 * s)
          .later(3);
        this.piece('glow', color, x, y, 10, 0.55, true)?.sized(30 * s, 6 * s, 64 * s, 12 * s);
        break;
      }
      case 'rise': {
        // Speed streaks climbing the body as the fist goes up, sparkles left behind.
        for (let i = 0; i < 6; i++) {
          const side = (i - 2.5) * 6 * s;
          const piece = this.piece(
            'streak',
            i % 3 ? color : accent,
            x + side,
            y + 14 - 6 * (i % 3),
            12,
            0.85,
          );
          piece
            ?.sized(14 * s, 3 * s, 40 * s, 2 * s)
            .thrown((5 + (i % 3)) * s, -Math.PI / 2, 0.9)
            .turned(-Math.PI / 2)
            .later(i % 2);
        }
        for (let i = 0; i < 3; i++) {
          const piece = this.piece('twinkle', color, x + (i - 1) * 14 * s, y - 10 * i, 14, 0.9);
          if (!piece) continue;
          piece
            .sized(2, 2, 12 * s, 12 * s)
            .later(2 + 2 * i)
            .thrown(0.8, -Math.PI / 2, 0.95);
          piece.pulse = true;
        }
        break;
      }
      case 'charge': {
        // The run-up: a ring closing in on him, sparks drawn up to his body, his aura breathing.
        this.piece('ring', color, x, y, 18, 0.8, true)?.sized(150 * s, 150 * s, 26 * s, 26 * s);
        const aura = this.piece('glow', accent, x, y, 30, 0.45, true);
        if (aura) {
          aura.sized(60 * s, 90 * s, 90 * s, 120 * s);
          aura.pulse = !this.still;
          aura.hold = 0.5;
        }
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const radius = (58 + 10 * (i % 3)) * s;
          const piece = this.piece(
            i % 2 ? 'shard' : 'twinkle',
            i % 3 ? color : accent,
            x + Math.cos(angle) * radius,
            y + Math.sin(angle) * radius * 0.8,
            18,
            0.9,
          );
          if (!piece) continue;
          piece
            .sized(5 * s, 5 * s, 2 * s, 2 * s)
            .thrown(radius / 9, angle + Math.PI, 0.9)
            .later(i % 4);
          piece.hold = 0.6;
        }
        break;
      }
      case 'drop': {
        // The bass hitting the floor: its ring, and the equalizer jumping behind them.
        this.piece('ring', color, x, y, 16, 0.95)?.sized(18 * s, 4 * s, 96 * s, 16 * s);
        this.piece('glow', PLATINE, x, y, 8, 0.5, true)?.sized(26 * s, 6 * s, 48 * s, 10 * s);
        const equalizer = this.equalizers[this.nextEqualizer];
        if (!equalizer) break;
        this.nextEqualizer = (this.nextEqualizer + 1) % this.equalizers.length;
        equalizer.age = 0;
        equalizer.x = x;
        equalizer.color = color === PLATINE ? accent : color;
        equalizer.size = s;
        equalizer.lit = lit;
        equalizer.peaks.fill(0);
        break;
      }
      case 'burst': {
        // The Boost spent: a platine ring bursting from the body, shards flying out of it.
        this.piece('ring', color, x, y, 14, 0.9)?.sized(12 * s, 12 * s, 64 * s, 64 * s);
        this.piece('ring', accent, x, y, 12, 0.6, true)
          ?.sized(10 * s, 10 * s, 64 * s, 64 * s)
          .later(2);
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + 0.3;
          const from = 6 * s;
          this.piece(
            'shard',
            i % 2 ? accent : color,
            x + Math.cos(angle) * from,
            y + Math.sin(angle) * from,
            16,
            0.95,
          )
            ?.sized(5 * s, 5 * s, 2 * s, 2 * s)
            .thrown((4 + (i % 3)) * s, angle, 0.88);
        }
        break;
      }
      case 'dash': {
        // Speed lines on the floor, left behind as the dash sets off.
        for (let i = 0; i < 3; i++) {
          this.piece('streak', color, x - toward * (6 + 6 * i), y - 2 - 4 * i, 10, 0.7)
            ?.sized(18, 2, 34, 2)
            .thrown(2.5, back, 0.85)
            .turned(back)
            .later(i);
        }
        break;
      }
    }
  }

  /** The equalizers as they are now: segments in their color, a platine cap on each bar's peak. */
  private drawEqualizers(): void {
    const graphics = this.graphics;
    graphics.clear();
    for (const equalizer of this.equalizers) {
      if (equalizer.age > EQ.life) continue;
      const { age, size, color } = equalizer;
      const t = age / EQ.life;
      // Up in a few frames, then down: the bars jump with the bass and settle.
      const swell = Math.min(1, (age + 1) / 4) * (1 - t) ** 1.5;
      const segmentAlpha = this.segmentAlpha(color);
      const capAlpha = equalizer.lit ? CAP_ALPHA : this.segmentAlpha(PLATINE);
      const step = EQ.segment + EQ.gap;
      SPECTRUM.forEach((level, bar) => {
        const bounce = this.still ? 1 : 1 + 0.18 * Math.sin(age * 0.9 + bar * 1.7);
        const lit = Math.round(level * swell * bounce * EQ.segments * size);
        const peaks = equalizer.peaks;
        const peak = Math.max(lit, (peaks[bar] ?? 0) - (age % 2 === 0 ? 1 : 0));
        peaks[bar] = peak;
        const left =
          equalizer.x + (bar - (SPECTRUM.length - 1) / 2) * EQ.spacing * size - EQ.width / 2;
        const floor = this.look.groundY - EQ.lift * size;
        graphics.fillStyle(color, segmentAlpha);
        for (let segment = 0; segment < lit; segment++) {
          graphics.fillRect(left, floor - (segment + 1) * step, EQ.width, EQ.segment);
        }
        if (peak > 0) {
          graphics.fillStyle(PLATINE, capAlpha);
          graphics.fillRect(left, floor - (peak + 1) * step + 1, EQ.width, EQ.cap);
        }
      });
    }
  }
}
