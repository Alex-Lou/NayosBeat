import type Phaser from 'phaser';
import type { StageVariant } from '../art/stage-layers';
import { STAGE_MAPS, type Ground, type StageMap } from '../art/stages';
import { toPx } from '../core/constants';
import { DEPTH } from './depth';
import { FxRandom } from './fx-random';

/** Specks kicked up by one push-off, and by a low blow landing at the feet. */
const SPECKS_PER_PUFF = 4;
const SPECKS_PER_KICK = 5;
/** Specks a sliding fighter's heels leave at a time (P7). */
const SPECKS_PER_SCRAPE = 2;
/** Specks a step kicks up, and a body landing on its feet (the sand's, `feet`). */
const SPECKS_PER_STEP = 2;
const SPECKS_PER_LANDING = 3;
/** A sliding fighter's trail, fainter than a push-off's (docs/polish/AUDIT-ET-PLAN.md, P7). */
const SCRAPE_FAINTER = 0.1;
/** Where the heels are, behind a sliding fighter's center, world pixels. */
const HEELS_PX = 6;

/** How a floor's dust looks and flies (docs/art/decor-plage.md §6). */
export interface DustLook {
  readonly color: number;
  /** Specks in the pool: the oldest recycled. */
  readonly pool: number;
  /** Display frames a speck lives. */
  readonly life: number;
  /** How many times the hard floor's specks a puff, a kick, a scrape, a landing throws. */
  readonly more: number;
  /** How much higher they are thrown. */
  readonly rise: number;
  /** View pixels a display frame they gain falling; 0: they drift up and fade. */
  readonly gravity: number;
  /** A speck's opacity when thrown (a scrape's a little less). */
  readonly alpha: number;
  /** The fighters' feet kick it up too: their steps, their take-offs, their landings. */
  readonly feet: boolean;
}

/**
 * Each floor's dust. The hard floors': a few grey specks that drift up and fade. The sand's: warm
 * grains, three times as many, thrown higher, that fall back in sprays; the feet kick it up too.
 */
export const DUST_LOOKS: Readonly<Record<Ground, DustLook>> = {
  hard: {
    color: 0xb9b2c8,
    pool: 16,
    life: 16,
    more: 1,
    rise: 1,
    gravity: 0,
    alpha: 0.55,
    feet: false,
  },
  sand: {
    color: 0xd2a874,
    pool: 72,
    life: 30,
    more: 3,
    rise: 3.2,
    gravity: 0.12,
    alpha: 0.75,
    feet: true,
  },
};

/** What `variant`'s floor is (src/art/stages.ts); hard where none is drawn (the grey box). */
export function groundOf(
  variant: StageVariant | undefined,
  maps: readonly Pick<StageMap, 'name' | 'ground'>[] = STAGE_MAPS,
): Ground {
  return maps.find(({ name }) => name === variant?.stage)?.ground ?? 'hard';
}

interface Speck {
  readonly shape: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  /** Display frames left; 0 once gone. */
  life: number;
  /** Its alpha when thrown: it fades from there. */
  alpha: number;
}

/**
 * The dust kicked up from the floor: where a dash sets off (a few specks thrown back from the
 * feet) and where a low blow lands (a little cloud at the victim's feet, mostly pushed along with
 * the blow). Specks rise a little and fade; on sand, they fly higher and fall back, and the feet
 * kick it up too (`feet`). A fixed pool, the oldest speck recycled: nothing is created during a
 * fight.
 */
