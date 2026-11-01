/**
 * Plays exactly `ticks` simulation ticks for every `frames` frames of the visual clock (steps of
 * 1/60 s, see FightScene), spread evenly, like a Bresenham line: 1 for 2 holds each tick 2 frames,
 * 2 for 3 alternates 1 and 2. Whole ticks counted in whole frames, never a fractional scale on the
 * frame time: the jitter of the display or a 144 Hz screen cannot make a tick hold 1, 2 or 3
 * frames at random (docs/art/animation-plan.md §2, V0), and nothing is drawn between two ticks
 * (D23). Pure: the same frames always give the same ticks.
 */
export class TickPacer {
  private readonly ticks: number;
  private readonly frames: number;
  /** Ticks owed, in `frames`ths of a tick. */
  private owed = 0;

  constructor(ticks: number, frames: number) {
    if (!Number.isInteger(ticks) || ticks < 0) {
      throw new RangeError(`ticks must be an integer >= 0, got ${ticks}`);
    }
    if (!Number.isInteger(frames) || frames < 1) {
      throw new RangeError(`frames must be an integer >= 1, got ${frames}`);
    }
    this.ticks = ticks;
    this.frames = frames;
  }

  /** The ticks to play for `frames` frames of the visual clock gone by. */
  advance(frames: number): number {
    if (frames <= 0) return 0;
    this.owed += frames * this.ticks;
    const ticks = Math.floor(this.owed / this.frames);
    this.owed -= ticks * this.frames;
    return ticks;
  }
}
