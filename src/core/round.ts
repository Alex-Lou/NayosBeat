import type { MatchConfig } from './config';
import { INTRO_FRAMES, ROUND_END_FRAMES, ROUNDS_TO_WIN } from './rules';
import {
  createRound,
  type FighterState,
  type GameState,
  type RoundResult,
  type RoundState,
} from './state';

/**
 * Advances the round flow: intro → fight → round end → next round, or match end.
 * The match end phase lasts until the application starts something else.
 */
export function updateRound(state: GameState, config: MatchConfig): GameState {
  const round = state.round;

  switch (round.phase) {
    case 'intro':
      return round.phaseFrame + 1 >= INTRO_FRAMES
        ? withRound(state, { ...round, phase: 'fight', phaseFrame: 0 })
        : nextPhaseFrame(state);

    case 'fight': {
      if (config.training) return nextPhaseFrame(state);
      const timer = Math.max(0, round.timer - 1);
      const result = roundResult(state.fighters, timer, config);
      if (!result) return withRound(state, { ...round, timer, phaseFrame: round.phaseFrame + 1 });
      return withRound(state, {
        ...round,
        timer,
        wins: result.winner === null ? round.wins : addWin(round.wins, result.winner),
        phase: 'roundEnd',
        phaseFrame: 0,
        result,
      });
    }

    case 'roundEnd':
      if (round.phaseFrame + 1 < ROUND_END_FRAMES) return nextPhaseFrame(state);
      if (round.wins[0] >= ROUNDS_TO_WIN || round.wins[1] >= ROUNDS_TO_WIN) {
        return withRound(state, { ...round, phase: 'matchEnd', phaseFrame: 0 });
      }
      return createRound(config, state.frame, round.number + 1, round.wins);

    case 'matchEnd':
      return nextPhaseFrame(state);
  }
}

/** Index of the match winner, once the match is over. */
export function matchWinner(round: RoundState): 0 | 1 | null {
  if (round.wins[0] >= ROUNDS_TO_WIN) return 0;
  if (round.wins[1] >= ROUNDS_TO_WIN) return 1;
  return null;
}

/** KO ends the round at once; at time out, the higher remaining health ratio wins. */
function roundResult(
  [a, b]: readonly [FighterState, FighterState],
  timer: number,
  config: MatchConfig,
): RoundResult | null {
  if (a.health === 0 || b.health === 0) {
    const winner = a.health === b.health ? null : a.health > 0 ? 0 : 1;
    return { winner, reason: 'ko' };
  }
  if (timer > 0) return null;

  // Cross-multiplied to compare health ratios with integers only.
  const ratioA = a.health * config.fighters[1].maxHealth;
  const ratioB = b.health * config.fighters[0].maxHealth;
  const winner = ratioA === ratioB ? null : ratioA > ratioB ? 0 : 1;
  return { winner, reason: 'timeout' };
}

function addWin(wins: readonly [number, number], winner: 0 | 1): readonly [number, number] {
  return winner === 0 ? [wins[0] + 1, wins[1]] : [wins[0], wins[1] + 1];
}

function nextPhaseFrame(state: GameState): GameState {
  return withRound(state, { ...state.round, phaseFrame: state.round.phaseFrame + 1 });
}

function withRound(state: GameState, round: RoundState): GameState {
  return { ...state, round };
}
