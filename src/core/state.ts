/**
 * The whole simulation state. Plain, serializable data owned by the core:
 * the presentation layer only reads it.
 */
export interface GameState {
  /** Number of ticks simulated since the match started. */
  readonly frame: number;
}

export function createInitialState(): GameState {
  return { frame: 0 };
}
