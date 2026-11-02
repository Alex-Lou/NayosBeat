import Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { moveOf } from '../core/moves';
import type { GameState } from '../core/state';
import { DEPTH } from './depth';
import type { FlashBudget } from './flash-budget';
import { toneUnder } from './luminance';
import { PLATINE, toneColor, type BoldCue, type Signature } from './signatures';
import { DIM_COLOR } from './veils';

/**
 * Bold effects, as pixel-art fighting games draw them (docs/art/nayo-vivante.md §4): big flat
 * shapes, opaque, outlined in ink, read at a glance on a phone. A thick shockwave where the
 * Vinyle's disc leaves the hand (a speaker's ring seen side on), speed lines trailing the disc in
 * flight, a quake on the floor at each of the Mégabasse's drops of bass and its impact lines
 * around the fist. Read from the state on each tick (D17: nothing written back); the shapes then
 * live on the display clock (D23).
 *
 * Never a flash (docs/flashs.md §5): their body is their color darkened toward the night's ink
 * until, opaque, it changes no large color of the stage by BOLD_DELTA (`toneUnder`): hue and
 * shape carry them, not light. Only a 1 px hot line inside a ring is bright: it asks the flash
 * budget for its length, once, as the ring starts (`admit`, never a slot); refused, or calm, the
 * ring has none. Plain fills and strokes: Canvas draws them as WebGL does.
 */

/** A body changes no large color of the stage by this much (calm: the same, its hot line gone). */
export const BOLD_DELTA = 0.09;

/** A ring: display frames, its size from and to (world px, at size 1), its thickness. */
export const SHOCK = { life: 12, from: 14, to: 64, thick: [7, 2], ratio: 0.42 } as const;
export const QUAKE = { life: 16, from: 36, to: 230, thick: [8, 2], ratio: 0.24 } as const;
/** The impact lines around a fist: how many, display frames, from and to (world px). */
export const SPIKES = { count: 12, life: 7, from: 18, to: 86, width: 5 } as const;
/** The speed lines trailing a disc: their heights over its middle and their lengths, world px. */
export const DISC_LINES = [
  [-11, 34],
  [-4, 58],
  [4, 46],
  [11, 28],
] as const;
/** A hot line is this thick, world px: what it lights is its length. */
const HOT = 1;

type Shape = 'shock' | 'quake';

/** A ring on the go: where, how big, its tone, whether its hot line is granted. */
interface Ring {
  shape: Shape;
  age: number;
  x: number;
  y: number;
  size: number;
  body: number;
  /** Its hot line's color: granted, null refused, undefined until it asks (`update`). */
  hot: number | null | undefined;
  /** Its color, and what its hot line lights at its widest (world px²). */
  color: number;
  area: number;
  spikes: boolean;
}

export interface BoldLook {
  readonly groundY: number;
  readonly signatures: readonly [Signature | null, Signature | null];
  readonly energies: readonly [number, number];
  readonly budget: FlashBudget;
  readonly stage: readonly number[];
}

/** A shape's growth, eased out: fast, then lingering. */
function grow(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * What a ring's hot line lights at its widest, world px² (docs/flashs.md §5): its ellipse's
 * perimeter (Ramanujan's) times its thickness. `width` is its widest, `ratio` its height for it.
 */
export function hotArea(width: number, ratio: number): number {
  const a = width / 2;
  const b = (width * ratio) / 2;
  const h = (a - b) ** 2 / (a + b) ** 2;
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))) * HOT;
}

