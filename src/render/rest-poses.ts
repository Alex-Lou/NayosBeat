import type { ClipId } from '../art/types';
import { ROUND_END_FRAMES } from '../core/rules';
import type { FighterState, RoundState } from '../core/state';
import type { AnimOptions } from './anim-options';

/**
 * The round poses and the idle (docs/art/animation-plan.md §6): which one a fighter shows, and
 * on which clock. Their own module, so the life at rest is chosen here without touching the rest
 * of the animation. Today's choice: the entrance, the winner's victory, the loser out of breath on
 * time.
 */

/**
 * The round pose a fighter shows while the round is not being fought: the entrance during the
 * intro; once the round is over and the fighter stands still, the winner's victory and, on time,
 * the loser out of breath. Null otherwise: a fighter still recovering, or knocked out, keeps its
 * animation.
 */
export function roundPoseOf(
  fighter: FighterState,
  player: 0 | 1,
  round: RoundState,
): ClipId | null {
  if (round.phase === 'intro') return 'intro';
  const over = round.phase === 'roundEnd' || round.phase === 'matchEnd';
  if (!over || !round.result || fighter.action !== 'idle') return null;
  if (round.result.winner === player) return 'victory';
  return round.result.reason === 'timeout' ? 'timeOver' : null;
}

/**
 * Ticks into a pose at rest, null for any other clip. The entrance follows the round clock. The
 * victory and the loser's pose on time play from their first frame as the fighter stands still,
 * however late in the round end (V1): the ticks since it stood still, or since the round ended if
 * it already did then; on into the match end, so the pose never starts again. The idle plays from
 * its first frame as the fight starts: the intro's ticks are not its own.
 *
 * With the animation of before (`legacy`): the victory from the round end, whatever frame that
 * reaches by the time the winner stands still, and the idle from the intro's start.
 */
export function restTickOf(
  clip: ClipId,
  fighter: FighterState,
  round: RoundState,
  options: AnimOptions,
): number | null {
  switch (clip) {
    case 'intro':
      return round.phaseFrame;
    case 'victory':
    case 'timeOver': {
      const sinceRoundEnd = round.phaseFrame + (round.phase === 'matchEnd' ? ROUND_END_FRAMES : 0);
      return options.legacy ? sinceRoundEnd : Math.min(fighter.actionFrame, sinceRoundEnd);
    }
    case 'idle':
      if (options.legacy || round.phase !== 'fight') return fighter.actionFrame;
      return Math.min(fighter.actionFrame, round.phaseFrame);
    default:
      return null;
  }
}
