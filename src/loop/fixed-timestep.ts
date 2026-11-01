/** Absorbs float accumulation error so that a full tick is never missed by a hair. */
const EPSILON_MS = 1e-6;

/**
 * Converts variable render-frame durations into a whole number of fixed simulation ticks.
 * The leftover time is carried over to the next frame.
 */
export class FixedTimestep {
  private accumulatorMs = 0;
  /** Where the accumulator restarts when a backlog is dropped: 0 until `rephase`. */
  private phaseMs = 0;

  /**
   * @param tickMs Duration of one simulation tick.
   * @param maxTicksPerFrame Upper bound of ticks run in one frame. Beyond it the backlog is
   *   dropped (e.g. after a background tab resumes) instead of freezing the page to catch up.
   */
  constructor(
    private readonly tickMs: number,
    private readonly maxTicksPerFrame: number,
  ) {
    if (!(tickMs > 0)) throw new RangeError(`tickMs must be > 0, got ${tickMs}`);
    if (!Number.isInteger(maxTicksPerFrame) || maxTicksPerFrame < 1) {
      throw new RangeError(`maxTicksPerFrame must be an integer >= 1, got ${maxTicksPerFrame}`);
    }
  }

  /**
   * Puts the leftover time at `phaseMs`, now and after every dropped backlog. Frames of a whole
   * number of periods then keep it on a few fixed points, which a well-chosen phase holds away
   * from the tick boundaries: the timestamps' rounding and jitter can no longer move a tick to the
   * next frame (src/loop/cadence.ts, `phaseOffsetMs`).
   */
  rephase(phaseMs: number): void {
    if (!(phaseMs >= 0 && phaseMs < this.tickMs)) {
      throw new RangeError(`phaseMs must be in [0, ${this.tickMs}), got ${phaseMs}`);
    }
    this.phaseMs = phaseMs;
    this.accumulatorMs = phaseMs;
  }

  /** Returns how many ticks to simulate for a frame that lasted `deltaMs`. */
  advance(deltaMs: number): number {
    if (!(deltaMs > 0)) return 0;

    this.accumulatorMs += deltaMs;
    const ticks = Math.floor((this.accumulatorMs + EPSILON_MS) / this.tickMs);

    if (ticks > this.maxTicksPerFrame) {
      this.accumulatorMs = this.phaseMs;
      return this.maxTicksPerFrame;
    }

    this.accumulatorMs -= ticks * this.tickMs;
    return ticks;
  }
}