export class BoldFx {
  /** The flashes calm: no hot line, nothing asked. Read on each ring's start. */
  calm = false;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly rings: Ring[] = Array.from({ length: 8 }, () => ({
    shape: 'shock',
    age: Infinity,
    x: 0,
    y: 0,
    size: 1,
    body: 0,
    hot: null as number | null | undefined,
    color: 0,
    area: 0,
    spikes: false,
  }));
  private next = 0;
  private readonly shownMove: [string | null, string | null] = [null, null];
  private readonly shownFrame: [number, number] = [-1, -1];
  /** The discs in flight this tick: x, y (world px), the way they fly, their body tone. */
  private readonly discs: { x: number; y: number; toward: number; body: number }[] = [];
  /** Body tones by color, worked out once. */
  private readonly bodies = new Map<number, number>();

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    private readonly look: BoldLook,
  ) {
    this.graphics = scene.add.graphics().setDepth(DEPTH.signatureBack);
  }

  /** Reads the tick's state: a move reaching one of its bold cues, the discs in flight. */
  tick(state: GameState): void {
    for (const by of [0, 1] as const) {
      const signature = this.look.signatures[by];
      if (!signature) continue;
      const fighter = state.fighters[by];
      const { move, actionFrame: frame } = fighter;
      const moved = move !== this.shownMove[by] || frame !== this.shownFrame[by];
      this.shownMove[by] = move;
      this.shownFrame[by] = frame;
      if (!move || !moved) continue;
      for (const cue of signature.moves[move]?.bold ?? []) {
        if (cue.frame !== frame) continue;
        const x = toPx(fighter.x) + fighter.facing * cue.reach;
        this.start(cue, x, this.look.groundY - toPx(fighter.y) - cue.height, by);
      }
    }
    this.discs.length = 0;
    for (const projectile of state.projectiles) {
      const signature = this.look.signatures[projectile.owner];
      const tone = signature?.discs[projectile.move];
      if (!tone || !signature.discLines) continue;
      const box = moveOf(this.config.fighters[projectile.owner], projectile.move).projectile
        ?.hitbox;
      const height = box ? toPx(box.y + box.height / 2) : 0;
      this.discs.push({
        x: toPx(projectile.x),
        y: this.look.groundY - height,
        toward: projectile.facing,
        body: this.bodyOf(toneColor(tone, this.look.energies[projectile.owner])),
      });
    }
  }

  /**
   * `frames` display frames on: every shape drawn anew. The rings started since ask the budget
   * for their hot line first, after the blows and the fighters' front effects (FightScene);
   * `off` (the Finisher's scene), none of them.
   */
  update(frames: number, off = false): void {
    const g = this.graphics.clear();
    // The Finisher's scene draws its own: what was on the go is dropped, never asked after.
    if (off) {
      for (const ring of this.rings) ring.age = Infinity;
      this.discs.length = 0;
      return;
    }
    for (const ring of this.rings) {
      if (ring.age === Infinity) continue;
      if (ring.hot === undefined) {
        ring.hot = !this.calm && this.look.budget.admit(ring.area) ? hotOf(ring.color) : null;
      }
      ring.age += frames;
      const life = ring.shape === 'shock' ? SHOCK.life : QUAKE.life;
      if (ring.age >= life) {
        ring.age = Infinity;
        continue;
      }
      if (ring.age < 0) continue;
      this.drawRing(g, ring, ring.age / life);
      if (ring.spikes && ring.age < SPIKES.life) this.drawSpikes(g, ring, ring.age / SPIKES.life);
    }
    for (const disc of this.discs) {
      for (const [dy, length] of DISC_LINES) {
        const from = disc.x - disc.toward * 12;
        const to = from - disc.toward * length;
        g.lineStyle(3, DIM_COLOR, 0.9).lineBetween(from, disc.y + dy, to, disc.y + dy);
        g.lineStyle(2, disc.body, 1).lineBetween(from, disc.y + dy, to, disc.y + dy);
      }
    }
  }

  private start(cue: BoldCue, x: number, y: number, by: 0 | 1): void {
    const ring = this.rings[this.next];
    if (!ring) return;
    this.next = (this.next + 1) % this.rings.length;
    const color = toneColor(cue.tone, this.look.energies[by]);
    const spec = cue.kind === 'shock' ? SHOCK : QUAKE;
    const area = hotArea(spec.to * cue.size, spec.ratio);
    ring.shape = cue.kind;
    ring.age = -1;
    ring.x = x;
    ring.y = y;
    ring.size = cue.size;
    ring.body = this.bodyOf(color);
    ring.color = color;
    ring.area = area;
    ring.hot = undefined;
    ring.spikes = cue.kind === 'quake';
  }

  private drawRing(g: Phaser.GameObjects.Graphics, ring: Ring, t: number): void {
    const spec = ring.shape === 'shock' ? SHOCK : QUAKE;
    const width = (spec.from + (spec.to - spec.from) * grow(t)) * ring.size;
    const height = width * spec.ratio;
    const thick = (spec.thick[0] + (spec.thick[1] - spec.thick[0]) * t) * ring.size;
    // The shock stands up (a speaker side on), the quake lies on the floor.
    const [w, h] = ring.shape === 'shock' ? [height, width] : [width, height];
    g.lineStyle(thick + 2, DIM_COLOR, 1).strokeEllipse(ring.x, ring.y, w, h);
    g.lineStyle(thick, ring.body, 1).strokeEllipse(ring.x, ring.y, w, h);
    if (typeof ring.hot === 'number') {
      g.lineStyle(HOT, ring.hot, 1).strokeEllipse(ring.x, ring.y, w - thick, h - thick);
    }
  }

  /** Long wedges bursting out of the fist: the comic book's impact. */
  private drawSpikes(g: Phaser.GameObjects.Graphics, ring: Ring, t: number): void {
    const reach = SPIKES.from + (SPIKES.to - SPIKES.from) * grow(t);
    const inner = SPIKES.from * ring.size;
    for (let i = 0; i < SPIKES.count; i++) {
      // Spread over the upper half: the fist is on the floor.
      const angle = Math.PI + (Math.PI * (i + 0.5)) / SPIKES.count;
      const long = (i % 2 === 0 ? 1 : 0.7) * reach * ring.size;
      const side = angle + Math.PI / 2;
      const half = (SPIKES.width / 2) * ring.size * (1 - t);
      const x0 = ring.x + Math.cos(angle) * inner;
      const y0 = ring.y + Math.sin(angle) * inner * 0.8;
      const tipX = ring.x + Math.cos(angle) * long;
      const tipY = ring.y + Math.sin(angle) * long * 0.8;
      const ax = x0 + Math.cos(side) * half;
      const ay = y0 + Math.sin(side) * half;
      const bx = x0 - Math.cos(side) * half;
      const by = y0 - Math.sin(side) * half;
      g.fillStyle(DIM_COLOR, 1).fillTriangle(ax - 1, ay, bx + 1, by, tipX, tipY - 1);
      g.fillStyle(ring.body, 1).fillTriangle(ax, ay, bx, by, tipX, tipY);
    }
  }

  private bodyOf(color: number): number {
    let body = this.bodies.get(color);
    if (body === undefined) {
      body = toneUnder(color, DIM_COLOR, this.look.stage, BOLD_DELTA);
      this.bodies.set(color, body);
    }
    return body;
  }
}

/** A hot line: the color itself, the platine white. */
function hotOf(color: number): number {
  return color === PLATINE ? 0xffffff : color;
}
