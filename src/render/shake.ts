/**
 * The screen shake (docs/flashs.md §1.3): trauma that dies out, a shake that grows as its square
 * (Eiserloh, GDC 2016), eased between targets that turn back every SHAKE_STEP frames. Whole
 * pixels, never a jitter from one frame to the next.
 */

import type { KoFinish } from './fight-events';

/** Screen shake at trauma 1, in world pixels. */
export const MAX_SHAKE = 8;
/** Trauma lost each display frame: a KO (1) dies out in 48 frames, 0.8 s. */
export const TRAUMA_DECAY = 1 / 48;
/** Display frames between two targets: the camera turns back 7.5 times a second at most. */
export const SHAKE_STEP = 4;
/** The player's « Tremblement de l'écran » (src/app/comfort.ts): reduced, half as far. */
export type ShakeMode = 'normal' | 'reduced' | 'off';
export const SHAKE_STRENGTH: Readonly<Record<ShakeMode, number>> = {
  normal: 1,
  reduced: 0.5,
  off: 0,
};
/**
 * What each event adds (the strongest wins): an Ultime's KO shakes 8 px, a plain one about 6;
 * the Finisher's, which its scene plays (docs/finisher.md §1.13, §4.4), lightly on its contact
 * (0.6, about 3 px) and as an Ultime's on its landing.
 */
export const TRAUMA = {
  heavy: 0.65,
  throw: 0.45,
  fall: 0.45,
  super: 0.5,
  ko: { plain: 0.85, combo: 0.92, ultimate: 1, finale: 0.6 } satisfies Record<KoFinish, number>,
  finaleLanding: 1,
} as const;

/**
 * Which way a shake goes: both (the camera's own, mostly sideways), or along one axis only, as
 * the Finisher's (Nayo's blows along the floor, Riff's from the sky).
 */
export type ShakeAxis = 'both' | 'x' | 'y';

/** A smoothed shake, seeded: the same for the same events. */
export class Shake {
  private trauma = 0;
  private age = 0;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private axis: ShakeAxis = 'both';
  /** The offset is divided by this: the camera's close-up of the kick, the same force on screen. */
  private zoom = 1;
  /** Offset of the camera's scroll this frame, world pixels. */
  x = 0;
  y = 0;

  constructor(
    /** How far it shakes (SHAKE_STRENGTH): 0, it keeps still. Read every frame. */
    public strength = 1,
    private seed = 1,
  ) {}

  /**
   * Adds trauma, the strongest wins. `away`: the blow's direction; the picture first jolts that
   * way (the camera's scroll the other), down first along `y` alone. `zoom`: the camera's
   * close-up, which the offset is divided by (docs/finisher.md §4.4: trauma² would make the
   * trauma's own division four times weaker), the same force on screen at any zoom.
   */
  kick(trauma: number, away: 1 | -1 = 1, axis: ShakeAxis = 'both', zoom = 1): void {
    if (this.strength === 0 || trauma <= this.trauma) return;
    this.trauma = Math.min(1, trauma);
    this.fromX = this.x / MAX_SHAKE;
    this.fromY = this.y / MAX_SHAKE;
    this.axis = axis;
    this.zoom = Math.max(1, zoom);
    this.toX = axis === 'y' ? 0 : -away;
    this.toY = axis === 'x' ? 0 : axis === 'y' ? -1 : -0.4;
    this.age = 0;
  }

  /** One display frame. */
  update(): void {
    if (this.trauma === 0 || this.strength === 0) {
      this.x = 0;
      this.y = 0;
      return;
    }
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY);
    this.age += 1;
    if (this.age % SHAKE_STEP === 0) {
      this.fromX = this.toX;
      this.fromY = this.toY;
      // Back the other way each step, by half to all of a swing: a shake, never a jitter.
      const toX = -Math.sign(this.fromX || 1) * (0.5 + this.random() / 2);
      const toY = -Math.sign(this.fromY || 1) * (0.5 + this.random() / 2);
      this.toX = this.axis === 'y' ? 0 : toX;
      this.toY = this.axis === 'x' ? 0 : toY;
    }
    const t = (this.age % SHAKE_STEP) / SHAKE_STEP;
    const eased = t * t * (3 - 2 * t);
    const amplitude = (MAX_SHAKE * this.strength * this.trauma ** 2) / this.zoom;
    // Both ways, it is mostly sideways; along y alone, it swings as far as sideways would.
    const vertical = this.axis === 'y' ? amplitude : amplitude / 2;
    this.x = Math.round(amplitude * (this.fromX + (this.toX - this.fromX) * eased));
    this.y = Math.round(vertical * (this.fromY + (this.toY - this.fromY) * eased));
  }

  /** mulberry32. */
  private random(): number {
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