export class Dust {
  private readonly specks: Speck[];
  private next = 0;
  private readonly look: DustLook;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    /** The effects' seeded randomness (fx-random.ts), the feedback's. */
    private readonly random: FxRandom = new FxRandom(),
    ground: Ground = 'hard',
  ) {
    this.look = DUST_LOOKS[ground];
    const { color } = this.look;
    this.specks = Array.from({ length: this.look.pool }, () => ({
      shape: scene.add.rectangle(0, 0, 2, 2, color).setDepth(DEPTH.effects).setVisible(false),
      vx: 0,
      vy: 0,
      life: 0,
      alpha: this.look.alpha,
    }));
  }

  /** A puff at `x` (stage sub-pixels) on the ground, for a dash going `toward` (1: right). */
  puff(x: number, toward: 1 | -1): void {
    const screenX = Math.round(toPx(x) - toward * 4);
    for (let n = 0; n < SPECKS_PER_PUFF * this.look.more; n++) {
      // Thrown back against the push, a little fan of speeds and heights.
      const i = n % SPECKS_PER_PUFF;
      const vx = -toward * (0.6 + 0.35 * i + this.random.next() * 0.3);
      this.throw(screenX, vx, -(0.25 + this.random.next() * 0.35), i % 2 === 0 ? 3 : 2);
    }
  }

  /**
   * A low blow landing at `x` (stage sub-pixels) and pushing `away` (1: right): a low cloud
   * spreading from the victim's feet, the most along the blow.
   */
  kick(x: number, away: 1 | -1): void {
    const screenX = Math.round(toPx(x));
    for (let n = 0; n < SPECKS_PER_KICK * this.look.more; n++) {
      const i = n % SPECKS_PER_KICK;
      // One speck in three goes back against the blow: a cloud, not a jet.
      const side = i % 3 === 2 ? -away : away;
      const vx = side * (0.3 + 0.3 * i + this.random.next() * 0.3);
      this.throw(screenX, vx, -(0.15 + this.random.next() * 0.3), i % 2 === 0 ? 3 : 2);
    }
  }

  /**
   * A fighter pushed along the floor at `x` (stage sub-pixels), sliding `toward` (1: right): a
   * little dust behind its heels, left where it scraped (P7).
   */
  scrape(x: number, toward: 1 | -1): void {
    const screenX = Math.round(toPx(x) - toward * HEELS_PX);
    for (let n = 0; n < SPECKS_PER_SCRAPE * this.look.more; n++) {
      const i = n % SPECKS_PER_SCRAPE;
      const vx = -toward * (0.15 + 0.2 * i + this.random.next() * 0.15);
      this.throw(screenX, vx, -(0.1 + this.random.next() * 0.2), 2, true);
    }
  }

  /** Whether the feet kick this floor's dust up (`step`, `land`): the sand's. */
  get feet(): boolean {
    return this.look.feet;
  }

  /** A step at `x` (stage sub-pixels), walking `toward` (1: right): a few grains off the heel. */
  step(x: number, toward: 1 | -1): void {
    const screenX = Math.round(toPx(x) - toward * 3);
    for (let i = 0; i < SPECKS_PER_STEP; i++) {
      const vx = -toward * (0.15 + 0.25 * i + this.random.next() * 0.2);
      this.throw(screenX, vx, -(0.12 + this.random.next() * 0.12), 2, true);
    }
  }

  /** A body landing on its feet at `x` (stage sub-pixels): a spray to both sides. */
  land(x: number): void {
    const screenX = Math.round(toPx(x));
    for (let n = 0; n < SPECKS_PER_LANDING * this.look.more; n++) {
      const side = n % 2 === 0 ? 1 : -1;
      const vx = side * (0.4 + 0.2 * (n >> 1) + this.random.next() * 0.3);
      this.throw(screenX, vx, -(0.15 + this.random.next() * 0.2), n % 3 === 0 ? 3 : 2);
    }
  }

  private throw(screenX: number, vx: number, vy: number, size: number, faint = false): void {
    const alpha = faint ? this.look.alpha - SCRAPE_FAINTER : this.look.alpha;
    const speck = this.specks[this.next];
    this.next = (this.next + 1) % this.specks.length;
    if (!speck) return;
    speck.vx = vx;
    speck.vy = vy * this.look.rise;
    speck.life = this.look.life;
    speck.alpha = alpha;
    speck.shape
      .setPosition(screenX, this.groundY - 1)
      .setSize(size, size)
      .setAlpha(alpha)
      .setVisible(true);
  }

  /** Advances the specks by one display frame. */
  update(): void {
    const { life, gravity } = this.look;
    for (const speck of this.specks) {
      if (speck.life <= 0) continue;
      speck.life -= 1;
      // The air slows them down; on sand, they fall back and lie where they land.
      speck.vx *= 0.9;
      speck.vy += gravity;
      let y = speck.shape.y + speck.vy;
      if (gravity > 0 && y > this.groundY - 1) {
        y = this.groundY - 1;
        speck.vx = 0;
        speck.vy = 0;
      }
      speck.shape
        .setPosition(speck.shape.x + speck.vx, y)
        .setAlpha((speck.alpha * speck.life) / life);
      if (speck.life === 0) speck.shape.setVisible(false);
    }
  }
}
