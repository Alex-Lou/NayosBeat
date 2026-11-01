import type { MatchConfig } from '../core/config';
import { finisherState, type FinisherState } from '../core/finisher';
import type { GameState } from '../core/state';
import type { FighterId } from '../data/roster';

/**
 * The Finisher's signal (docs/finisher.md §1.2): seen coming from both sides, nothing blinking.
 * One read of the core's predicate per frame, from the state shown, feeds everything that shows
 * it: the FINISH plate of the Boost gauge, player 1's BOOST button, the halo under the armed
 * fighter's feet, and the siren on its rising front. So the signal never lies: what it shows is
 * what back + BOOST would let go.
 */

/** Ticks the plate and the halo take to go from one state of the signal to the next. */
export const SIGNAL_FADE_TICKS = 6;

/** Both players' signals, as every reader takes them. */
export type FinisherSignals = readonly [FinisherState, FinisherState];

/** No signal: before the first read, and for the readers left without one. */
export const NO_SIGNAL: FinisherSignals = ['off', 'off'];

/**
 * The root of each fighter's siren, in Hz (§1.2): Nayo's do, Riff's mi; it slides up to its
 * fifth (sol, si). The sound is written on Nayo's (src/audio/sfx.ts): `sirenPitchOf` moves it.
 */
const SIREN_ROOTS: Readonly<Record<FighterId, number>> = { nayo: 262, riff: 330 };

/** What `play` multiplies the siren's tones by for `fighter`: 1 for Nayo's own. */
export function sirenPitchOf(fighter: FighterId): number {
  return SIREN_ROOTS[fighter] / SIREN_ROOTS.nayo;
}

/**
 * `player`'s signal on the state shown: the core's lights (finisherState) while the fight runs,
 * nothing otherwise. Between rounds no one can let the super go, while the lights may all be on
 * (the winner of round 1 at match point, full, over a loser at 0 HP). Nothing for the dummy in
 * training either: none of them lets the super go (the CPU dummy plays normal, which never does),
 * and « toujours prêt » lights it as much as player 1.
 */
export function finisherSignalOf(
  state: GameState,
  player: 0 | 1,
  config: MatchConfig,
): FinisherState {
  if (config.training === true && player === 1) return 'off';
  return state.round.phase === 'fight' ? finisherState(state, player, config) : 'off';
}

/**
 * Both players' signals, read once a frame (`update`), and the siren: it starts on the rising
 * front of `ready` only, at most once a round for each player (training plays one round), and
 * both players hear it. Nothing depends on it.
 */
export class FinisherSignal {
  private readonly signals: [FinisherState, FinisherState] = ['off', 'off'];
  /** The round each player's siren last sounded in: 0, never (rounds count from 1). */
  private readonly sounded: [number, number] = [0, 0];

  /** `siren`: plays `player`'s siren (FightScene: its fighter's pitch). */
  constructor(
    private readonly config: MatchConfig,
    private readonly siren: (player: 0 | 1) => void,
  ) {}

  /** The signals of the last read. */
  get states(): FinisherSignals {
    return this.signals;
  }

  /** Reads both signals on the state shown, the siren of a player who just got ready with them. */
  update(state: GameState): void {
    for (const player of [0, 1] as const) {
      const signal = finisherSignalOf(state, player, this.config);
      const rising = signal === 'ready' && this.signals[player] !== 'ready';
      this.signals[player] = signal;
      if (!rising || this.sounded[player] === state.round.number) continue;
      this.sounded[player] = state.round.number;
      this.siren(player);
    }
  }
}
