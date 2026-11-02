import type { InputBits } from '../core/input';
import type { GameState } from '../core/state';
import type { HeldStruggle } from '../input/held-struggle';

/**
 * Where a fight's ticks get their inputs (docs/multijoueur.md §9.5): this device's players and the
 * CPU (`LocalTickSource`), or, online, the lockstep between both devices.
 */
export interface TickSource {
  /** How many of `count` ticks can be played now: online, only those whose inputs have arrived. */
  playable(count: number): number;
  /**
   * Both players' inputs for the next tick, from what this device's players hold (`read`, once a
   * frame for all its ticks) and the state the tick starts from; null: no more tick now (online,
   * the shared pause or the match's end, on the same tick on both devices).
   */
  next(
    read: readonly [InputBits, InputBits],
    state: GameState,
  ): readonly [InputBits, InputBits] | null;
  /** Once a frame, its ticks played: online, what is to be sent goes. */
  flush(): void;
}

/**
 * This device's players, a button held in a grab struggling as mashed for those who chose so, and
 * player 2 played by the CPU when `cpu` gives its input (null: a human plays it).
 */
export class LocalTickSource implements TickSource {
  /** Reused every tick to avoid allocating. */
  private readonly inputs: [InputBits, InputBits] = [0, 0];

  constructor(
    private readonly struggle: HeldStruggle,
    private readonly cpu: () => InputBits | null,
  ) {}

  playable(count: number): number {
    return count;
  }

  next(read: readonly [InputBits, InputBits], state: GameState): readonly [InputBits, InputBits] {
    this.inputs[0] = this.struggle.apply(0, read[0], state);
    this.inputs[1] = this.cpu() ?? this.struggle.apply(1, read[1], state);
    return this.inputs;
  }

  flush(): void {
    // Nothing leaves this device.
  }
}
