/**
 * The screen shake (docs/flashs.md §1.3): trauma that dies out, a shake that grows as its square
 * (Eiserloh, GDC 2016), eased between targets that turn back every SHAKE_STEP frames. Whole
 * pixels, never a jitter from one frame to the next.
 */

/** Screen shake at trauma 1, in world pixels. */
export const MAX_SHAKE = 8;
/** Trauma lost each display frame: a KO (1) dies out in 48 frames, 0.8 s. */
export const TRAUMA_DECAY = 1 / 48;
/** Display frames between two targets: the camera turns back 7.5 times a second at most. */
export const SHAKE_STEP = 4;
/** What each event adds (the strongest wins): an Ultime's KO shakes 8 px, a plain one about 6. */
export const TRAUMA = {
  heavy: 0.65,
  throw: 0.45,
  fall: 0.45,
  super: 0.5,
  ko: { plain: 0.85, combo: 0.92, finisher: 1 },
} as const;

/** A smoothed shake, seeded: the same for the same events. */
export class Shake {
  private trauma = 0;
  private age = 0;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  /** Offset of the camera's scroll this frame, world pixels. */
  x = 0;
  y = 0;

  constructor(
    private readonly enabled: boolean,
    private seed = 1,
  ) {}

  /**
   * Adds trauma, the strongest wins. `away`: the blow's direction; the picture first jolts that
   * way (the camera's scroll the other).
   */
  kick(trauma: number, away: 1 | -1 = 1): void {
    if (!this.enabled || trauma <= this.trauma) return;
    this.trauma = Math.min(1, trauma);
    this.fromX = this.x / MAX_SHAKE;
    this.fromY = this.y / MAX_SHAKE;
    this.toX = -away;
    this.toY = -0.4;
    this.age = 0;
  }

  /** One display frame. */
  update(): void {
    if (this.trauma === 0) {
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
      this.toX = -Math.sign(this.fromX || 1) * (0.5 + this.random() / 2);
      this.toY = -Math.sign(this.fromY || 1) * (0.5 + this.random() / 2);
    }
    const t = (this.age % SHAKE_STEP) / SHAKE_STEP;
    const eased = t * t * (3 - 2 * t);
    const amplitude = MAX_SHAKE * this.trauma ** 2;
    this.x = Math.round(amplitude * (this.fromX + (this.toX - this.fromX) * eased));
    this.y = Math.round((amplitude / 2) * (this.fromY + (this.toY - this.fromY) * eased));
  }

  /** mulberry32. */
  private random(): number {
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
